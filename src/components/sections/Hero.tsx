import { Check, ShieldCheck } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

import { Button } from '../Button'
import { HERO_STAT } from '../../data/content'
import { TechFrame } from '../TechFrame'

// 히어로 우측 시각 요소.
//
// 이전에는 추상적인 레이더 그래픽이었으나, 이 제품의 본질은 관제·항적 추적이 아니라
// "비행기록의 정리·집계"다. 사용자가 실제로 보게 될 로그북 화면을 그대로 보여주는 편이
// 무엇을 해주는 도구인지 즉시 전달된다(Show, don't tell).
function LogbookPreview() {
  return (
    <TechFrame
      className="w-full bg-panel/90 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
    >
    <div
      className="p-5"
      role="img"
      aria-label="AWOS 디지털 로그북 화면 예시 — 누적 비행시간과 항목별 집계, 최근 비행 기록 목록"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold text-ink">
          Aviation Wallet <span className="text-sky">OS</span>
        </span>
        <span className="rounded-full border border-go/40 bg-go/10 px-2.5 py-1 font-mono-data text-[10px] font-semibold text-go">
          ● GO
        </span>
      </div>

      <div className="mt-4 rounded-control border border-white/10 bg-gradient-to-br from-deep/80 to-transparent p-4">
        <p className="font-mono-data text-[10px] tracking-[0.22em] text-sky">TOTAL FLIGHT TIME</p>
        <p className="mt-1.5 font-mono-data text-4xl font-bold tracking-tight text-ink">
          1091.8 <span className="text-sm font-normal text-slate-400">hrs</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-400">
          <span>PIC <b className="font-mono-data font-medium text-ink">823.5</b></span>
          <span>야간 <b className="font-mono-data font-medium text-ink">121.3</b></span>
          <span>계기 <b className="font-mono-data font-medium text-ink">88.0</b></span>
        </div>
      </div>

      {[
        { date: '2026-08-21', route: 'RKPU → RKNY', ac: 'C172', hrs: '2.3', tag: 'X-C' },
        { date: '2026-08-19', route: 'RKPU → RKPU', ac: 'C172', hrs: '1.1', tag: 'LCL' },
      ].map((row) => (
        <div
          key={row.date}
          className="mt-2.5 flex items-center justify-between rounded-control border border-white/[0.07] bg-white/[0.03] px-4 py-3"
        >
          <div>
            <p className="font-mono-data text-[10px] text-slate-400">{row.date}</p>
            <p className="mt-0.5 font-mono-data text-xs font-semibold text-ink">
              {row.route} · {row.ac}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono-data text-sm font-bold text-ink">{row.hrs}h</p>
            <span className="mt-0.5 inline-block rounded bg-sky/15 px-1.5 py-0.5 font-mono-data text-[9px] font-semibold text-sky">
              {row.tag}
            </span>
          </div>
        </div>
      ))}

      <p className="mt-3 text-center font-mono-data text-[9px] tracking-wider text-slate-500">예시 데이터</p>
    </div>
    </TechFrame>
  )
}

export function Hero() {
  const { isAuthenticated, userType } = useAuth()
  const isOrg = isAuthenticated && userType === 'organization'
  const navigate = useNavigate()

  return (
    <section id="hero"
      className="relative overflow-hidden bg-navy text-white"
      style={{ paddingTop: 'clamp(96px, 12vw, 160px)', paddingBottom: 'clamp(80px, 10vw, 160px)' }}
    >
      <div
        className="bg-blueprint pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(65% 55% at 15% 5%, rgba(0,212,255,0.13), transparent 62%),' +
            'radial-gradient(55% 50% at 90% 25%, rgba(59,130,246,0.14), transparent 65%),' +
            'radial-gradient(100% 60% at 50% 108%, rgba(10,16,32,0.6), transparent 72%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="eyebrow-tech">
            Digital Pilot Logbook — KR Format
          </p>

          <h1 className="mt-6 font-display text-white"
            style={{ fontSize: 'clamp(2.25rem, 1.6rem + 3.2vw, 3.5rem)', letterSpacing: '-0.04em', lineHeight: 1.02 }}
          >
            <span className="block font-medium text-slate-300" style={{ fontSize: '0.62em', letterSpacing: '-0.02em' }}>
              조종사를 위한
            </span>
            <span className="block font-black">디지털 로그북</span>
          </h1>

          <p className="mt-6 max-w-xl text-slate-300"
            style={{ fontSize: 'clamp(1rem, 0.94rem + 0.3vw, 1.125rem)', lineHeight: 1.7 }}
          >
            비행기록을 입력하면, 필요한 시간과 자격이 자동으로 정리돼요.
            <strong className="font-semibold text-white"> 국내 비행경력증명서 서식</strong> 기준 · 교관 전자서명 · CSV · PDF 내보내기 지원.
          </p>

          <TechFrame className="mt-8 inline-block bg-white/[0.03] backdrop-blur-sm">
            <div className="flex items-start gap-3 px-5 py-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-sky" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-ink">{HERO_STAT.value}</p>
                <p className="mt-1 text-sm text-slate-400">{HERO_STAT.label}</p>
              </div>
            </div>
          </TechFrame>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" onClick={() => navigate(isAuthenticated ? (isOrg ? '/dashboard' : '/logbook') : '/signup')}>
              {isAuthenticated ? (isOrg ? '대시보드 열기' : '내 로그북 열기') : '시작하기'}
            </Button>
            <Button size="lg"
              variant="outline"
              tone="neutral"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              기능 둘러보기
            </Button>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-go" aria-hidden="true" />
              개인 사용자 무료
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-go" aria-hidden="true" />
              가입 없이 둘러보기
            </span>
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md lg:ml-auto lg:mr-0">
          <LogbookPreview />
        </div>
      </div>
    </section>
  )
}
