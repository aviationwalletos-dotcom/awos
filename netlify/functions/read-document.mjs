// AWOS — 증명서/자격증 사진을 AI(Claude)가 읽어 폼 값을 제안하는 서버 함수.
//
// 왜 서버 함수인가: Anthropic API 키를 브라우저에 두면 안 된다. 브라우저 → 이 함수 → Anthropic 순서로 부른다.
// 누가 부를 수 있나: 로그인한 AWOS 사용자만(Supabase JWT 를 /auth/v1/user 로 검증).
// 비용: 사진 1장당 대략 1~3센트(Sonnet). 클라이언트가 1600px 로 줄여 보낸다.
//
// Netlify 환경변수(필수): ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
// 요청: POST { kind: 'flight_experience' | 'licence', image: base64, mediaType: 'image/jpeg'|'image/png'|'image/webp'|'application/pdf' }
// 응답: { fields: {...}, notes: string[], confidence: 'high'|'medium'|'low' }

const MODEL = 'claude-sonnet-4-6'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const SCHEMAS = {
  flight_experience: {
    description: '비행경력증명서(별지 36호) 또는 미국 비행학교 증명서 / 로그북 요약',
    fields: {
      date: 'YYYY-MM-DD. 증명서 발급일 또는 기록 기준일. 모르면 null',
      issuer: '발급 기관/학교 이름(문자열). 모르면 null',
      blockTime: '총 비행시간(시간, 소수). 모르면 null',
      singleEngineLand: '육상단발 시간(시간). 모르면 null',
      multiEngineLand: '육상다발 시간(시간). 모르면 null',
      rotorcraftHelicopter: '회전익 시간(시간). 모르면 null',
      dualReceived: '교육 받은 시간(Dual received). 모르면 null',
      picTime: 'PIC 시간. 모르면 null',
      sicTime: 'SIC 시간. 모르면 null',
      flightInstructorTime: '교관 시간(as instructor). 모르면 null',
      groundTrainerTime: '시뮬레이터/지상훈련장비 시간. 모르면 null',
      conditionDay: '주간 시간. 모르면 null',
      conditionNight: '야간 시간. 모르면 null',
      crossCountry: '크로스컨트리 시간. 모르면 null',
      actualInstrument: '실계기 시간. 모르면 null',
      simulatedInstrument: '모의계기 시간. 모르면 null',
      instrumentApproaches: '계기접근 횟수(정수). 모르면 null',
      dayLandings: '주간 착륙 횟수(정수). 문서에 착륙 횟수가 없으면 반드시 null (0 으로 추정 금지)',
      nightLandings: '야간 착륙 횟수(정수). 없으면 null',
    },
  },
  licence: {
    description: '조종사 자격증명서 / 항공신체검사증명서 / 조종교육증명 등 자격 증서',
    fields: {
      name: '자격 명칭(예: 자가용 조종사, Private Pilot, 제1종 항공신체검사증명). 모르면 null',
      licenceNumber: '자격번호(예: 12-015238). 모르면 null',
      holderName: '성명. 모르면 null',
      issuer: '발급기관. 모르면 null',
      issuedDate: '발급일 YYYY-MM-DD. 모르면 null',
      expiryDate: '만료일/유효기간 YYYY-MM-DD. 없으면 null',
      ratings: '한정사항 문자열(예: 비행기 육상단발). 없으면 null',
      limitations: '제한사항 문자열. 없으면 null',
      medicalClass: '항공신체검사 종류(1, 2, 3) 정수. 해당 없으면 null',
      // ── 조종사 자격증명서 한 장에서 같이 등록할 수 있는 항목들(한정사항·특기사항에서 읽는다) ──
      licenceCode: "조종사 자격증명 종류 코드: 'PPL'(자가용) | 'CPL'(사업용) | 'ATPL'(운송용) | 'MPL'(부조종사). 조종사 자격증명서가 아니면 null",
      classRatings:
        "한정사항(XII. RATINGS)에 적힌 종류/등급을 빠짐없이 배열로. 각 항목은 {\"category\":\"AIRPLANE\"|\"HELICOPTER\",\"class\":\"SEL\"|\"MEL\"|\"SES\"|\"MES\"|null}. 육상단발=SEL, 육상다발=MEL, 수상단발=SES, 수상다발=MES, 헬리콥터는 class null. 계기비행증명·조종교육증명은 여기 넣지 말 것. 없으면 []",
      instrumentRatings: "계기비행증명(INSTRUMENT RATING)이 있으면 종류 배열 [\"AIRPLANE\"|\"HELICOPTER\"]. 없으면 []",
      flightInstructorRatings:
        "조종교육증명(FLIGHT INSTRUCTOR RATING)이 있으면 배열. 각 항목 {\"grade\":\"BASIC\"|\"SENIOR\",\"category\":\"AIRPLANE\"|\"HELICOPTER\"}. 초급/JUNIOR=BASIC, 선임/SENIOR=SENIOR. 등급 표기가 없으면 BASIC. 없으면 []",
      eptaLevel: '특기사항(REMARKS)의 ENGLISH PROFICIENCY LEVEL 정수(4, 5, 6). 없으면 null',
      eptaValidUntil: "ENGLISH PROFICIENCY 의 'VALID UNTIL' 날짜 YYYY-MM-DD. 없으면 null (LEVEL 6 는 만료가 없을 수 있음)",
      holderBirthDate: '소지자 생년월일(IVa. DATE OF BIRTH) YYYY-MM-DD. 없으면 null',
    },
  },
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

async function verifyUser(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return null
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  const u = await r.json()
  return u && u.id ? u : null
}

const DAILY_LIMIT = 10

// 하루 한도(계정당). schema18 의 consume_ai_quota() 를 사용자 JWT 로 호출한다(RLS 안에서 본인 것만).
// 함수가 아직 없으면(SQL 미실행) 막지 않고 통과시킨다 — 기능이 멈추는 것보다 낫다.
async function consumeQuota(token) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return { allowed: true, used: null, limit: DAILY_LIMIT, enforced: false }
  try {
    const r = await fetch(`${url}/rest/v1/rpc/consume_ai_quota`, {
      method: 'POST',
      headers: { apikey: anon, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_limit: DAILY_LIMIT }),
    })
    if (r.status === 404) return { allowed: true, used: null, limit: DAILY_LIMIT, enforced: false }
    if (!r.ok) return { allowed: true, used: null, limit: DAILY_LIMIT, enforced: false }
    const data = await r.json()
    return { allowed: data?.allowed !== false, used: data?.used ?? null, limit: data?.limit ?? DAILY_LIMIT, enforced: true }
  } catch {
    return { allowed: true, used: null, limit: DAILY_LIMIT, enforced: false }
  }
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'AI 읽기 기능이 아직 설정되지 않았어요(ANTHROPIC_API_KEY 없음).' })

  const user = await verifyUser(req)
  if (!user) return json(401, { error: '로그인이 필요해요.' })

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: '요청 형식이 올바르지 않아요.' })
  }
  const kind = body?.kind
  const schema = SCHEMAS[kind]
  if (!schema) return json(400, { error: 'kind 는 flight_experience 또는 licence 여야 해요.' })
  const image = String(body?.image || '')
  const mediaType = String(body?.mediaType || 'image/jpeg')
  if (!image) return json(400, { error: '이미지가 없어요.' })
  if (image.length * 0.75 > MAX_IMAGE_BYTES) return json(413, { error: '이미지가 너무 커요(5MB 이하).' })
  const isPdf = mediaType === 'application/pdf'

  const token = (req.headers.get('authorization') || '').slice(7)
  const quota = await consumeQuota(token)
  if (!quota.allowed) {
    return json(429, { error: `AI 읽기는 하루 ${quota.limit}회까지예요. 오늘은 다 썼어요. 내일 다시 하거나 직접 입력해 주세요.`, quota })
  }

  const fieldLines = Object.entries(schema.fields).map(([k, v]) => `- ${k}: ${v}`).join('\n')
  const prompt = schema.rows
    ? `당신은 항공 문서를 읽어 구조화하는 보조자입니다. 첨부된 문서는 "${schema.description}"입니다.
페이지의 비행 기록 행을 위에서 아래 순서대로 모두 추출하세요. 각 행은 아래 필드를 가진 JSON 객체입니다.
문서에 없는 값은 반드시 null 로 두고 절대 추정하지 마세요. 숫자는 숫자형으로, 날짜는 YYYY-MM-DD 로.
합계(Total)·이월(Forwarded)·서명·빈 행은 제외하세요.
필드:
${fieldLines}

notes 작성 규칙: 조종사가 읽는 문장입니다. 필드 이름(singleEngineLand, expiryDate 같은 영어 코드), "null", JSON 용어를 쓰지 마세요. 화면에 보이는 한국어 칸 이름(예: 육상단발, 만료일, 착륙 횟수)으로 말하고, 한 문장씩 짧게 쓰세요. 예: "착륙 횟수가 문서에 없어 비워 뒀어요." / "항공영어 유효기간은 있지만 자격증 자체의 만료일은 없어 비워 뒀어요."

응답은 JSON 객체 하나만, 다른 텍스트 없이:
{"rows": [{...}, ...], "notes": ["읽기 어려웠던 행/칸이나 주의할 점을 한국어로 0~5개"], "confidence": "high|medium|low"}`
    : `당신은 항공 문서를 읽어 구조화하는 보조자입니다. 첨부된 문서는 "${schema.description}"입니다.
아래 필드를 JSON 으로 추출하세요. 문서에 없는 값은 반드시 null 로 두고 절대 추정하지 마세요. 숫자는 숫자형으로, 날짜는 YYYY-MM-DD 로.
필드:
${fieldLines}

notes 작성 규칙: 조종사가 읽는 문장입니다. 필드 이름(singleEngineLand, expiryDate 같은 영어 코드), "null", JSON 용어를 쓰지 마세요. 화면에 보이는 한국어 칸 이름(예: 육상단발, 만료일, 착륙 횟수)으로 말하고, 한 문장씩 짧게 쓰세요. 예: "착륙 횟수가 문서에 없어 비워 뒀어요." / "항공영어 유효기간은 있지만 자격증 자체의 만료일은 없어 비워 뒀어요."

응답은 JSON 객체 하나만, 다른 텍스트 없이:
{"fields": {...}, "notes": ["읽기 어려웠던 부분이나 주의할 점을 한국어로 0~3개"], "confidence": "high|medium|low"}`

  const content = [
    isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: image } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
    { type: 'text', text: prompt },
  ]

  let ai
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: schema.rows ? 6000 : 1600, messages: [{ role: 'user', content }] }),
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      return json(502, { error: `AI 호출 실패(${r.status}). 잠시 뒤 다시 시도해 주세요.`, detail: t.slice(0, 300) })
    }
    ai = await r.json()
  } catch (e) {
    return json(502, { error: 'AI 서버에 연결하지 못했어요.' })
  }

  const text = (ai.content || []).map((c) => (c.type === 'text' ? c.text : '')).join('\n')
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (schema.rows) {
      const allowed = Object.keys(schema.fields)
      const rows = (Array.isArray(parsed.rows) ? parsed.rows : []).slice(0, 60).map((row) => {
        const safe = {}
        for (const k of allowed) if (row && k in row) safe[k] = row[k]
        return safe
      })
      return json(200, {
        rows,
        notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 5).map(String) : [],
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
        quota,
      })
    }
    const fields = parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : {}
    // 스키마에 없는 키는 버린다
    const allowed = Object.keys(schema.fields)
    const safe = {}
    for (const k of allowed) if (k in fields) safe[k] = fields[k]
    return json(200, {
      fields: safe,
      notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 3).map(String) : [],
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      quota,
    })
  } catch {
    return json(502, { error: 'AI 응답을 해석하지 못했어요. 사진을 더 선명하게 찍어 다시 시도해 주세요.' })
  }
}

export const config = { path: '/api/read-document' }
