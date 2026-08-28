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
    <div data-mbaas-oid="qfvhofd" className="rounded-card border border-white/15 bg-white/[0.07] p-6 shadow-lg backdrop-blur-xl">
      <div data-mbaas-oid="j904xua" className="flex items-center justify-between">
        <p data-mbaas-oid="burm1h4" className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <p data-mbaas-oid="65gn0p8" className={`mt-3 font-mono-data text-3xl font-extrabold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </p>
      <p data-mbaas-oid="9lsxv8g" className="mt-2 text-xs text-slate-400">{hint}</p>
    </div>
  )
}
