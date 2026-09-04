import React, { useState } from 'react'
import { Bot, ClipboardList, Plane, Radar, Radio } from 'lucide-react'

import { Reveal } from '../Reveal'
import { ROLES, type RoleKey } from '../../data/content'

const ROLE_ICONS: Record<RoleKey, React.ComponentType<{ className?: string }>> = {
  pilot: Plane,
  mechanic: ClipboardList,
  controller: Radar,
  ops: Radio,
  drone: Bot,
}

const ACTIVE_BORDER: Record<RoleKey, string> = {
  pilot: 'border-role-pilot',
  mechanic: 'border-role-mechanic',
  controller: 'border-role-controller',
  ops: 'border-role-ops',
  drone: 'border-role-drone',
}

export function Roles() {
  const [active, setActive] = useState<RoleKey>('pilot')
  const role = ROLES.find((r) => r.key === active)!
  const Icon = ROLE_ICONS[active]

  return (
    <section id="roles" className="bg-surface py-[clamp(80px,10vw,160px)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#00D4FF]">
            역할별 기능 쇼케이스
          </p>
          <h2 className="mt-3 max-w-2xl font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            역할마다 다른 자격, 하나의 검증 화면
          </h2>
        </Reveal>

        <Reveal className="mt-10">
          <div role="tablist" aria-label="역할 선택" className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const RIcon = ROLE_ICONS[r.key]
              const isActive = r.key === active
              return (
                <button key={r.key}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  data-state={isActive ? 'active' : 'idle'}
                  onClick={() => setActive(r.key)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-control border px-4 py-2.5 text-sm font-semibold transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                    ${isActive ? `${r.bgClass} ${r.colorClass} ${r.borderClass}` : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'}`}
                >
                  <RIcon className="h-4 w-4" aria-hidden="true" />
                  {r.name}
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal className="mt-6">
          <div role="tabpanel"
            className={`rounded-card border-2 bg-panel p-cardpad transition-colors duration-300 ${ACTIVE_BORDER[active]}`}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-card ${role.bgClass} ${role.colorClass}`}>
                <Icon className="h-8 w-8" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${role.colorClass}`}>{role.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{role.summary}</p>

                <ul className="mt-6 divide-y divide-white/10">
                  {role.credentials.map((c) => (
                    <li key={c.label} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span className="text-sm font-medium text-ink">{c.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-data tabular-nums text-sm text-slate-400">{c.expiry}</span>
                        <span className={`rounded-control px-2.5 py-1 text-xs font-bold ${
                            c.status === 'GO' ? 'bg-go/10 text-go' : 'bg-amber-400/15 text-amber-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
