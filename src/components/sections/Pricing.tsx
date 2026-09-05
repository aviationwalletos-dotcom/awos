import React from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Reveal } from '../Reveal'
import { Button } from '../Button'
import { PRICING_TIERS } from '../../data/content'

export function Pricing() {
  return (
    <section id="pricing" className="bg-surface py-[clamp(80px,10vw,160px)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#00D4FF]">가격/도입 안내</p>
          <h2 className="mt-3 max-w-2xl font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            과징금 대비 압도적으로 낮은 비용
          </h2>
          <p className="mt-4 max-w-2xl text-slate-400">
            기관 규모와 감사 대응 수준에 맞춰 세 가지 티어를 선택할 수 있어요.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <Reveal key={tier.name} className="h-full">
              <div className={`flex h-full flex-col rounded-card border p-cardpad ${
                  tier.highlight
                    ? 'border-sky bg-navy text-white shadow-xl'
                    : 'border-white/10 bg-panel text-ink'
                }`}
              >
                {tier.highlight && (
                  <span className="mb-4 inline-block w-fit rounded-control bg-sky/15 px-3 py-1 text-xs font-bold text-sky">
                    추천
                  </span>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className={`mt-1 text-sm ${tier.highlight ? 'text-slate-300' : 'text-slate-400'}`}>
                  {tier.target}
                </p>

                <div className="mt-6">
                  <p className="font-mono-data tabular-nums text-2xl font-extrabold">{tier.priceMonthly}</p>
                  <p className={`mt-1 text-xs ${tier.highlight ? 'text-slate-400' : 'text-slate-400'}`}>
                    {tier.priceYearly} (연간 결제 시)
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${tier.highlight ? 'text-sky' : 'text-go'}`}
                        aria-hidden="true"
                      />
                      <span className={tier.highlight ? 'text-slate-200' : 'text-slate-400'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button className="mt-8 w-full"
                  tone="brand"
                  variant={tier.highlight ? 'solid' : 'outline'}
                  onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  도입 문의하기
                </Button>

                <Link to="/dashboard"
                  className={`mt-3 inline-flex items-center justify-center gap-1 rounded-control px-4 py-2 text-xs font-semibold transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky ${
                    tier.highlight ? 'text-sky hover:text-white' : 'text-sky-700 hover:text-sky-600'
                  }`}
                >
                  기관 대시보드 미리보기
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
