// RegulationPanel — 관리자 "법령 관리" 탭.
// 앱이 따르는 법령·기준 목록과 코드가 적용 중인 버전을 보여주고,
//  1) "최신 여부 확인": law.go.kr API 로 현재 시행일을 받아와 적용 버전과 대조(설정된 경우)
//  2) "확인함": 관리자가 직접 확인했음을 기록(시각·이름·메모) — 세칙·고시처럼 API 로 못 잡는 것도 여기 남긴다
// 법령이 바뀌면 "코드 위치"를 보고 고친 뒤, regulations.ts 의 appliedVersion 도 같이 올린다.

import { BookOpenCheck, CheckCircle2, ClipboardCopy, ExternalLink, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { REGULATIONS, type RegulationRef } from '../../data/regulations'
import { useAuth } from '../../contexts/AuthContext'
import { getAuthedAccessToken, getFreshDataClient } from '../../lib/baas/supabaseTransport'
import { Button } from '../Button'
// 법령 개정 대응 매뉴얼 — 새 Claude 채팅에 그대로 붙여 넣는 문서. 저장소 docs/ 가 원본.
import amendmentManual from '../../../docs/법령개정-대응매뉴얼.md?raw'

interface CheckRecord {
  regulation_id: string
  checked_at: string
  checked_by_name: string | null
  latest_effective_date: string | null
  note: string | null
  /** 마지막 "확인함" 때 저장한 조문별 본문 해시(schema19). 없으면 {} */
  article_hashes?: Record<string, string> | null
}

interface ArticleResult {
  id: string
  ok: boolean
  debug?: string
  hash?: string
  found?: boolean
  excerpt?: string
  revisionTags?: string[]
  length?: number
  url?: string
  note?: string
}

interface ApiResult {
  query: string
  found: boolean
  /** 시행 예정(아직 시행 전) 개정판 — 시행일 법령 목록에서 오늘 이후 시행일만 */
  upcoming?: { effectiveDate: string; promulgationDate?: string; revisionType?: string | null }[]
  lawName?: string
  effectiveDate?: string
  promulgationDate?: string
  revisionType?: string | null
  link?: string | null
  note?: string
}

function formatKst(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function RegulationPanel() {
  const { account } = useAuth()
  const [records, setRecords] = useState<Record<string, CheckRecord>>({})
  const [api, setApi] = useState<Record<string, ApiResult>>({})
  // 조문 단위 결과. 키 = `${regulationId}:${article}`
  const [articles, setArticles] = useState<Record<string, ArticleResult>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  async function handleCopyManual() {
    try {
      await navigator.clipboard.writeText(amendmentManual)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // 클립보드 권한이 없으면 새 창으로 열어 직접 복사하게
      const blob = new Blob([amendmentManual], { type: 'text/plain;charset=utf-8' })
      window.open(URL.createObjectURL(blob), '_blank')
    }
  }

  async function loadRecords() {
    const client = await getFreshDataClient()
    if (!client) return
    const { data } = await client.from('regulation_checks').select('*')
    const map: Record<string, CheckRecord> = {}
    for (const r of (data ?? []) as CheckRecord[]) map[r.regulation_id] = r
    setRecords(map)
  }
  useEffect(() => {
    void loadRecords()
  }, [])

  async function handleCheckLatest() {
    setIsChecking(true)
    setApiError(null)
    try {
      const token = getAuthedAccessToken()
      const seen = new Set<string>()
      const queries: { query: string; target: 'law' | 'admrul' }[] = []
      for (const r of REGULATIONS) {
        if (!r.lawGoKrQuery) continue
        const target = r.lawGoKrTarget ?? 'law'
        const key = `${target}:${r.lawGoKrQuery}`
        if (seen.has(key)) continue
        seen.add(key)
        queries.push({ query: r.lawGoKrQuery, target })
      }
      const res = await fetch('/api/check-regulations', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ queries }),
      })
      const data = (await res.json().catch(() => ({}))) as { results?: ApiResult[]; error?: string }
      if (!res.ok) throw new Error(data.error || `확인 실패(${res.status})`)
      const map: Record<string, ApiResult> = {}
      for (const r of data.results ?? []) map[r.query] = r
      setApi(map)

      // 2단계: 우리가 쓰는 조문·별표만 공개 페이지에서 읽어 해시를 비교해요(본문 API 는 서버 IP 등록이 필요해 못 씀).
      const items = REGULATIONS.flatMap((r) =>
        (r.lawGoKrQuery && r.watchArticles ? r.watchArticles : []).map((article) => ({
          id: `${r.id}:${article}`,
          query: r.lawGoKrQuery as string,
          target: r.lawGoKrTarget ?? 'law',
          slug: r.hangulSlug ?? '',
          article,
          keyword: r.annexKeywords?.[article] ?? '',
        })),
      )
      if (items.length > 0) {
        const res2 = await fetch('/api/check-articles', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items }),
        })
        const data2 = (await res2.json().catch(() => ({}))) as { results?: ArticleResult[] }
        const amap: Record<string, ArticleResult> = {}
        for (const r of data2.results ?? []) amap[r.id] = r
        setArticles(amap)
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '확인에 실패했어요.')
    } finally {
      setIsChecking(false)
    }
  }

  async function handleMarkChecked(reg: RegulationRef) {
    setSavingId(reg.id)
    try {
      const client = await getFreshDataClient()
      if (!client || !account) throw new Error('로그인이 필요해요.')
      const apiRow = reg.lawGoKrQuery ? api[reg.lawGoKrQuery] : undefined
      const { error } = await client.from('regulation_checks').upsert({
        regulation_id: reg.id,
        checked_at: new Date().toISOString(),
        checked_by: account.id,
        checked_by_name: account.name ?? null,
        latest_effective_date: apiRow?.effectiveDate ?? null,
        note: notes[reg.id]?.trim() || null,
        // 지금 읽은 조문 해시를 기준으로 저장 → 다음 확인 때 달라진 조문만 "변경됨"
        article_hashes: Object.fromEntries(
          (reg.watchArticles ?? [])
            .map((a) => [a, articles[`${reg.id}:${a}`]?.hash])
            .filter((pair): pair is [string, string] => typeof pair[1] === 'string'),
        ),
      })
      if (error) throw new Error(error.message)
      await loadRecords()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '저장에 실패했어요.')
    } finally {
      setSavingId(null)
    }
  }

  function statusOf(reg: RegulationRef): { tone: 'ok' | 'warn' | 'unknown'; text: string } {
    const apiRow = reg.lawGoKrQuery ? api[reg.lawGoKrQuery] : undefined
    if (apiRow?.found && apiRow.effectiveDate) {
      if (reg.appliedEffectiveDate && apiRow.effectiveDate > reg.appliedEffectiveDate) {
        return { tone: 'warn', text: `개정 있음 — 현재 시행일 ${apiRow.effectiveDate} (적용 ${reg.appliedEffectiveDate})` }
      }
      const rec = records[reg.id]
      if (rec?.latest_effective_date && apiRow.effectiveDate > rec.latest_effective_date) {
        return { tone: 'warn', text: `마지막 확인(${rec.latest_effective_date}) 이후 개정 — 현재 시행일 ${apiRow.effectiveDate}` }
      }
      return { tone: 'ok', text: `현재 시행일 ${apiRow.effectiveDate}${apiRow.revisionType ? ` · ${apiRow.revisionType}` : ''}` }
    }
    if (apiRow && !apiRow.found) {
      return { tone: 'unknown', text: `API 에서 못 찾음 — 링크로 직접 확인${apiRow.note ? ` · ${apiRow.note}` : ''}` }
    }
    if (!reg.lawGoKrQuery) return { tone: 'unknown', text: '공단 내부 규정 — API 범위 밖, 링크로 직접 확인' }
    return { tone: 'unknown', text: '아직 확인 안 함' }
  }

  return (
    <div className="rounded-card border border-white/10 bg-white/5 p-cardpad">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
          <BookOpenCheck className="h-4 w-4 text-sky" aria-hidden="true" />
          법령 관리
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" tone="neutral" onClick={() => void handleCopyManual()}>
            <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
            {copied ? '복사했어요' : '개정 대응 매뉴얼 복사'}
          </Button>
          <Button type="button" size="sm" tone="brand" loading={isChecking} disabled={isChecking} onClick={() => void handleCheckLatest()}>
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            최신 여부 한 번에 확인
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        앱이 계산에 쓰는 법령과 코드가 따르는 버전이에요. "최신 여부 확인"은 국가법령정보센터에서 현재 시행일을 받아와 대조해요(법률·규칙만 자동, 고시·세칙은 링크로 직접).
        개정이 확인되면 "코드 위치"의 값을 고치고 적용 버전을 올린 뒤 "확인함"을 남기세요.
        <span className="block mt-1 text-slate-500">
          빨간 "변경됨" 칩이 뜨면: <span className="text-slate-300">매뉴얼 복사</span> → 새 Claude 채팅 첫 메시지에 붙여넣기 → 바뀐 조문 이름 + 개정 원문 PDF + 최신 zip 첨부. 그 Claude 가 코드를 고쳐 줘요.
        </span>
      </p>
      {apiError && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {apiError}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {REGULATIONS.map((reg) => {
          const rec = records[reg.id]
          const st = statusOf(reg)
          const apiRow = reg.lawGoKrQuery ? api[reg.lawGoKrQuery] : undefined
          return (
            <li key={reg.id} className="rounded-control border border-white/10 bg-navy p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{reg.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{reg.articles}</p>
                </div>
                <span
                  className={`shrink-0 rounded-control px-2 py-0.5 text-[11px] font-semibold ${
                    st.tone === 'ok' ? 'bg-go/15 text-go' : st.tone === 'warn' ? 'bg-amber-400/20 text-amber-200' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {st.text}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">적용 버전</dt>
                  <dd className="text-slate-200">{reg.appliedVersion}{reg.appliedEffectiveDate ? ` (시행 ${reg.appliedEffectiveDate})` : ''}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">쓰이는 기능</dt>
                  <dd className="text-slate-200">{reg.features.join(' · ')}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">코드에 들어 있는 값</dt>
                  <dd className="text-slate-200">{reg.valuesSummary}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">코드 위치(개정 시 고칠 곳)</dt>
                  <dd className="font-mono-data text-[11px] text-slate-300">{reg.usedIn.join(' · ')}</dd>
                </div>
                {apiRow?.upcoming && apiRow.upcoming.length > 0 && (
                  <div className="sm:col-span-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                    시행 예정 개정: {apiRow.upcoming.map((u) => `${u.effectiveDate} 시행${u.revisionType ? ` (${u.revisionType})` : ''}`).join(' · ')}
                    <span className="ml-1 text-amber-200/70">— 시행일 전에 우리가 쓰는 조문이 바뀌는지 신구법 비교로 확인하세요.</span>
                  </div>
                )}
                {reg.watchArticles && reg.watchArticles.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">
                      우리가 쓰는 조문 — 조문 단위 변경 감지
                      <span className="ml-1 text-[10px] text-slate-600">(공개 페이지 본문 해시를 마지막 "확인함"과 비교)</span>
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {reg.watchArticles.map((a) => {
                        const cur = articles[`${reg.id}:${a}`]
                        const saved = rec?.article_hashes?.[a]
                        let tone = 'border-white/10 text-slate-400'
                        let label = '아직 확인 안 함'
                        if (cur && !cur.ok) {
                          tone = 'border-amber-400/40 text-amber-300'
                          label = `읽기 실패 · ${cur.note ?? ''}`
                        } else if (cur && cur.ok && !cur.found) {
                          // 시행 전 조문(예: 제39조의4, 2026-11-13 시행)은 현행 본문에 없어 조문 번호가 안 잡혀요. 해시는 저장돼요.
                          tone = 'border-white/20 text-slate-300'
                          label = saved ? (saved === cur.hash ? '변경 없음(시행 전 조문)' : '변경됨(시행 전 조문)') : '기준 없음 — 시행 전 조문일 수 있음'
                        } else if (cur && cur.ok) {
                          if (!saved) {
                            tone = 'border-sky/40 text-sky'
                            label = '기준 없음 — "확인함"으로 기준 저장'
                          } else if (saved === cur.hash) {
                            tone = 'border-go/40 text-go'
                            label = '변경 없음'
                          } else {
                            tone = 'border-rose-400/50 text-rose-300'
                            label = '변경됨 — 원문 확인 필요'
                          }
                        }
                        const tags = cur?.revisionTags?.length ? ` · ${cur.revisionTags[cur.revisionTags.length - 1]}` : ''
                        return (
                          <a
                            key={a}
                            href={/^별표/.test(a) ? `https://www.law.go.kr/법령별표서식/(${reg.hangulSlug ?? ''},${a})` : `https://www.law.go.kr/법령/${reg.hangulSlug ?? ''}/${a}`}
                            target="_blank"
                            rel="noreferrer"
                            title={cur?.excerpt ? `${cur.excerpt}…${cur.debug ? ` [${cur.debug}]` : ''}` : cur?.note}
                            className={`rounded border px-2 py-0.5 text-[11px] hover:bg-white/5 ${tone}`}
                          >
                            <span className="font-semibold">{a}</span> · {label}{tags}
                          </a>
                        )
                      })}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* 사람이 보는 링크는 공개 주소(manualUrl)로. API 가 주는 lawService.do 링크는 "본문 조회 API" 권한이 따로 필요해 로그인 화면이 뜬다(2026-09-10). */}
                {(reg.manualUrl || apiRow?.link) && (
                  <a
                    href={reg.lawGoKrTarget === 'admrul' && apiRow?.link ? apiRow.link : (reg.manualUrl || apiRow?.link)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-control border border-white/15 px-3 text-xs font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    원문 열기
                  </a>
                )}
                <input
                  value={notes[reg.id] ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [reg.id]: e.target.value }))}
                  placeholder="메모(예: 별표 8 변동 없음 확인)"
                  className="min-w-[200px] flex-1 rounded-control border border-white/10 bg-panel px-3 py-1.5 text-xs text-ink placeholder:text-slate-500"
                />
                <Button type="button" size="sm" variant="outline" tone="brand" loading={savingId === reg.id} disabled={savingId === reg.id} onClick={() => void handleMarkChecked(reg)}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  확인함
                </Button>
              </div>
              {rec && (
                <p className="mt-2 text-[11px] text-slate-500">
                  마지막 확인: {formatKst(rec.checked_at)} · {rec.checked_by_name ?? '관리자'}
                  {rec.latest_effective_date ? ` · 당시 시행일 ${rec.latest_effective_date}` : ''}
                  {rec.note ? ` · ${rec.note}` : ''}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
