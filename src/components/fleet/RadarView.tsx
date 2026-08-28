import React from 'react'
import { Plane } from 'lucide-react'

import type { Aircraft } from '../../data/fleet'
import { StatusBadge } from './StatusBadge'

const STATUS_DOT: Record<Aircraft['status'], string> = {
  운항중: 'bg-go text-go',
  정비중: 'bg-amber-500 text-amber-400',
  대기: 'bg-slate-400 text-slate-300',
}

interface RadarViewProps {
  aircraft: Aircraft[]
  selectedTail: string | null
  onSelect: (tailNumber: string) => void
}

export function RadarView({ aircraft, selectedTail, onSelect }: RadarViewProps) {
  return (
    <div
      data-mbaas-oid="9ak8dgc"
      className="relative aspect-square w-full overflow-hidden rounded-card border border-white/15 bg-navy-dark/80 shadow-2xl"
    >
      <div data-mbaas-oid="qytiykv" className="absolute inset-0" aria-hidden="true">
        {[20, 40, 60, 80, 100].map((size) => (
          <div
            data-mbaas-oid="wcx2lc7"
            key={size}
            className="absolute rounded-full border border-sky/20"
            style={{
              width: `${size}%`,
              height: `${size}%`,
              left: `${(100 - size) / 2}%`,
              top: `${(100 - size) / 2}%`,
            }}
          />
        ))}
        <div data-mbaas-oid="bv3n4il" className="absolute left-0 top-1/2 h-px w-full bg-sky/15" />
        <div data-mbaas-oid="o5jz6ol" className="absolute left-1/2 top-0 h-full w-px bg-sky/15" />
        <div
          data-mbaas-oid="c8y2uc2"
          className="radar-sweep absolute left-1/2 top-1/2 h-1/2 w-px origin-top bg-gradient-to-b from-sky/60 to-transparent"
        />
      </div>

      {aircraft.map((a) => {
        const isSelected = selectedTail === a.tailNumber
        return (
          <button
            data-mbaas-oid="ngf3pae"
            key={a.tailNumber}
            type="button"
            data-state={isSelected ? 'active' : 'idle'}
            onClick={() => onSelect(a.tailNumber)}
            aria-label={`${a.tailNumber} ${a.model} 상세 보기 (${a.status})`}
            className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1
              transition-transform duration-200 hover:scale-110 active:scale-95
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded-control
              ${isSelected ? 'z-20 scale-110' : 'z-10'}`}
            style={{ left: `${a.radarPosition.x}%`, top: `${a.radarPosition.y}%` }}
          >
            <span
              data-mbaas-oid="x45epoa" className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-navy/90
                ${isSelected ? 'border-sky blip-pulse' : 'border-white/30 group-hover:border-sky/70'}`}
            >
              <Plane
                className={`h-4 w-4 ${STATUS_DOT[a.status].split(' ')[1]}`}
                aria-hidden="true"
                style={{ transform: a.status === '운항중' ? 'rotate(45deg)' : 'none' }}
              />
            </span>
            <span
              data-mbaas-oid="uibq3un"
              className="whitespace-nowrap rounded-control bg-navy/90 px-1.5 py-0.5 font-mono-data text-[10px] font-semibold tabular-nums text-white/90"
            >
              {a.tailNumber}
            </span>
          </button>
        )
      })}

      <div data-mbaas-oid="ultsywb" className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        <span data-mbaas-oid="us7374r" className="inline-flex items-center gap-1.5 rounded-control border border-white/10 bg-navy/70 px-2 py-1 text-[10px] text-slate-300">
          <span data-mbaas-oid="npbo290" className="h-1.5 w-1.5 rounded-full bg-go" /> 운항중
        </span>
        <span data-mbaas-oid="tqwukuh" className="inline-flex items-center gap-1.5 rounded-control border border-white/10 bg-navy/70 px-2 py-1 text-[10px] text-slate-300">
          <span data-mbaas-oid="dbt10er" className="h-1.5 w-1.5 rounded-full bg-amber-500" /> 정비중
        </span>
        <span data-mbaas-oid="xhby2ei" className="inline-flex items-center gap-1.5 rounded-control border border-white/10 bg-navy/70 px-2 py-1 text-[10px] text-slate-300">
          <span data-mbaas-oid="nphrxwy" className="h-1.5 w-1.5 rounded-full bg-slate-400" /> 대기
        </span>
      </div>
    </div>
  )
}

interface FleetGridProps {
  aircraft: Aircraft[]
  selectedTail: string | null
  onSelect: (tailNumber: string) => void
}

export function FleetGrid({ aircraft, selectedTail, onSelect }: FleetGridProps) {
  return (
    <ul data-mbaas-oid="jlr6m56" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {aircraft.map((a) => {
        const isSelected = selectedTail === a.tailNumber
        return (
          <li data-mbaas-oid="cgjw85d" key={a.tailNumber}>
            <button
              data-mbaas-oid="nd78j11"
              type="button"
              data-state={isSelected ? 'active' : 'idle'}
              onClick={() => onSelect(a.tailNumber)}
              className={`flex w-full flex-col gap-2 rounded-card border p-4 text-left transition-colors duration-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                ${isSelected ? 'border-sky bg-sky/10' : 'border-white/15 bg-white/[0.06] hover:border-sky/40'}`}
            >
              <div data-mbaas-oid="gvwkfyc" className="flex items-center justify-between gap-2">
                <span data-mbaas-oid="ipllssh" className="font-mono-data text-sm font-bold tabular-nums text-white">{a.tailNumber}</span>
                <StatusBadge status={a.status} />
              </div>
              <p data-mbaas-oid="m2qwsj5" className="text-xs text-slate-400">{a.model}</p>
              <p data-mbaas-oid="kqlfvv2" className="text-xs text-slate-300">{a.route}</p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
