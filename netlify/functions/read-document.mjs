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
    description: '비행경력증명서(항공안전법 시행규칙 별지 제36호서식) 또는 미국 비행학교 증명서 / 로그북 요약',
    // 별지 36호 열 구조(2026-09-11 테스터 피드백으로 명시): 주간·야간이 각각 4열이라 합산 규칙이 없으면 엉뚱한 열을 집는다.
    guide: `한국 비행경력증명서(별지 36호)라면 아래 열 구조로 읽으세요. 값은 반드시 맨 아래 "계" 행(총계)에서 가져오세요.
열: 일자 | 항공기 형식 | 착륙횟수 | [비행임무별비행시간] 기장 | 부조종사(기장 감독하의 조종행위 / 기장 외의 조종사) | 교관조종사 | 학생조종사 | 항공기관사 | 소계 | [비행종류별비행시간] 주간비행(시계비행 기장/기장외, 야외비행 기장/기장외) | 야간비행(시계비행 기장/기장외, 야외비행 기장/기장외) | [계기비행] 실제비행 | 모의비행 | 기타
매핑:
- blockTime = 소계(계 행). singleEngineLand/multiEngineLand/rotorcraftHelicopter = 항공기 형식별 소계 합(C172·PA28 등 단발, DA42·PA44 등 다발, R22·R44 등 회전익). 시뮬레이터 행(FTD·AATD·FFS·Frasca 등)은 여기서 제외.
- picTime = 기장(교관 비행 포함). picSupervisedTime = 부조종사 중 "기장 감독하의 조종행위". sicTime = 부조종사 중 "기장 외의 조종사". flightInstructorTime = 교관조종사.
- 교관조종사와 학생조종사는 나란히 붙은 열이라 헷갈리기 쉽습니다. 반드시 검산하세요:
  (1) 교관조종사 ≤ 기장 (교관 비행은 기장 시간 안에 들어 있음) (2) 학생조종사 = 소계 − 기장 − 부조종사.
  예: 기장 942.8 · 소계 963.4 이면 학생조종사는 20.6 이어야 하고, 720.0 같은 큰 값은 교관조종사입니다. 검산이 안 맞으면 두 값을 바꿔 다시 확인하세요.
- studentTime = 학생조종사(검산용으로 함께 돌려주세요).
- dualReceived(교육받은 시간 전체)는 별지 36호에 없습니다. 한국 서식이면 반드시 null. 미국식 증명서(예: "Dual Received: 58.2")에 있을 때만 채우세요.
- conditionDay = 주간비행 4열의 합. conditionNight = 야간비행 4열의 합. crossCountry = 야외비행 4열(주간 기장/기장외 + 야간 기장/기장외)의 합. nightCrossCountry = 야간비행 중 야외비행 2열의 합.
- actualInstrument = 실제비행(계). simulatedInstrument = 모의비행(계 — 시뮬레이터 행의 모의비행도 포함).
- groundTrainerTime = "기타" 열의 계(시뮬레이터 행 FTD·AATD·FFS·Frasca 의 총 시간). 시뮬레이터 행은 실제 비행시간(소계)에 넣지 마세요.
- dayLandings = 착륙횟수 총계(주·야 구분이 없으면 전부 여기), nightLandings = null. 착륙횟수 열이 비어 있으면 둘 다 null.
확인: 주간 + 야간 ≈ 소계 여야 합니다. 안 맞으면 notes 에 적으세요.`,
    fields: {
      date: 'YYYY-MM-DD. 증명서 발급일 또는 기록 기준일. 모르면 null',
      issuer: '발급 기관/학교 이름(문자열). 모르면 null',
      blockTime: '총 비행시간(시간, 소수). 시뮬레이터 제외. 모르면 null',
      singleEngineLand: '육상단발 시간(시간). 모르면 null',
      multiEngineLand: '육상다발 시간(시간). 모르면 null',
      rotorcraftHelicopter: '회전익 시간(시간). 모르면 null',
      dualReceived: '교육받은 시간 전체(Dual received). 미국식 증명서에 그 값이 있을 때만. 한국 별지 36호면 반드시 null',
      studentTime: '학생조종사 시간(별지 36호 학생조종사 열, 검산용). 없으면 null',
      picTime: '기장(PIC) 시간. 모르면 null',
      picSupervisedTime: '기장 감독하의 조종행위 시간(부조종사 열). 없으면 null',
      sicTime: '기장 외의 조종사(SIC) 시간. 모르면 null',
      flightInstructorTime: '교관조종사 시간(as instructor). 모르면 null',
      groundTrainerTime: '시뮬레이터/지상훈련장비 시간. 모르면 null',
      conditionDay: '주간 시간(주간비행 4열 합). 모르면 null',
      conditionNight: '야간 시간(야간비행 4열 합). 모르면 null',
      crossCountry: '야외비행(크로스컨트리) 시간(주·야 야외 4열 합). 모르면 null',
      nightCrossCountry: '야간 야외비행 시간(야간비행 중 야외 2열 합). 모르면 null',
      actualInstrument: '실제 계기비행 시간. 모르면 null',
      simulatedInstrument: '모의 계기비행 시간. 모르면 null',
      instrumentApproaches: '계기접근 횟수(정수). 모르면 null',
      dayLandings: '주간 착륙 횟수(정수). 주·야 구분 없는 착륙횟수 총계는 여기. 문서에 착륙 횟수가 없으면 반드시 null (0 으로 추정 금지)',
      nightLandings: '야간 착륙 횟수(정수). 없으면 null',
      certTotals: `한국 별지 36호일 때만: 맨 아래 "계" 행의 칸을 왼쪽부터 순서대로 그대로 옮겨 적은 객체(합산하지 말고 칸 값을 그대로). 순서:
{ landings, pic, picSupervised, sic, instructor, student, engineer, subtotal, dayVfrPic, dayVfrOther, dayXcPic, dayXcOther, nightVfrPic, nightVfrOther, nightXcPic, nightXcOther, instActual, instSim, other }
= 착륙횟수 | 기장 | 부조종사(기장감독하) | 부조종사(기장외) | 교관조종사 | 학생조종사 | 항공기관사 | 소계 | 주간 시계 기장 | 주간 시계 기장외 | 주간 야외 기장 | 주간 야외 기장외 | 야간 시계 기장 | 야간 시계 기장외 | 야간 야외 기장 | 야간 야외 기장외 | 실제비행 | 모의비행 | 기타.
검산: dayVfrPic+dayVfrOther+dayXcPic+dayXcOther+nightVfrPic+nightVfrOther+nightXcPic+nightXcOther = subtotal, pic+picSupervised+sic+student = subtotal. 한국 서식이 아니면 null`,
    },
  },
  licence: {
    description: '조종사 자격증명서 / 항공신체검사증명서 / 무선통신사 자격증 / 조종연습허가서 / 항공영어구술능력증명서 등 자격 증서',
    fields: {
      name: '자격 명칭(예: 자가용 조종사, Private Pilot, 제1종 항공신체검사증명). 모르면 null',
      licenceNumber: '자격번호(예: 12-015238). 모르면 null',
      holderName: '성명. 모르면 null',
      issuer: '발급기관. 모르면 null',
      issuedDate: '발급일 YYYY-MM-DD. 모르면 null',
      expiryDate: '만료일/유효기간 YYYY-MM-DD. 없으면 null',
      ratings: '한정사항 문자열(예: 비행기 육상단발). 없으면 null',
      medicalClass: "항공신체검사증명서면 종류: '제1종' | '제2종' | '제3종'. 신체검사증명서가 아니면 null",
      documentKind: "문서 종류: 'licence'(조종사 자격증명서) | 'medical'(항공신체검사증명서) | 'radio'(무선통신사 자격증) | 'permit'(조종연습허가서) | 'epta'(항공영어구술능력증명서) | 'other'",
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
  // 여러 장(자격증 앞·뒷면, 증명서 여러 쪽)을 한 번에 읽는다. 예전 형식(image 하나)도 받는다.
  const rawList = Array.isArray(body?.images) && body.images.length > 0
    ? body.images
    : body?.image
      ? [{ data: body.image, mediaType: body.mediaType || 'image/jpeg' }]
      : []
  const files = rawList.slice(0, 4).map((f) => ({ data: String(f?.data || ''), mediaType: String(f?.mediaType || 'image/jpeg') })).filter((f) => f.data)
  if (files.length === 0) return json(400, { error: '이미지가 없어요.' })
  const totalBytes = files.reduce((a, f) => a + f.data.length * 0.75, 0)
  if (totalBytes > MAX_IMAGE_BYTES * 2) return json(413, { error: '파일이 너무 커요(합쳐서 10MB 이하).' })

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

notes 작성 규칙: 조종사가 읽는 문장입니다. 증명서에 없어서 비운 값(예: Dual 전체)은 "증명서에는 없는 값이라 비워 뒀어요. 직접 채워 주세요."처럼 알려 주세요. 필드 이름(singleEngineLand, expiryDate 같은 영어 코드), "null", JSON 용어를 쓰지 마세요. 화면에 보이는 한국어 칸 이름(예: 육상단발, 만료일, 착륙 횟수)으로 말하고, 한 문장씩 짧게 쓰세요. 예: "착륙 횟수가 문서에 없어 비워 뒀어요." / "항공영어 유효기간은 있지만 자격증 자체의 만료일은 없어 비워 뒀어요."

응답은 JSON 객체 하나만, 다른 텍스트 없이:
{"rows": [{...}, ...], "notes": ["읽기 어려웠던 행/칸이나 주의할 점을 한국어로 0~5개"], "confidence": "high|medium|low"}`
    : `당신은 항공 문서를 읽어 구조화하는 보조자입니다. 첨부된 문서는 "${schema.description}"입니다.
아래 필드를 JSON 으로 추출하세요. 문서에 없는 값은 반드시 null 로 두고 절대 추정하지 마세요. 숫자는 숫자형으로, 날짜는 YYYY-MM-DD 로.
${schema.guide ? `\n${schema.guide}\n` : ''}
필드:
${fieldLines}

notes 작성 규칙: 조종사가 읽는 문장입니다. 증명서에 없어서 비운 값(예: Dual 전체)은 "증명서에는 없는 값이라 비워 뒀어요. 직접 채워 주세요."처럼 알려 주세요. 필드 이름(singleEngineLand, expiryDate 같은 영어 코드), "null", JSON 용어를 쓰지 마세요. 화면에 보이는 한국어 칸 이름(예: 육상단발, 만료일, 착륙 횟수)으로 말하고, 한 문장씩 짧게 쓰세요. 예: "착륙 횟수가 문서에 없어 비워 뒀어요." / "항공영어 유효기간은 있지만 자격증 자체의 만료일은 없어 비워 뒀어요."

응답은 JSON 객체 하나만, 다른 텍스트 없이:
{"fields": {...}, "notes": ["읽기 어려웠던 부분이나 주의할 점을 한국어로 0~3개"], "confidence": "high|medium|low"}`

  const content = [
    ...files.map((f) =>
      f.mediaType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data } }
        : { type: 'image', source: { type: 'base64', media_type: f.mediaType, data: f.data } },
    ),
    { type: 'text', text: files.length > 1 ? `첨부 ${files.length}장은 같은 문서의 앞·뒷면 또는 여러 쪽입니다. 모두 함께 읽어 한 번에 추출하세요.\n${prompt}` : prompt },
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
