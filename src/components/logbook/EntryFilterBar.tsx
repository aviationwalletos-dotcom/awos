import { ChevronDown } from 'lucide-react'
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

const PRIMARY_KINDS: LogbookFilterKind[] = ['all', 'unsigned']
const MENU_KINDS: LogbookFilterKind[] = ['date', 'aircraftType', 'flightCategory', 'month', 'imported']

function chipClass(isActive: boolean): string {
  return `inline-flex min-h-[44px] items-center rounded-control border px-4 py-2 text-sm font-semibold transition-colors
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
    ${isActive ? 'border-sky bg-sky/10 text-[#00D4FF]' : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'}`
}

function monthOf(entry: LogbookEntry): string {
  return entry.date.slice(0, 7) || '미상'
}

/** 기종 표기 흔들림(대소문자·공백: "C172S" vs "c172 s")을 같은 값으로 묶는 키 */
function normalizeAircraftType(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

function valuesForKind(entries: LogbookEntry[], kind: LogbookFilterKind): string[] {
  if (kind === 'all' || kind === 'date' || kind === 'unsigned' || kind === 'imported') return []
  if (kind === 'aircraftType') {
    // 정규화 키로 묶고, 표시는 처음 만난 표기를 쓴다
    const seen = new Map<string, string>()
    for (const e of entries) {
      const key = normalizeAircraftType(e.aircraftType)
      if (!seen.has(key)) seen.set(key, e.aircraftType.trim())
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
  }
  const getter = kind === 'flightCategory' ? (e: LogbookEntry) => e.flightCategory : monthOf
  const set = new Set(entries.map(getter))
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

export function EntryFilterBar({ entries, kind, value, onKindChange, onValueChange }: EntryFilterBarProps) {
  const values = valuesForKind(entries, kind)
  const isMenuKind = MENU_KINDS.includes(kind)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [menuOpen])
  // 날짜 필터용: 기록이 있는 날짜와 건수(최신순)
  const dateOptions = React.useMemo(() => {
    if (kind !== 'date') return [] as Array<[string, number]>
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.date, (counts.get(e.date) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries, kind])

  return (
    <div>
      {/* 상위 칩은 셋만: 전체 · 미서명 · 필터 ▾ — 나머지 기준(날짜·기종·종류·월·이월)은 ▾ 안으로.
          폰에서 칩 7개가 두 줄을 차지하던 것을 줄인다(2026-09-06). 고른 기준은 ▾ 자리에 칩으로 보인다. */}
      <div role="tablist" aria-label="분류 기준 선택" className="flex flex-wrap items-center gap-2">
        {PRIMARY_KINDS.map((k) => {
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
              className={chipClass(isActive)}
            >
              {FILTER_KIND_LABEL[k]}
            </button>
          )
        })}
        <div ref={menuRef} className="relative">
          <button type="button"
            role="tab"
            aria-selected={isMenuKind}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={chipClass(isMenuKind)}
            data-testid="entry-filter-menu"
          >
            {isMenuKind ? FILTER_KIND_LABEL[kind] : '필터'}
            <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute left-0 top-full z-30 mt-1.5 min-w-[160px] overflow-hidden rounded-control border border-white/15 bg-panel py-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]">
              {MENU_KINDS.map((k) => (
                <button key={k} type="button" role="menuitemradio" aria-checked={k === kind}
                  onClick={() => {
                    onKindChange(k)
                    onValueChange(null)
                    setMenuOpen(false)
                  }}
                  className={`flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-white/5 ${k === kind ? 'text-[#00D4FF]' : 'text-slate-200'}`}
                >
                  {FILTER_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          )}
        </div>
        {isMenuKind && (
          <button type="button"
            onClick={() => {
              onKindChange('all')
              onValueChange(null)
            }}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-sky"
          >
            필터 해제
          </button>
        )}
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
  if (kind === 'aircraftType') return normalizeAircraftType(entry.aircraftType) === normalizeAircraftType(value)
  if (kind === 'flightCategory') return entry.flightCategory === value
  if (kind === 'month') return monthOf(entry) === value
  return true
}
