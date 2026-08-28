import React from 'react'
import { CalendarDays, CheckCircle2 } from 'lucide-react'

import type { WorkLogEntry, WorkLogRoleCopy } from '../../types/workLog'

interface WorkLogListProps {
  entries: WorkLogEntry[]
  copy: WorkLogRoleCopy
  onSelect: (entry: WorkLogEntry) => void
}

export function WorkLogList({ entries, copy, onSelect }: WorkLogListProps) {
  if (entries.length === 0) {
    return (
      <div data-mbaas-oid="up7kuvu" className="rounded-card border border-dashed border-white/15 bg-panel p-cardpad text-center text-sm text-slate-400">
        {copy.emptyMessage}
      </div>
    )
  }

  return (
    <ul data-mbaas-oid="5n006je" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {entries.map((entry) => (
        <li data-mbaas-oid="q0l9t1s" key={entry.id}>
          <button
 data-mbaas-oid="u2wtdde" type="button"
            onClick={() => onSelect(entry)}
            className="w-full rounded-card border border-white/10 bg-panel p-5 text-left transition-all duration-200
              hover:border-sky hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <div data-mbaas-oid="kvx1ute" className="flex items-start justify-between gap-2">
              <span data-mbaas-oid="5b96tt5" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <span data-mbaas-oid="zt71u8k" className="font-mono-data tabular-nums">{entry.date}</span>
              </span>
              {copy.showVerified && entry.verified && (
                <span data-mbaas-oid="n1sb0nu" className="inline-flex shrink-0 items-center gap-1 rounded-control bg-go/10 px-2.5 py-1 text-xs font-bold text-go">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  확인서 발급
                </span>
              )}
            </div>

            <h3 data-mbaas-oid="3a1mh4w" className="mt-2 font-display text-base font-bold text-ink">{entry.targetLabel}</h3>
            <p data-mbaas-oid="ttotaxj" className="mt-2 line-clamp-2 text-sm text-slate-400">{entry.taskDetail}</p>

            {typeof entry.hours === 'number' && (
              <p data-mbaas-oid="kcbbpd7" className="mt-3 font-mono-data text-sm font-semibold tabular-nums text-slate-400">
                {entry.hours.toFixed(1)}시간
              </p>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
