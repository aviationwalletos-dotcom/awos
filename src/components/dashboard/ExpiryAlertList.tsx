import React from 'react'
import { AlertTriangle } from 'lucide-react'

import type { PersonnelRow } from './PersonnelTable'

interface ExpiryAlertListProps {
  personnel: PersonnelRow[]
}

export function ExpiryAlertList({ personnel }: ExpiryAlertListProps) {
  const riskItems = personnel
    .filter((p) => p.overallGo === false)
    .sort((a, b) => {
      const aDays = a.nearestExpiry?.daysUntil ?? Number.POSITIVE_INFINITY
      const bDays = b.nearestExpiry?.daysUntil ?? Number.POSITIVE_INFINITY
      return aDays - bDays
    })

  if (riskItems.length === 0) {
    return (
      <p className="rounded-card border border-go/30 bg-go/10 p-6 text-sm font-medium text-go">
        현재 만료 임박한 자격이 없어요. 모든 인력이 정상(GO) 상태예요.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {riskItems.map((p) => (
        <li key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-rose-500/30 bg-rose-500/100/10 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-white">
                {p.name} <span className="font-mono-data text-xs text-slate-400">{p.userId || '이메일 미확인'}</span>
              </p>
              <p className="text-xs text-slate-400">
                {p.roleLabel} · {p.nearestExpiry ? p.nearestExpiry.name : 'NO-GO'}
              </p>
            </div>
          </div>
          <span className="font-mono-data tabular-nums rounded-control bg-rose-500/100/20 px-3 py-1 text-xs font-bold text-rose-300">
            {p.nearestExpiry ? `만료 ${p.nearestExpiry.expiryDate}` : 'NO-GO'}
          </span>
        </li>
      ))}
    </ul>
  )
}
