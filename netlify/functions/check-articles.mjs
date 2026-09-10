// 조문 단위 변경 감지 — 국가법령정보센터 본문 조회 API(lawService.do)로 조문 하나를 받아 해시를 만든다.
//
// 경위(2026-09-10):
//   · 한글주소 공개 페이지(/법령/…/제77조)는 껍데기만 오고 본문은 자바스크립트가 채운다 → 서버에서 못 읽음.
//   · 본문 API 는 자가진단 페이지에서 "서버 IP 등록"을 요구했지만, 목록 API 도 같은 상황에서 Netlify + Referer 로 통과했다.
//     같은 방식으로 시도한다. 안 되면 note 에 응답 앞부분을 실어 보내 다음 수를 정한다.
//   · 별표는 한글주소 /법령별표서식/(법령명,별표N) 을 시도한다(서버 렌더링 여부 미확인 → excerpt 로 판단).
//
// 요청: POST { items: [{ id, query, target?, slug?, article }] }
//   query = lawSearch 검색어(법령명), target = law|admrul, article = '제77조' | '제39조의4' | '별표8'
// 응답: { results: [{ id, ok, hash, excerpt, revisionTags, note, url, debug }] }

import { createHash } from 'node:crypto'

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

const HEADERS = {
  accept: 'application/json, text/html',
  referer: 'https://aviationwallet.com/',
  origin: 'https://aviationwallet.com',
  'user-agent': 'Mozilla/5.0 (compatible; AWOS/1.0; +https://aviationwallet.com)',
}

/** '제77조' → '007700', '제39조의4' → '003904' (법령정보센터 JO 표기: 조 4자리 + 가지번호 2자리) */
function joCode(article) {
  const m = article.match(/^제(\d+)조(?:의(\d+))?$/)
  if (!m) return null
  return `${m[1].padStart(4, '0')}${(m[2] ?? '0').padStart(2, '0')}`
}

function sha(s) {
  return createHash('sha256').update(s).digest('hex')
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** JSON 어디에 있든 문자열을 모두 모아 붙인다(필드명을 몰라도 본문 해시를 만들 수 있게). */
function collectStrings(node, out = []) {
  if (node == null) return out
  if (typeof node === 'string') out.push(node)
  else if (Array.isArray(node)) node.forEach((n) => collectStrings(n, out))
  else if (typeof node === 'object') Object.values(node).forEach((n) => collectStrings(n, out))
  return out
}

const mstCache = new Map()

/** 법령일련번호(MST) — 목록 API 로 찾는다(이미 통하는 경로). */
async function findMst(oc, query, target) {
  const key = `${target}:${query}`
  if (mstCache.has(key)) return mstCache.get(key)
  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(oc)}&target=${target}&type=JSON&query=${encodeURIComponent(query)}&display=5`
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  const text = await r.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { error: `목록 응답 해석 실패: ${text.slice(0, 80)}` }
  }
  const isAdm = target === 'admrul'
  const list = isAdm ? data?.AdmRulSearch?.admrul : data?.LawSearch?.law
  const laws = Array.isArray(list) ? list : list ? [list] : []
  const norm = (v) => String(v || '').replace(/\s/g, '')
  const nameKey = isAdm ? '행정규칙명' : '법령명한글'
  const hit = laws.find((l) => norm(l[nameKey]) === norm(query)) || laws.find((l) => norm(l[nameKey]).includes(norm(query))) || laws[0]
  const seq = hit ? (isAdm ? hit['행정규칙일련번호'] : hit['법령일련번호']) : null
  const out = seq ? { mst: String(seq), efYd: String(hit['시행일자'] || '') } : { error: '목록에서 법령을 못 찾음' }
  mstCache.set(key, out)
  return out
}

async function fetchArticleViaApi(oc, query, target, article) {
  const jo = joCode(article)
  if (!jo) return { ok: false, note: '조문 표기 인식 실패' }
  const found = await findMst(oc, query, target)
  if (found.error) return { ok: false, note: found.error }
  const url = `https://www.law.go.kr/DRF/lawService.do?OC=${encodeURIComponent(oc)}&target=${target}&MST=${found.mst}&type=JSON&JO=${jo}`
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  const text = await r.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, note: `본문 응답이 JSON 아님(HTTP ${r.status}): ${stripHtml(text).slice(0, 100)}`, url }
  }
  // 오류 형태 { Response: { result, msg } } 또는 { result, msg }
  const err = data?.Response?.msg || data?.msg
  if (err && !data?.법령 && !data?.Law) return { ok: false, note: `본문 API 거부: ${err}`, url, debug: Object.keys(data).join(',') }
  const strings = collectStrings(data).filter((s) => s.trim().length > 0)
  const body = strings.join(' ').replace(/\s+/g, ' ').trim()
  if (!body) return { ok: false, note: '본문 비어 있음', url, debug: Object.keys(data).join(',') }
  const revisionTags = [...body.matchAll(/<(개정|신설|전문개정|본조신설)\s*([0-9. ,]+)>/g)].map((m) => `${m[1]} ${m[2].trim()}`).slice(-3)
  return {
    ok: true,
    found: body.includes(article),
    hash: sha(body),
    excerpt: body.slice(0, 160),
    revisionTags,
    length: body.length,
    url,
    debug: `keys=${Object.keys(data).join(',')}`,
  }
}

