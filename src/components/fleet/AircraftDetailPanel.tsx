import React, { useEffect, useRef } from 'react'
import { CalendarClock, MapPin, X } from 'lucide-react'

import type { Aircraft } from '../../data/fleet'
import { StatusBadge } from './StatusBadge'
import { MaintenanceLog } from './MaintenanceLog'
import { ScheduleTimeline } from './ScheduleTimeline'

interface AircraftDetailPanelProps {
  aircraft: Aircraft
  onClose: () => void
}

export function AircraftDetailPanel({ aircraft, onClose }: AircraftDetailPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      data-mbaas-oid="17pwzbw"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fleet-detail-title"
      onClick={onClose}
    >
      <div
        data-mbaas-oid="qbwz6av"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-card border border-white/15 bg-navy p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div data-mbaas-oid="4z2axjh" className="flex items-start justify-between gap-4">
          <div data-mbaas-oid="4k9x3yt">
            <p data-mbaas-oid="jg2ql8l" id="fleet-detail-title" className="font-mono-data text-2xl font-extrabold tabular-nums text-white">
              {aircraft.tailNumber}
            </p>
            <p data-mbaas-oid="jgioz26" className="mt-1 text-sm text-slate-400">{aircraft.model}</p>
          </div>
          <button
            data-mbaas-oid="e07yf7m"
            ref={closeRef}
            type="button"
            aria-label="상세 패널 닫기"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-control text-slate-300 transition-colors hover:bg-white/10 hover:text-white
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div data-mbaas-oid="cyvx9ys" className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={aircraft.status} />
          <span data-mbaas-oid="xddxzw7" className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {aircraft.route}
          </span>
          {aircraft.speed && (
            <span data-mbaas-oid="w3jny11" className="font-mono-data tabular-nums text-xs text-slate-400">{aircraft.speed} · {aircraft.altitude}</span>
          )}
        </div>

        <div data-mbaas-oid="f0gzw1f" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-mbaas-oid="rmgbni9" className="rounded-control border border-white/10 bg-white/[0.05] p-4">
            <p data-mbaas-oid="n4tliz1" className="text-xs font-semibold uppercase tracking-wide text-slate-400">최근 정비일</p>
            <p data-mbaas-oid="80mm0s4" className="mt-1 font-mono-data tabular-nums text-lg font-bold text-white">{aircraft.lastMaintenance}</p>
          </div>
          <div data-mbaas-oid="nl7prwv" className="rounded-control border border-white/10 bg-white/[0.05] p-4">
            <p data-mbaas-oid="odpk023" className="text-xs font-semibold uppercase tracking-wide text-slate-400">다음 정비 예정일</p>
            <p data-mbaas-oid="65t37ip" className="mt-1 font-mono-data tabular-nums text-lg font-bold text-white">{aircraft.nextMaintenance}</p>
          </div>
        </div>

        <div data-mbaas-oid="pdapdtc" className="mt-8">
          <h3 data-mbaas-oid="6hxq5hs" className="flex items-center gap-2 text-sm font-bold text-white">
            <CalendarClock className="h-4 w-4 text-sky" aria-hidden="true" />
            운항/정비 스케줄
          </h3>
          <div data-mbaas-oid="avmqpk4" className="mt-3">
            <ScheduleTimeline focusTail={aircraft.tailNumber} />
          </div>
        </div>

        <div data-mbaas-oid="xk0dtg6" className="mt-8">
          <h3 data-mbaas-oid="5vqeoqs" className="text-sm font-bold text-white">정비 이력</h3>
          <div data-mbaas-oid="99i4zzo" className="mt-3">
            <MaintenanceLog focusTail={aircraft.tailNumber} />
          </div>
        </div>
      </div>
    </div>
  )
}
