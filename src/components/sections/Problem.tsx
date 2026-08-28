import React from 'react'
import { AlertTriangle, Landmark, User } from 'lucide-react'

import { Reveal } from '../Reveal'

const CARDS = [
  {
    icon: User,
    title: '개인 — 생계 단절 리스크',
    desc: '갱신일을 놓치면 즉시 비행 제한과 소득 손실로 이어집니다. 종이 로그북과 기억에 의존한 관리로는 공백을 막기 어렵습니다.',
  },
  {
    icon: Landmark,
    title: '기업 — 과징금·영업정지',
    desc: '무자격 인력 운용이 적발되면 거액의 과징금과 영업정지로 이어집니다. 수기 대조만으로는 결격 인원을 놓치기 쉽습니다.',
  },
  {
    icon: AlertTriangle,
    title: '국가 — 항공 신뢰도 저하',
    desc: '자격 관리의 사각지대는 항공 안전 전반의 신뢰도를 떨어뜨립니다. 감사 대응 부담도 함께 누적됩니다.',
  },
]

export function Problem() {
  return (
    <section data-mbaas-oid="3zizcez" id="problem" className="bg-surface py-[clamp(80px,10vw,160px)]">
      <div data-mbaas-oid="uf5w5ia" className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p data-mbaas-oid="233n1p9" className="text-sm font-semibold uppercase tracking-wide text-rose-600">문제 정의</p>
          <h2
            data-mbaas-oid="6a6muv2" className="mt-3 max-w-2xl font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            종이·엑셀 관리가 남기는 세 겹의 사각지대
          </h2>
          <p data-mbaas-oid="bb9p4gr" className="mt-4 max-w-2xl text-slate-600">
            최근 5년간 국적항공사가 항공안전법 위반으로 부과받은 과징금은{' '}
            <span data-mbaas-oid="fus5s3t" className="font-mono-data tabular-nums font-semibold text-rose-600">100억 9,300만 원</span>을
            넘습니다. 아날로그 관리 방식은 이 리스크를 실시간으로 잡아내지 못합니다.
          </p>
        </Reveal>

        <div data-mbaas-oid="grj3rwo" className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} className="h-full">
              <div
                data-mbaas-oid="o4j82p6" className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-cardpad shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <card.icon className="h-9 w-9 text-rose-500" aria-hidden="true" />
                <h3 data-mbaas-oid="li35wy2" className="mt-5 text-lg font-bold text-ink">{card.title}</h3>
                <p data-mbaas-oid="2rife4e" className="mt-3 text-sm leading-relaxed text-slate-600">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