/**
 * 별표 — "법령 별표·서식 목록 조회" API(target=licbyl)로 해당 별표를 찾고,
 * 파일 링크(PDF/HWP)가 있으면 파일 바이트를 해시한다(별표 본문이 바뀌면 파일이 바뀐다).
 * 필드명은 첫 실행에서 debug 로 확인한다.
 */
async function fetchAnnexViaApi(oc, query, article, keyword) {
  const n = article.replace(/^별표/, '').trim()
  // 별표 목록 API 는 별표 제목으로 검색한다(법령명으로 검색하면 0건, 2026-09-10 확인). 검색어가 없으면 법령명으로.
  const q = keyword || query
  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(oc)}&target=licbyl&type=JSON&query=${encodeURIComponent(q)}&display=100`
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  const text = await r.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, note: `별표 목록 응답이 JSON 아님(HTTP ${r.status}): ${stripHtml(text).slice(0, 100)}`, url }
  }
  const err = data?.Response?.msg || data?.msg
  // 응답(2026-09-10 확인): { licBylSearch: { resultMsg, licbyl: [...] | {...}, totalCnt, ... } }
  // 행 필드: 관련법령명, 관련법령ID, 소관부처명, 공포번호, 별표서식파일링크, 법령종류, 제개정구분명, id, 별표일련번호,
  //          별표법령상세링크, 별표종류, 별표번호, 별표서식PDF파일링크, 별표명, 관련법령일련번호, 공포일자
  const root = data?.licBylSearch || data?.LicBylSearch || {}
  const raw = root.licbyl ?? root.licByl ?? []
  const rows = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : []
  if (rows.length === 0) {
    return { ok: false, note: `별표 목록 비어 있음(검색어 "${q}", totalCnt ${root?.totalCnt ?? '?'})${err ? ` · ${err}` : ''}`, url, debug: `root=${Object.keys(root).join(',')}` }
  }
  const norm = (v) => String(v ?? '').replace(/\s/g, '')
  const wantLaw = norm(query)
  // 별표번호는 "8", "08", "별표 8", "28의2" 등으로 올 수 있다 → 숫자·'의' 만 남겨 비교
  const numKey = (v) => norm(v).replace(/^별표/, '').replace(/^0+(?=\d)/, '')
  const candidates = rows.filter((row) => {
    const lawOk = norm(row['관련법령명']).includes(wantLaw) || wantLaw.includes(norm(row['관련법령명']))
    const kindOk = !row['별표종류'] || /별표/.test(String(row['별표종류']))
    return lawOk && kindOk && numKey(row['별표번호']) === n
  })
  if (candidates.length === 0) {
    const seen = rows.slice(0, 5).map((r) => `${r['관련법령명']}/${r['별표종류']}/${r['별표번호']}`).join(' | ')
    return { ok: false, note: `별표 ${n} 을 목록에서 못 찾음(${rows.length}건)`, url, debug: `보인 것: ${seen}` }
  }
  // 같은 별표가 여러 공포 버전으로 오면 공포일자가 가장 최근인 것
  const hit = candidates.slice().sort((a, b) => String(b['공포일자'] || '').localeCompare(String(a['공포일자'] || '')))[0]
  const pdfLink = hit['별표서식PDF파일링크'] || hit['별표서식파일링크'] || ''
  let hash
  let note
  if (pdfLink) {
    const fileUrl = String(pdfLink).startsWith('http') ? String(pdfLink) : `https://www.law.go.kr${pdfLink}`
    try {
      const fr = await fetch(fileUrl, { headers: HEADERS, redirect: 'follow' })
      const buf = Buffer.from(await fr.arrayBuffer())
      if (fr.ok && buf.length > 1000) {
        hash = createHash('sha256').update(buf).digest('hex')
        note = `파일 ${(buf.length / 1024).toFixed(0)}KB 해시`
      } else {
        note = `파일 응답 ${fr.status}, ${buf.length}B`
      }
    } catch (e) {
      note = `파일 못 받음: ${e?.message ?? e}`
    }
  }
  if (!hash) {
    // 파일을 못 받으면 별표 메타(일련번호·공포일자·제개정구분)로 — 개정되면 일련번호가 바뀐다
    hash = sha(`${hit['별표일련번호']}|${hit['공포일자']}|${hit['공포번호']}|${hit['제개정구분명']}|${hit['별표명']}`)
    note = `${note ? note + ' → ' : ''}목록 항목(일련번호·공포일자) 해시`
  }
  const tag = hit['공포일자'] ? `공포 ${String(hit['공포일자']).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3')}` : ''
  return {
    ok: true,
    found: true,
    hash,
    excerpt: `${hit['별표명'] ?? ''} · ${note}`.slice(0, 160),
    revisionTags: tag ? [tag] : [],
    length: 0,
    url,
    debug: `${hit['제개정구분명'] ?? ''} ${hit['공포번호'] ?? ''}`,
  }
}

