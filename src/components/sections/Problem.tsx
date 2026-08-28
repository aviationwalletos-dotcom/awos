import { AlertCircle } from 'lucide-react'
import React from 'react'

import { PAIN_POINTS } from '../../data/content'
import { Reveal } from '../Reveal'

// 문제 섹션 — 조종사 1인칭 관점.
//
// 이전 버전은 "개인-생계 단절 / 기업-과징금 / 국가-신뢰도" 프레임의 기관용 공포 소구였다.
// 침투 대상(훈련생·개인 조종사)에게는 남의 이야기이므로, 그들이 매주 겪는 구체적 상황
// 서술로 교체한다. 주장하지 않고 상황만 나열한다 — 겪어본 사람은 바로 알아본다.

export function Problem() {
  return (
    <section id="problem" className="bg-navy-dark py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="font-mono-data text-xs tracking-[0.24em] text-sky">THE PROBLEM</p>
          <h2
            className="mt-4 max-w-3xl font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em', lineHeight: 1.25 }}
          >
            종이와 엑셀로 관리하는 비행기록은
            <br />
            같은 문제가 반복됩니다
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PAIN_POINTS.map((point) => (
            <Reveal key={point}>
              <div className="flex h-full items-start gap-3 rounded-card border border-white/10 bg-panel p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
                <p className="text-[15px] leading-relaxed text-slate-300">{point}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-8 text-sm text-slate-400">
            AWOS는 이 과정을 하나의 기록 체계로 대체합니다. 아래에서 지원 항목을 확인하세요.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
