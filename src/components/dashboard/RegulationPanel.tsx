// RegulationPanel — 관리자 "법령 관리" 탭.
// 앱이 따르는 법령·기준 목록과 코드가 적용 중인 버전을 보여주고,
//  1) "최신 여부 확인": law.go.kr API 로 현재 시행일을 받아와 적용 버전과 대조(설정된 경우)
//  2) "확인함": 관리자가 직접 확인했음을 기록(시각·이름·메모) — 세칙·고시처럼 API 로 못 잡는 것도 여기 남긴다
// 법령이 바뀌면 "코드 위치"를 보고 고친 뒤, regulations.ts 의 appliedVersion 도 같이 올린다.

import { BookOpenCheck, CheckCircle2, ExternalLink, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { REGULATIONS, type RegulationRef } from '../../data/regulations'
import { useAuth } from '../../contexts/AuthContext'
import { getAuthedAccessToken, getFreshDataClient } from '../../lib/baas/supabaseTransport'
import { Button } from '../Button'

interface CheckRecord {
  regulation_id: string
  checked_at: string
  checked_by_name: string | null
  latest_effective_date: string | null
  note: string | null
}

interface ApiResult {
  query: string
  found: boolean
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
  const [apiError, setApiError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

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
        <Button type="button" size="sm" tone="brand" loading={isChecking} disabled={isChecking} onClick={() => void handleCheckLatest()}>
          {isChecking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          최신 여부 한 번에 확인
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        앱이 계산에 쓰는 법령과 코드가 따르는 버전이에요. "최신 여부 확인"은 국가법령정보센터에서 현재 시행일을 받아와 대조해요(법률·규칙만 자동, 고시·세칙은 링크로 직접).
        개정이 확인되면 "코드 위치"의 값을 고치고 적용 버전을 올린 뒤 "확인함"을 남기세요.
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
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* 사람이 보는 링크는 공개 주소(manualUrl)로. API 가 주는 lawService.do 링크는 "본문 조회 API" 권한이 따로 필요해 로그인 화면이 뜬다(2026-09-10). */}
                {(reg.manualUrl || apiRow?.link) && (
                  <a
                    href={reg.manualUrl || apiRow?.link}
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