async function fetchAnnexViaPage(slug, article) {
  const n = article.replace(/^별표/, '')
  const url = `https://www.law.go.kr/법령별표서식/(${encodeURIComponent(slug)},${encodeURIComponent('별표' + n)})`
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  const html = await r.text()
  const text = stripHtml(html)
  if (!r.ok) return { ok: false, note: `HTTP ${r.status}`, url }
  if (/한글주소명을 찾을 수 없습니다/.test(text)) return { ok: false, note: '별표 한글주소 없음', url }
  if (text.length < 200) return { ok: false, note: `별표 페이지 본문 없음(${text.length}자) — 자바스크립트 렌더링`, url, excerpt: text.slice(0, 120) }
  const body = text.slice(0, 8000)
  return { ok: true, found: /별표/.test(body), hash: sha(body), excerpt: body.slice(0, 160), revisionTags: [], length: body.length, url }
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  const ocRaw = (process.env.LAW_GO_KR_OC || '').trim()
  const oc = ocRaw.includes('@') ? ocRaw.split('@')[0] : ocRaw
  if (!oc) return json(503, { error: 'LAW_GO_KR_OC 없음' })

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad json' })
  }
  const items = Array.isArray(body?.items) ? body.items.slice(0, 24) : []
  const results = []
  for (const it of items) {
    const id = String(it?.id ?? '')
    const query = String(it?.query ?? '')
    const slug = String(it?.slug ?? '')
    const target = it?.target === 'admrul' ? 'admrul' : 'law'
    const article = String(it?.article ?? '')
    if (!id || !article) {
      results.push({ id, ok: false, note: 'id/article 필요' })
      continue
    }
    try {
      if (/^별표/.test(article)) {
        // 목록 API 우선, 실패하면 공개 페이지(대부분 JS 렌더링이라 안 되지만 남겨 둠)
        const viaApi = await fetchAnnexViaApi(oc, query, article, String(it?.keyword ?? ''))
        results.push({ id, ...(viaApi.ok ? viaApi : { ...(await fetchAnnexViaPage(slug || query.replace(/\s/g, ''), article)), note: `${viaApi.note ?? ''}${viaApi.debug ? ` [${viaApi.debug}]` : ''}` }) })
      }
      else results.push({ id, ...(await fetchArticleViaApi(oc, query, target, article)) })
    } catch (e) {
      results.push({ id, ok: false, note: `요청 실패: ${e?.message ?? e}` })
    }
  }
  return json(200, { results })
}

export const config = { path: '/api/check-articles' }
