import React from 'react'

import { AIRCRAFT, SCHEDULE_DAY_LABELS, type ScheduleKind, getScheduleFor } from '../../data/fleet'

const KIND_STYLES: Record<ScheduleKind, string> = {
  운항: 'bg-sky/25 border-sky/50 text-sky',
  정비: 'bg-amber-500/25 border-amber-500/50 text-amber-300',
  대기: 'bg-slate-400/20 border-slate-400/40 text-slate-300',
}

const TOTAL_HOURS = SCHEDULE_DAY_LABELS.length * 24

interface ScheduleTimelineProps {
  focusTail?: string | null
}

export function ScheduleTimeline({ focusTail = null }: ScheduleTimelineProps) {
  const rows = focusTail ? AIRCRAFT.filter((a) => a.tailNumber === focusTail) : AIRCRAFT

  return (
    <div data-mbaas-oid="k8ybdhx" className="overflow-x-auto rounded-card border border-white/15 bg-white/[0.06] p-4">
      <div data-mbaas-oid="ivfkou0" className="mb-3 flex min-w-[720px] text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <div data-mbaas-oid="72em9ft" className="w-28 shrink-0">항공기</div>
        <div data-mbaas-oid="bow1zl6" className="flex flex-1">
          {SCHEDULE_DAY_LABELS.map((label) => (
            <div data-mbaas-oid="dacxj3z" key={label} className="flex-1 border-l border-white/10 pl-2">
              {label}
            </div>
          ))}
        </div>
      </div>

      <ul data-mbaas-oid="efon0gl" className="min-w-[720px] space-y-3">
        {rows.map((a) => {
          const items = getScheduleFor(a.tailNumber)
          return (
            <li data-mbaas-oid="rp70rzb" key={a.tailNumber} className="flex items-center gap-0">
              <div data-mbaas-oid="xnd1k3d" className="w-28 shrink-0 pr-2">
                <p data-mbaas-oid="ymk5zx8" className="font-mono-data text-xs font-bold tabular-nums text-white">{a.tailNumber}</p>
                <p data-mbaas-oid="csg113n" className="text-[10px] text-slate-500">{a.model}</p>
              </div>
              <div data-mbaas-oid="c6r41lc" className="relative h-10 flex-1 rounded-control border border-white/10 bg-navy/40">
                {SCHEDULE_DAY_LABELS.map((_, i) =>
                  i === 0 ? null : (
                    <div
                      data-mbaas-oid="tht653z" key={i}
                      className="absolute top-0 h-full w-px bg-white/10"
                      style={{ left: `${(i / SCHEDULE_DAY_LABELS.length) * 100}%` }}
                    />
                  ),
                )}
                {items.map((item) => {
                  const startPct = ((item.dayOffset * 24 + item.startHour) / TOTAL_HOURS) * 100
                  const widthPct = (item.durationHour / TOTAL_HOURS) * 100
                  return (
                    <div
                      data-mbaas-oid="w66os30"
                      key={item.id}
                      title={`${item.label} (${item.kind})`}
                      className={`absolute top-1 bottom-1 flex items-center overflow-hidden rounded-[6px] border px-1.5 text-[10px] font-semibold ${KIND_STYLES[item.kind]}`}
                      style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 3)}%` }}
                    >
                      <span data-mbaas-oid="anj7unx" className="truncate">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      <div data-mbaas-oid="hl5l11y" className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span data-mbaas-oid="251bccg" className="inline-flex items-center gap-1.5">
          <span data-mbaas-oid="u4ic367" className="h-2 w-2 rounded-[3px] bg-sky/60" /> 운항
        </span>
        <span data-mbaas-oid="pj083je" className="inline-flex items-center gap-1.5">
          <span data-mbaas-oid="yoldktw" className="h-2 w-2 rounded-[3px] bg-amber-500/60" /> 정비
        </span>
        <span data-mbaas-oid="mowg45g" className="inline-flex items-center gap-1.5">
          <span data-mbaas-oid="miqpmgb" className="h-2 w-2 rounded-[3px] bg-slate-400/60" /> 대기
        </span>
      </div>
    </div>
  )
}
