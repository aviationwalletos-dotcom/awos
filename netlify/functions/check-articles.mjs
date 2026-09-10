// 조문 단위 변경 감지 — 국가법령정보센터 "한글주소" 공개 페이지를 읽어 조문 본문의 해시를 만든다.
//
// 왜 API 가 아니라 공개 페이지인가(2026-09-10):
//   본문 조회 API(lawService.do)는 "등록된 서버 IP" 검증을 요구한다. Netlify 함수는 IP 가 고정이 아니라 통과할 수 없다.
//   한글주소(law.go.kr/법령/<법령명>/<조문>)는 로그인·OC 없이 누구나 열리고, 조문·별표 단위로 열린다.
//
// 동작: POST { items: [{ id, slug, article }] } → 각 항목에 대해
//   { id, ok, hash, excerpt, revisionTags, note }
//   hash = 조문 본문(공백 정규화) SHA-256. 관리자가 "확인함"을 누를 때 저장해 두고, 다음 확인 때 비교한다.
//   revisionTags = 본문에 붙은 <개정 2022. 6. 8.> 같은 표기(최신 개정일 추정용).
//
// 페이지 구조가 바뀌면 excerpt 로 알아챌 수 있게, 응답에 앞부분 120자를 같이 준다.

import { createHash } from 'node:crypto'

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

const UA = 'Mozilla/5.0 (compatible; AWOS/1.0; +https://aviationwallet.com)'

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** 조문 본문만 잘라낸다. 못 찾으면 페이지 본문 전체(정규화)를 쓰되 note 로 알린다. */
function extractArticle(text, article) {
  const norm = text.replace(/[ \t\u00a0]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
  const isAnnex = /^별표/.test(article)
  if (isAnnex) {
    // "[별표 8]" 같은 머리말부터 최대 6000자
    const n = article.replace(/^별표/, '').trim()
    const re = new RegExp(`\\[?별표\\s*${n}\\]?[^\\n]*`)
    const m = norm.match(re)
    if (m) return { body: norm.slice(m.index, m.index + 6000), found: true }
    return { body: norm.slice(0, 6000), found: false }
  }
  // "제77조(" 부터 다음 "제N조(" 직전까지(조문 제목이 없으면 "제77조 " 로도 시도)
  const head = article.replace(/조$/, '조')
  const escaped = head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const start = norm.search(new RegExp(`${escaped}\\s*\\(`)) >= 0
    ? norm.search(new RegExp(`${escaped}\\s*\\(`))
    : norm.search(new RegExp(`${escaped}\\b`))
  if (start < 0) return { body: norm.slice(0, 4000), found: false }
  const rest = norm.slice(start + head.length)
  const next = rest.search(/\n\s*제\d+조(의\d+)?\s*\(/)
  const body = next > 0 ? norm.slice(start, start + head.length + next) : norm.slice(start, start + 4000)
  return { body, found: true }
}

async function fetchArticle(slug, article) {
  const url = `https://www.law.go.kr/법령/${encodeURIComponent(slug)}/${encodeURIComponent(article)}`
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html', referer: 'https://aviationwallet.com/' }, redirect: 'follow' })
  const html = await r.text()
  if (!r.ok) return { ok: false, note: `HTTP ${r.status}`, url }
  const text = stripHtml(html)
  if (/한글주소명을 찾을 수 없습니다/.test(text)) return { ok: false, note: '한글주소 없음(법령명·조문 표기 확인)', url }
  const { body, found } = extractArticle(text, article)
  const normalized = body.replace(/\s+/g, ' ').trim()
  const hash = createHash('sha256').update(normalized).digest('hex')
  const revisionTags = [...normalized.matchAll(/<(개정|신설|전문개정|본조신설)\s*([0-9. ,]+)>/g)].map((m) => `${m[1]} ${m[2].trim()}`).slice(-3)
  return { ok: true, hash, found, excerpt: normalized.slice(0, 120), revisionTags, length: normalized.length, url }
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad json' })
  }
  const items = Array.isArray(body?.items) ? body.items.slice(0, 20) : []
  const results = []
  for (const it of items) {
    const id = String(it?.id ?? '')
    const slug = String(it?.slug ?? '')
    const article = String(it?.article ?? '')
    if (!id || !slug || !article) {
      results.push({ id, ok: false, note: 'id/slug/article 필요' })
      continue
    }
    try {
      results.push({ id, ...(await fetchArticle(slug, article)) })
    } catch (e) {
      results.push({ id, ok: false, note: `요청 실패: ${e?.message ?? e}` })
    }
  }
  return json(200, { results })
}

export const config = { path: '/api/check-articles' }
