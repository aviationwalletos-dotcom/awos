import React from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'

import type { RequirementItem } from '../../lib/roleCompliance'

const STATUS_BADGE_CLASS: Record<RequirementItem['status'], string> = {
  met: 'bg-go/10 text-go',
  unmet: 'bg-rose-500/100/15 text-rose-300',
  info: 'bg-sky/10 text-[#00D4FF]',
}

const STATUS_DEFAULT_LABEL: Record<RequirementItem['status'], string> = {
  met: '충족',
  unmet: '미충족',
  info: '참고',
}

const STATUS_ICON: Record<RequirementItem['status'], React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  met: CircleCheck,
  unmet: CircleAlert,
  info: Info,
}

export function RequirementCard({ item }: { item: RequirementItem }) {
  const Icon = STATUS_ICON[item.status]
  const badgeLabel = item.badgeLabel ?? STATUS_DEFAULT_LABEL[item.status]

  return (
    <div data-mbaas-oid="gi6fino" className="rounded-card border border-white/10 bg-panel p-5">
      <div data-mbaas-oid="eafpf5o" className="flex items-start justify-between gap-2">
        <h4 data-mbaas-oid="fs297d5" className="font-display text-sm font-bold text-ink">
          {item.title}
        </h4>
        <span

          data-mbaas-oid="59lrt81" className={`inline-flex shrink-0 items-center gap-1 rounded-control px-2.5 py-1 text-xs font-bold ${STATUS_BADGE_CLASS[item.status]}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden={true} />
          {badgeLabel}
        </span>
      </div>

      <p data-mbaas-oid="7k5eq14" className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {item.legalBasis}
      </p>

      <p data-mbaas-oid="o6wcly9" className="mt-3 text-sm text-slate-400">
        {item.detail}
      </p>

      {item.progress && (
        <div data-mbaas-oid="b684afd" className="mt-3">
          <div data-mbaas-oid="0uz5ef7" className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div

              data-mbaas-oid="twcfyy1" className={`h-full rounded-full ${item.status === 'met' ? 'bg-go' : 'bg-sky'}`}
              style={{ width: `${Math.min(100, Math.max(0, (item.progress.value / item.progress.max) * 100))}%` }}
            />
          </div>
          <p data-mbaas-oid="ydy93wo" className="mt-1 font-mono-data text-xs tabular-nums text-slate-400">
            {item.progress.value.toFixed(1)} / {item.progress.max}
            {item.progress.unit}
          </p>
        </div>
      )}
    </div>
  )
}
