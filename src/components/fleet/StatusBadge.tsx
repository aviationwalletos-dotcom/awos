import React from 'react'

import type { FleetStatus } from '../../data/fleet'

const STATUS_STYLES: Record<FleetStatus, string> = {
  운항중: 'bg-go/15 text-go',
  정비중: 'bg-amber-400/100/15 text-amber-400',
  대기: 'bg-slate-400/15 text-slate-300',
}

const DOT_STYLES: Record<FleetStatus, string> = {
  운항중: 'bg-go',
  정비중: 'bg-amber-400/100',
  대기: 'bg-slate-400',
}

interface StatusBadgeProps {
  status: FleetStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      data-mbaas-oid="fsbadge"
      className={`inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]} ${className}`}
    >
      <span data-mbaas-oid="31l145h" className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status]} ${status === '운항중' ? 'pulse-live' : ''}`} />
      {status}
    </span>
  )
}
