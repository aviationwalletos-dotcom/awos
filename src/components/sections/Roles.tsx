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
    <section data-mbaas-oid="4xikbic" id="roles" className="bg-surface py-[clamp(80px,10vw,160px)]">
      <div data-mbaas-oid="i3xwj5r" className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p data-mbaas-oid="y7aqpud" className="text-sm font-semibold uppercase tracking-wide text-[#0369a1]">
            역할별 기능 쇼케이스
          </p>
          <h2
            data-mbaas-oid="7w74j0c" className="mt-3 max-w-2xl font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            역할마다 다른 자격, 하나의 검증 화면
          </h2>
        </Reveal>

        <Reveal className="mt-10">
          <div data-mbaas-oid="vfmha10" role="tablist" aria-label="역할 선택" className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const RIcon = ROLE_ICONS[r.key]
              const isActive = r.key === active
              return (
                <button
                  data-mbaas-oid="vydaug1" key={r.key}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  data-state={isActive ? 'active' : 'idle'}
                  onClick={() => setActive(r.key)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-control border px-4 py-2.5 text-sm font-semibold transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                    ${isActive ? `${r.bgClass} ${r.colorClass} ${r.borderClass}` : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  <RIcon className="h-4 w-4" aria-hidden="true" />
                  {r.name}
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal className="mt-6">
          <div
            data-mbaas-oid="v4eu73u" role="tabpanel"
            className={`rounded-card border-2 bg-white p-cardpad transition-colors duration-300 ${ACTIVE_BORDER[active]}`}
          >
            <div data-mbaas-oid="wxi6zl0" className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <span data-mbaas-oid="uqjze19" className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-card ${role.bgClass} ${role.colorClass}`}>
                <Icon className="h-8 w-8" aria-hidden="true" />
              </span>
              <div data-mbaas-oid="w6nthmm" className="flex-1">
                <h3 data-mbaas-oid="d5spkbe" className={`text-xl font-bold ${role.colorClass}`}>{role.name}</h3>
                <p data-mbaas-oid="d0ng4b7" className="mt-2 text-sm text-slate-600">{role.summary}</p>

                <ul data-mbaas-oid="os43tfx" className="mt-6 divide-y divide-slate-100">
                  {role.credentials.map((c) => (
                    <li data-mbaas-oid="4rzakh7" key={c.label} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span data-mbaas-oid="vby5m27" className="text-sm font-medium text-ink">{c.label}</span>
                      <div data-mbaas-oid="w1cb5oh" className="flex items-center gap-3">
                        <span data-mbaas-oid="mnd1ebo" className="font-mono-data tabular-nums text-sm text-slate-500">{c.expiry}</span>
                        <span
                          data-mbaas-oid="epe5mfc" className={`rounded-control px-2.5 py-1 text-xs font-bold ${
                            c.status === 'GO' ? 'bg-go/10 text-go' : 'bg-amber-100 text-amber-700'
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
