// 국가법령정보센터(law.go.kr) 오픈 API 로 법령의 최신 시행일을 조회해 "적용 버전"과 대조한다.
// 환경변수: LAW_GO_KR_OC (법령정보센터 오픈 API 신청 시 받은 사용자 ID = 이메일 아이디 부분). 없으면 안내만 돌려준다.
// 요청: POST { queries: string[] }  응답: { results: [{ query, found, lawName, effectiveDate, promulgationDate, link }] }
// 고시·세칙(운항기술기준, 공단 운영세칙)은 API 로 안 잡힐 수 있어 found:false 로 오면 수동 확인한다.

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}

async function verifyUser(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!token || !url || !anon) return null
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  return r.json()
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  const user = await verifyUser(req)
  if (!user) return json(401, { error: '로그인이 필요해요.' })
  // OC = 법령정보센터 마이페이지 "API인증키관리"에서 발급한 인증값(이메일 아이디가 아님, 2026-09-10 확인).
  // 실수로 이메일 전체를 넣었으면 @ 앞만 쓰고, 앞뒤 공백은 지운다.
  const ocRaw = (process.env.LAW_GO_KR_OC || '').trim()
  const oc = ocRaw.includes('@') ? ocRaw.split('@')[0] : ocRaw
  if (!oc) return json(503, { error: '자동 확인이 설정되지 않았어요(LAW_GO_KR_OC 없음). 각 항목의 링크로 직접 확인하세요.' })
  // 진단용: 값 자체는 노출하지 않고 앞 2글자와 길이만
  const ocHint = `OC ${oc.slice(0, 2)}…(${oc.length}자${ocRaw.includes('@') ? ', 이메일에서 @ 앞만 사용' : ''})`

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: '요청 형식 오류' })
  }
  // 문자열(구형) 또는 { query, target } 둘 다 받는다. target: law(법령) | admrul(행정규칙=고시·훈령)
  const queries = Array.isArray(body?.queries)
    ? body.queries.slice(0, 10).map((q) => (typeof q === 'string' ? { query: q, target: 'law' } : { query: String(q?.query ?? ''), target: q?.target === 'admrul' ? 'admrul' : 'law' }))
    : []
  const results = []
  for (const { query, target } of queries) {
    try {
      // http 로 부른다. 공식 가이드가 http 이고, https 로 부르면 리다이렉트되며 검색어가 떨어져
      // "필수 입력값이 존재하지 않습니다"가 돌아온다(2026-09-10 확인). 서버 함수에서 나가는 요청이라 브라우저 혼합콘텐츠 문제는 없다.
      const params = `OC=${encodeURIComponent(oc)}&target=${target}&type=JSON&query=${encodeURIComponent(query)}&display=5`
      // OPEN API 신청 시 등록한 도메인(aviationwallet.com)에서 온 요청으로 보이게 Referer 를 붙인다.
      // 법령정보센터는 등록 도메인 기준으로 OC 를 검증하는 것으로 보인다(주소창 직접 호출은 "필수입력요소 검증 실패", 2026-09-10).
      const headers = {
        accept: 'application/json',
        referer: 'https://aviationwallet.com/',
        origin: 'https://aviationwallet.com',
        'user-agent': 'Mozilla/5.0 (compatible; AWOS/1.0; +https://aviationwallet.com)',
      }
      let r = await fetch(`https://www.law.go.kr/DRF/lawSearch.do?${params}`, { headers, redirect: 'follow' })
      let text = await r.text()
      // 혹시 https 가 막히면 http 로 한 번 더
      if (!r.ok) {
        r = await fetch(`http://www.law.go.kr/DRF/lawSearch.do?${params}`, { headers, redirect: 'follow' })
        text = await r.text()
      }
      let data
      try {
        data = JSON.parse(text)
      } catch {
        // 법령정보센터는 OC 가 미승인이거나 틀리면 JSON 대신 HTML 안내 페이지를 돌려준다.
        // 무엇이 왔는지 앞부분을 같이 보내야 관리자 화면에서 원인을 알 수 있다.
        const head = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
        results.push({ query, found: false, note: `${ocHint} · JSON 이 아닌 응답(HTTP ${r.status}). 응답 앞부분: ${head || '(비어 있음)'}` })
        continue
      }
      // 형식은 JSON 인데 결과 목록이 없으면 그 사실을 남긴다(검색어 불일치·권한 문제 구분용)
      if (data && !data.LawSearch && !data.AdmRulSearch) {
        results.push({ query, found: false, note: `${ocHint} · 응답: ${JSON.stringify(data).slice(0, 120)}` })
        continue
      }
      // 법령은 LawSearch.law / 법령명한글 / 시행일자·공포일자·법령상세링크,
      // 행정규칙은 AdmRulSearch.admrul / 행정규칙명 / 시행일자·발령일자·행정규칙상세링크 로 필드가 다르다.
      const isAdm = target === 'admrul'
      const root = isAdm ? data?.AdmRulSearch : data?.LawSearch
      const list = isAdm ? root?.admrul : root?.law
      const laws = Array.isArray(list) ? list : list ? [list] : []
      const nameKey = isAdm ? '행정규칙명' : '법령명한글'
      const promKey = isAdm ? '발령일자' : '공포일자'
      const linkKey = isAdm ? '행정규칙상세링크' : '법령상세링크'
      // 이름이 정확히 같은 것 우선, 없으면 검색어를 포함하는 첫 결과
      const norm = (v) => String(v || '').replace(/\s/g, '')
      const exact = laws.find((l) => norm(l[nameKey]) === norm(query))
      const partial = laws.find((l) => norm(l[nameKey]).includes(norm(query)))
      const law = exact || partial || laws[0]
      if (!law) {
        results.push({ query, found: false, note: `검색 결과 0건(totalCnt ${root?.totalCnt ?? '?'})` })
        continue
      }
      results.push({
        query,
        found: true,
        lawName: law[nameKey],
        effectiveDate: String(law['시행일자'] || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        promulgationDate: String(law[promKey] || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        revisionType: law['제개정구분명'] || null,
        // 사람이 보는 링크. DRF 상세링크는 본문 API 권한이 필요해 쓰지 않는다.
        //  · 법령: 한글주소(/법령/법령명) — 패널의 manualUrl 이 우선
        //  · 행정규칙: 공개 상세 페이지(admRulLsInfoP.do?admRulSeq=일련번호). 일련번호가 없으면 검색 페이지
        link: isAdm
          ? (law['행정규칙일련번호']
              ? `https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=${law['행정규칙일련번호']}`
              : `https://www.law.go.kr/admRulSc.do?menuId=5&query=${encodeURIComponent(query)}`)
          : (law[linkKey] ? `https://www.law.go.kr${law[linkKey]}` : null),
        seq: law['행정규칙일련번호'] || law['법령일련번호'] || null,
      })
    } catch (e) {
      results.push({ query, found: false, note: '조회 실패' })
    }
  }
  return json(200, { results, checkedAt: new Date().toISOString() })
}

export const config = { path: '/api/check-regulations' }
