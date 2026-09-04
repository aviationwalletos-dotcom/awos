import React from 'react'

interface KpiCardProps {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'risk' | 'go'
  icon: React.ComponentType<{ className?: string }>
}

const toneClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'text-white',
  risk: 'text-rose-400',
  go: 'text-go',
}

export function KpiCard({ label, value, hint, tone = 'default', icon: Icon }: KpiCardProps) {
  return (
    <div className="rounded-card border border-white/15 bg-white/[0.07] p-6 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <p className={`mt-3 font-mono-data text-3xl font-extrabold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </div>
  )
}
