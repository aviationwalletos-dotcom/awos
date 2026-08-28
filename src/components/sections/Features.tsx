import { Check } from 'lucide-react'
import React from 'react'

import { FEATURE_SPECS, PAIN_POINTS } from '../../data/content'
import { Reveal } from '../Reveal'

// 기능 명세 섹션.
//
// 형용사로 제품을 칭찬하는 대신, 지원하는 항목을 그대로 나열한다. 조종사는 자기 로그북에
// 필요한 항목(PIC/Dual, 실제계기/모의계기, 범주별 시간 등)이 있는지로 도구를 판단하므로,
// 그 판단에 필요한 정보를 있는 그대로 제공하는 편이 설득력이 높다.

export function Features() {
  return (
    <section id="features" className="bg-surface py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="font-mono-data text-xs tracking-[0.24em] text-sky">SPECIFICATIONS</p>
          <h2
            className="mt-4 font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            기능 명세
          </h2>
          <p className="mt-4 max-w-2xl text-slate-400">
            항공안전법 시행규칙 별지 비행경력증명서 서식의 항목 구조를 기준으로 설계했습니다.
            해외 로그북 애플리케이션은 FAA 서식을 기준으로 하므로 국내 증명서 발급 시 항목을 재정리해야 합니다.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {FEATURE_SPECS.map((spec) => (
            <Reveal key={spec.key}>
              <div className="h-full rounded-card border border-white/10 bg-panel p-cardpad">
                <h3 className="font-display text-lg font-bold text-ink">{spec.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {spec.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-sky" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-12 rounded-card border border-white/10 bg-white/[0.03] p-cardpad">
            <h3 className="font-display text-base font-bold text-ink">종이 · 엑셀 관리에서 반복되는 문제</h3>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {PAIN_POINTS.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-slate-400">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-slate-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            지원 직군: 조종사 · 훈련생을 기준으로 설계되었으며, 정비사 · 관제사 · 운항관리사 · 드론 조종자의 자격 관리도 지원합니다.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
