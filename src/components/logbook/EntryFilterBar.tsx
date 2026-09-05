import React from 'react'

import { FILTER_KIND_LABEL } from '../../types/logbook'
import type { LogbookEntry, LogbookFilterKind } from '../../types/logbook'

interface EntryFilterBarProps {
  entries: LogbookEntry[]
  kind: LogbookFilterKind
  value: string | null
  onKindChange: (kind: LogbookFilterKind) => void
  onValueChange: (value: string | null) => void
}

const KIND_ORDER: LogbookFilterKind[] = ['all', 'date', 'aircraftType', 'flightCategory', 'month', 'imported', 'unsigned']

function monthOf(entry: LogbookEntry): string {
  return entry.date.slice(0, 7) || '미상'
}

function valuesForKind(entries: LogbookEntry[], kind: LogbookFilterKind): string[] {
  if (kind === 'all' || kind === 'date' || kind === 'unsigned' || kind === 'imported') return []
  const getter =
    kind === 'aircraftType'
      ? (e: LogbookEntry) => e.aircraftType
      : kind === 'flightCategory'
        ? (e: LogbookEntry) => e.flightCategory
        : monthOf
  const set = new Set(entries.map(getter))
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

export function EntryFilterBar({ entries, kind, value, onKindChange, onValueChange }: EntryFilterBarProps) {
  const values = valuesForKind(entries, kind)
  // 날짜 필터용: 기록이 있는 날짜와 건수(최신순)
  const dateOptions = React.useMemo(() => {
    if (kind !== 'date') return [] as Array<[string, number]>
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.date, (counts.get(e.date) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries, kind])

  return (
    <div>
      <div role="tablist" aria-label="분류 기준 선택" className="flex flex-wrap gap-2">
        {KIND_ORDER.map((k) => {
          const isActive = k === kind
          return (
            <button key={k}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-state={isActive ? 'active' : 'idle'}
              onClick={() => {
                onKindChange(k)
                onValueChange(null)
              }}
              className={`inline-flex min-h-[44px] items-center rounded-control border px-4 py-2 text-sm font-semibold transition-colors
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                ${isActive ? 'border-sky bg-sky/10 text-[#00D4FF]' : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'}`}
            >
              {FILTER_KIND_LABEL[k]}
            </button>
          )
        })}
      </div>

      {kind === 'date' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-l-2 border-sky/40 pl-3">
          <label htmlFor="entry-date-filter" className="text-xs font-medium text-slate-400">↳ 날짜</label>
          {/* 기록이 있는 날짜만 고르는 select — 갤럭시에서 날짜 입력칸 글자가 겹쳐 보이던 문제를 피하고, 없는 날짜를 고를 일도 없앤다 */}
          <select
            id="entry-date-filter"
            value={value ?? ''}
            onChange={(e) => onValueChange(e.target.value || null)}
            className="min-h-[36px] rounded-control border border-white/10 bg-panel px-3 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <option value="">전체 날짜</option>
            {dateOptions.map(([d, n]) => (
              <option key={d} value={d}>{d} ({n}건)</option>
            ))}
          </select>
        </div>
      )}

      {kind === 'unsigned' && (
        <p className="mt-3 border-l-2 border-sky/40 pl-3 text-xs text-slate-400">↳ 교관 서명이 없는 기록만 (이월 기록 제외)</p>
      )}
      {kind === 'imported' && (
        <p className="mt-3 border-l-2 border-sky/40 pl-3 text-xs text-slate-400">↳ 엑셀·비행경력증명서로 옮겨온 기록만</p>
      )}

      {kind !== 'all' && kind !== 'date' && kind !== 'unsigned' && kind !== 'imported' && values.length > 0 && (
        // 하위 필터: 왼쪽 세로선 + "↳ 기종" 라벨 + 작은 알약 모양으로 상위 칩과 구분한다
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-l-2 border-sky/40 pl-3" role="group" aria-label={`${FILTER_KIND_LABEL[kind]} 세부 값 선택`}>
          <span className="mr-1 text-xs font-medium text-slate-400">↳ {FILTER_KIND_LABEL[kind].replace('별', '')}</span>
          <button type="button"
            data-state={value === null ? 'active' : 'idle'}
            onClick={() => onValueChange(null)}
            className={`inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
              ${value === null ? 'border-sky/70 bg-sky/15 text-[#00D4FF]' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'}`}
          >
            전체
          </button>
          {values.map((v) => {
            const isActive = value === v
            return (
              <button key={v}
                type="button"
                data-state={isActive ? 'active' : 'idle'}
                onClick={() => onValueChange(v)}
                className={`inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-[11px] font-semibold font-mono-data transition-colors
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                  ${isActive ? 'border-sky/70 bg-sky/15 text-[#00D4FF]' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'}`}
              >
                {v}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function matchesFilter(entry: LogbookEntry, kind: LogbookFilterKind, value: string | null): boolean {
  const isImported = entry.origin === 'flight_experience_certificate' || entry.origin === 'legacy_excel'
  if (kind === 'imported') return isImported
  if (kind === 'unsigned') {
    // 교관 서명 없음(실비행·시뮬레이터 모두). 이월 기록은 별도 탭.
    return !entry.instructorSignature && !isImported
  }
  if (kind === 'all' || value === null) return true
  if (kind === 'date') return entry.date === value
  if (kind === 'aircraftType') return entry.aircraftType === value
  if (kind === 'flightCategory') return entry.flightCategory === value
  if (kind === 'month') return monthOf(entry) === value
  return true
}
