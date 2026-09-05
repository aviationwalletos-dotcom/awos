import { Check } from 'lucide-react'
import React from 'react'

import { FEATURE_SPECS } from '../../data/content'
import { Reveal } from '../Reveal'
import { TechFrame } from '../TechFrame'

// 기능 명세 섹션.
//
// 형용사로 제품을 칭찬하는 대신, 지원하는 항목을 그대로 나열한다. 조종사는 자기 로그북에
// 필요한 항목(PIC/Dual, 실제계기/모의계기, 범주별 시간 등)이 있는지로 도구를 판단하므로,
// 그 판단에 필요한 정보를 있는 그대로 제공하는 편이 설득력이 높다.

export function Features() {
  return (
    <section id="features" className="bg-blueprint bg-surface py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="eyebrow-tech">Specifications</p>
          <h2
            className="mt-4 font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            기능 명세
          </h2>
          <p className="mt-4 max-w-2xl text-slate-400">
            항공안전법 시행규칙 별지 비행경력증명서 서식의 항목 구조를 기준으로 설계했어요.
            해외 로그북 애플리케이션은 FAA 서식을 기준으로 하므로 국내 증명서 발급 시 항목을 재정리해야 해요.
          </p>
        </Reveal>

        <Reveal>
          {/* 컨셉의 syscell 격자: 카드 4장 대신 하나의 프레임을 헤어라인으로 4분할 */}
          <TechFrame className="mt-12 bg-panel/60">
            <div className="grid md:grid-cols-2">
              {FEATURE_SPECS.map((spec, i) => (
                <div
                  key={spec.key}
                  className={`hairline p-cardpad ${i % 2 === 0 ? 'md:border-r' : ''} ${i < FEATURE_SPECS.length - 2 ? 'border-b' : ''} ${i === FEATURE_SPECS.length - 2 ? 'max-md:border-b' : ''}`}
                >
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
              ))}
            </div>
          </TechFrame>
        </Reveal>


        <Reveal>
          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            조종사 · 훈련생 전용으로 설계됐어요.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
