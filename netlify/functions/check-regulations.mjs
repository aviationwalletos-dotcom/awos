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
  const oc = process.env.LAW_GO_KR_OC
  if (!oc) return json(503, { error: '자동 확인이 설정되지 않았어요(LAW_GO_KR_OC 없음). 각 항목의 링크로 직접 확인하세요.' })

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: '요청 형식 오류' })
  }
  const queries = Array.isArray(body?.queries) ? body.queries.slice(0, 10).map(String) : []
  const results = []
  for (const query of queries) {
    try {
      const u = `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(oc)}&target=law&type=JSON&query=${encodeURIComponent(query)}&display=5`
      const r = await fetch(u, { headers: { accept: 'application/json' } })
      const text = await r.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        // 법령정보센터는 OC 가 미승인이거나 틀리면 JSON 대신 HTML 안내 페이지를 돌려준다.
        // 무엇이 왔는지 앞부분을 같이 보내야 관리자 화면에서 원인을 알 수 있다.
        const head = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
        results.push({ query, found: false, note: `JSON 이 아닌 응답(HTTP ${r.status}). OC 미승인·오타 가능성. 응답 앞부분: ${head || '(비어 있음)'}` })
        continue
      }
      // 형식은 JSON 인데 결과 목록이 없으면 그 사실을 남긴다(검색어 불일치·권한 문제 구분용)
      if (data && !data.LawSearch) {
        results.push({ query, found: false, note: `응답에 LawSearch 없음: ${JSON.stringify(data).slice(0, 120)}` })
        continue
      }
      const list = data?.LawSearch?.law
      const laws = Array.isArray(list) ? list : list ? [list] : []
      // 이름이 정확히 같은 것 우선, 없으면 첫 결과
      const exact = laws.find((l) => String(l['법령명한글'] || '').replace(/\s/g, '') === query.replace(/\s/g, ''))
      const law = exact || laws[0]
      if (!law) {
        results.push({ query, found: false, note: `검색 결과 0건(totalCnt ${data?.LawSearch?.totalCnt ?? '?'})` })
        continue
      }
      results.push({
        query,
        found: true,
        lawName: law['법령명한글'],
        effectiveDate: String(law['시행일자'] || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        promulgationDate: String(law['공포일자'] || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        revisionType: law['제개정구분명'] || null,
        link: law['법령상세링크'] ? `https://www.law.go.kr${law['법령상세링크']}` : null,
      })
    } catch (e) {
      results.push({ query, found: false, note: '조회 실패' })
    }
  }
  return json(200, { results, checkedAt: new Date().toISOString() })
}

export const config = { path: '/api/check-regulations' }
