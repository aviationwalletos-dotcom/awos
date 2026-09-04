import React from 'react'
import { Building2, Lock, Server, ShieldCheck, Smartphone } from 'lucide-react'

import { Reveal } from '../Reveal'
import { TRUST_ITEMS } from '../../data/content'

const TRUST_ICONS = [Lock, ShieldCheck, Server, Building2]

export function Solution() {
  return (
    <section id="solution" className="bg-navy py-[clamp(80px,10vw,160px)] text-white">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky">솔루션 개요</p>
          <h2 className="mt-3 max-w-2xl font-display font-extrabold"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            개인 월렛과 기관 대시보드, 2계층 구조
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-card border border-white/10 bg-white/[0.04] p-cardpad">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-control bg-sky/15 text-sky">
                  <Smartphone className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold">Individual Wallet</h3>
              </div>
              <p className="mt-5 text-base font-semibold text-white">
                내 자격과 비행 기록, 한 곳에서 관리하세요
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                면허·항공신체검사·법정교육 등 자격 만료를 카드로 확인하고, 최근 이착륙 커런시 현황을 점검하며,
                비행 날짜·구간·기종·블록타임을 직접 입력해 나만의 비행 이력을 관리합니다.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li>면허·항공신체검사·법정교육 상태를 카드형으로 시각화</li>
                <li>만료 D-30/D-7 자동 알림으로 갱신 시점 알림</li>
                <li>QR 기반 즉시 자격 제시로 현장 배정 대응</li>
              </ul>
            </div>
          </Reveal>

          <Reveal>
            <div className="flex h-full flex-col rounded-card border border-sky/30 bg-sky/[0.06] p-cardpad">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-control bg-go/15 text-go">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold">Compliance OS</h3>
              </div>
              <p className="mt-5 text-base font-semibold text-white">
                소속 인력의 자격 상태를 관제탑처럼 한눈에 보세요
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                회원이 공유한 비행 적합성 상태를 Red/Green 신호로 모아 결격 인원을 즉시 식별하고, 역할·기종·상태별로
                필터링해 인력별 비행시간과 자격 현황을 점검하며, 교관 승인 요청까지 한 화면에서 관리합니다.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li>소속 인력 전체의 자격 상태를 Red/Green으로 실시간 조망</li>
                <li>배정 전 결격 여부를 몇 초 만에 확인</li>
                <li>감사 대응용 자격 이력·리포트 자동 정리</li>
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-20">
          <h3 className="text-center text-lg font-semibold text-slate-200">
            민감한 자격 정보를 다루는 만큼, 신뢰를 최우선으로 설계했습니다
          </h3>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = TRUST_ICONS[i]
            return (
              <Reveal key={item.title}>
                <div className="h-full rounded-card border border-white/10 bg-white/[0.03] p-6 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-control bg-white/10 text-sky">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h4 className="mt-4 text-sm font-bold">{item.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
