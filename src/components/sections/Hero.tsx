import React from 'react'

import { Button } from '../Button'
import { HERO_STAT } from '../../data/content'

function RadarMotif() {
  return (
    <svg
      data-mbaas-oid="etc8kjf" viewBox="0 0 480 480"
      className="h-full w-full"
      role="img"
      aria-label="관제 레이더 그리드와 항로선을 형상화한 추상 그래픽"
    >
      <defs data-mbaas-oid="jd3pung">
        <radialGradient data-mbaas-oid="buhqfhu" id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop data-mbaas-oid="zia0exe" offset="0%" stopColor="#00D4FF" stopOpacity="0.35" />
          <stop data-mbaas-oid="27xd5pe" offset="100%" stopColor="#00D4FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle data-mbaas-oid="rs5359k" cx="240" cy="240" r="220" fill="url(#radarGlow)" />
      {[60, 110, 160, 210].map((r) => (
        <circle data-mbaas-oid="5ayitcm" key={r} cx="240" cy="240" r={r} fill="none" stroke="#00D4FF" strokeOpacity="0.25" strokeWidth="1" />
      ))}
      <line data-mbaas-oid="ycc58dk" x1="20" y1="240" x2="460" y2="240" stroke="#00D4FF" strokeOpacity="0.2" strokeWidth="1" />
      <line data-mbaas-oid="ke6o2gx" x1="240" y1="20" x2="240" y2="460" stroke="#00D4FF" strokeOpacity="0.2" strokeWidth="1" />
      <path
        data-mbaas-oid="phzjakx" d="M 60 380 L 210 220 L 300 260 L 420 90"
        fill="none"
        stroke="#00D4FF"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      <circle data-mbaas-oid="p4y3s7f" cx="210" cy="220" r="5" fill="#00D4FF" />
      <circle data-mbaas-oid="jrgwx52" cx="300" cy="260" r="5" fill="#10B981" />
      <circle data-mbaas-oid="g4vjol9" cx="420" cy="90" r="6" fill="#00D4FF">
        <animate data-mbaas-oid="ahb25jw" attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export function Hero() {
  return (
    <section
      data-mbaas-oid="si2d94s" id="hero"
      className="relative overflow-hidden bg-navy text-white"
      style={{ paddingTop: 'clamp(96px, 12vw, 160px)', paddingBottom: 'clamp(80px, 10vw, 160px)' }}
    >
      <div data-mbaas-oid="wyjpu2x" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,212,255,0.12),transparent_55%)]" />

      <div data-mbaas-oid="n5mur3s" className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div data-mbaas-oid="89u7vw5">
          <span data-mbaas-oid="ovvgxer" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
            항공 레그테크(RegTech) 인프라
          </span>

          <h1
            data-mbaas-oid="kiqsaol" className="mt-6 font-display font-extrabold text-white"
            style={{ fontSize: 'clamp(2.5rem, 1.8rem + 3.5vw, 4rem)', letterSpacing: '-0.03em', lineHeight: 0.98 }}
          >
            The Operating System
            <br data-mbaas-oid="c4in81l" />
            <span className="text-sky">for Aviation.</span>
          </h1>

          <p
            data-mbaas-oid="5ghgk0m" className="mt-6 max-w-xl text-slate-300"
            style={{ fontSize: 'clamp(1rem, 0.94rem + 0.3vw, 1.125rem)', lineHeight: 1.6 }}
          >
            AWOS는 알림을 보내는 시스템이 아닙니다. <strong className="font-semibold text-white">부적격 배정을 비행 전에 차단하는 시스템</strong>입니다.
            조종사·정비사·관제사의 면허와 법정교육을 종이와 엑셀 대신 실시간으로 검증합니다.
          </p>

          <div data-mbaas-oid="weuxcgg" className="mt-8 flex flex-col gap-3 rounded-card border border-white/10 bg-white/5 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
            <p data-mbaas-oid="bcbyfm9" className="font-mono-data tabular-nums text-2xl font-bold text-sky">{HERO_STAT.value}</p>
            <p data-mbaas-oid="djwb5z4" className="text-sm text-slate-300">{HERO_STAT.label}</p>
          </div>

          <div data-mbaas-oid="tk5xlsd" className="mt-10 flex flex-wrap gap-4">
            <Button
              data-mbaas-oid="2722r3q" size="lg"
              onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              도입 문의하기
            </Button>
            <Button
              data-mbaas-oid="frdm1ui" size="lg"
              variant="outline"
              tone="neutral"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => document.querySelector('#roles')?.scrollIntoView({ behavior: 'smooth' })}
            >
              역할별 기능 보기
            </Button>
          </div>
        </div>

        <div data-mbaas-oid="i1n2uh0" className="relative mx-auto aspect-square w-full max-w-md lg:ml-auto lg:mr-0">
          <RadarMotif />
        </div>
      </div>
    </section>
  )
}
