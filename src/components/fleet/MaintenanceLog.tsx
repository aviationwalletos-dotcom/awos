import React, { useMemo, useState } from 'react'
import { Wrench } from 'lucide-react'

import { EmptyState } from '../EmptyState'
import { AIRCRAFT, AIRCRAFT_MODELS, type FleetStatus, MAINTENANCE_RECORDS } from '../../data/fleet'

const selectClass =
  'min-h-[44px] rounded-control border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-200 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

interface MaintenanceLogProps {
  focusTail?: string | null
}

export function MaintenanceLog({ focusTail = null }: MaintenanceLogProps) {
  const [model, setModel] = useState<string | 'all'>('all')
  const [status, setStatus] = useState<FleetStatus | 'all'>('all')

  const tailToAircraft = useMemo(() => new Map(AIRCRAFT.map((a) => [a.tailNumber, a])), [])

  const filtered = useMemo(() => {
    return MAINTENANCE_RECORDS.filter((m) => {
      const a = tailToAircraft.get(m.tailNumber)
      if (!a) return false
      if (focusTail && a.tailNumber !== focusTail) return false
      if (model !== 'all' && a.model !== model) return false
      if (status !== 'all' && a.status !== status) return false
      return true
    }).sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [model, status, focusTail, tailToAircraft])

  return (
    <div data-mbaas-oid="hn78hge">
      {!focusTail && (
        <div data-mbaas-oid="h36khn7" className="mb-6 flex flex-wrap items-center gap-3">
          <label data-mbaas-oid="xg4zbc7" className="flex items-center gap-2 text-xs text-slate-400">
            기종
            <select data-mbaas-oid="mxmodel" className={selectClass} value={model} onChange={(e) => setModel(e.target.value)}>
              <option data-mbaas-oid="0nngqz1" value="all">전체</option>
              {AIRCRAFT_MODELS.map((m) => (
                <option data-mbaas-oid="j9vd98i" key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label data-mbaas-oid="e33t235" className="flex items-center gap-2 text-xs text-slate-400">
            상태
            <select
              data-mbaas-oid="3nw0oz2"
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as FleetStatus | 'all')}
            >
              <option data-mbaas-oid="ctiragp" value="all">전체</option>
              <option data-mbaas-oid="q8k3ln6" value="운항중">운항중</option>
              <option data-mbaas-oid="qxh4asf" value="정비중">정비중</option>
              <option data-mbaas-oid="y6h23ee" value="대기">대기</option>
            </select>
          </label>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          surface="dark"
          icon={Wrench}
          title="조건에 맞는 정비 기록이 없습니다"
          description="필터를 변경해 다른 정비 기록을 확인해 보세요."
        />
      ) : (
        <ul data-mbaas-oid="32u1tld" className="space-y-3">
          {filtered.map((m) => (
            <li
              data-mbaas-oid="mwvx75w"
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/15 bg-white/[0.06] p-4"
            >
              <div data-mbaas-oid="cv3xo1j" className="flex items-center gap-3">
                <span data-mbaas-oid="xi31ntz" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-sky/10 text-sky">
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                </span>
                <div data-mbaas-oid="a8rhu4w">
                  <p data-mbaas-oid="u9hk3lo" className="text-sm font-semibold text-white">
                    {m.work} <span data-mbaas-oid="jxol6m8" className="font-mono-data text-xs font-normal text-slate-400">{m.tailNumber}</span>
                  </p>
                  <p data-mbaas-oid="s1pvfcb" className="text-xs text-slate-400">정비사 {m.mechanic}</p>
                </div>
              </div>
              <span data-mbaas-oid="bennz5q" className="font-mono-data tabular-nums rounded-control bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                {m.date}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
