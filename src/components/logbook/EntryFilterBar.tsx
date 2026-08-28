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

const KIND_ORDER: LogbookFilterKind[] = ['all', 'aircraftType', 'flightCategory', 'month']

function monthOf(entry: LogbookEntry): string {
  return entry.date.slice(0, 7) || '미상'
}

function valuesForKind(entries: LogbookEntry[], kind: LogbookFilterKind): string[] {
  if (kind === 'all') return []
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

  return (
    <div data-mbaas-oid="lgbflt1">
      <div data-mbaas-oid="lgbflt2" role="tablist" aria-label="분류 기준 선택" className="flex flex-wrap gap-2">
        {KIND_ORDER.map((k) => {
          const isActive = k === kind
          return (
            <button
              data-mbaas-oid="lgbflt3" key={k}
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
                ${isActive ? 'border-sky bg-sky/10 text-[#0369a1]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              {FILTER_KIND_LABEL[k]}
            </button>
          )
        })}
      </div>

      {kind !== 'all' && values.length > 0 && (
        <div data-mbaas-oid="lgbflt4" className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`${FILTER_KIND_LABEL[kind]} 세부 값 선택`}>
          <button
            data-mbaas-oid="lgbflt5" type="button"
            data-state={value === null ? 'active' : 'idle'}
            onClick={() => onValueChange(null)}
            className={`inline-flex min-h-[36px] items-center rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
              ${value === null ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            전체
          </button>
          {values.map((v) => {
            const isActive = value === v
            return (
              <button
                data-mbaas-oid="lgbflt6" key={v}
                type="button"
                data-state={isActive ? 'active' : 'idle'}
                onClick={() => onValueChange(v)}
                className={`inline-flex min-h-[36px] items-center rounded-control border px-3 py-1.5 text-xs font-semibold font-mono-data transition-colors
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                  ${isActive ? 'border-sky bg-sky/10 text-[#0369a1]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
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
  if (kind === 'all' || value === null) return true
  if (kind === 'aircraftType') return entry.aircraftType === value
  if (kind === 'flightCategory') return entry.flightCategory === value
  if (kind === 'month') return monthOf(entry) === value
  return true
}
