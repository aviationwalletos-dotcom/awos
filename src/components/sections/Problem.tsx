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
          <p className="eyebrow-tech">The Problem</p>
          <h2
            className="mt-4 max-w-3xl font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em', lineHeight: 1.25 }}
          >
            종이와 엑셀로 관리하는 비행기록은
            <br />
            같은 문제가 반복돼요
          </h2>
        </Reveal>

        <div className="mt-10 space-y-2.5">
          {/* 관제 플라이트 스트립 미학: 사각 행 + 좌측 틱 + 헤어라인 */}
          {PAIN_POINTS.map((point) => (
            <Reveal key={point}>
              <div className="flex items-start gap-3.5 border border-white/10 border-l-2 border-l-slate-500/70 bg-panel/70 px-4 py-3.5 transition-colors hover:border-white/20">
                <AlertCircle className="mt-0.5 h-4.5 w-4.5 flex-none text-slate-500" aria-hidden="true" />
                <p className="text-[15px] leading-relaxed text-slate-300">{point}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-8 text-sm text-slate-400">
            AWOS는 이 과정을 하나의 기록 체계로 대체해요. 아래에서 지원 항목을 확인하세요.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
