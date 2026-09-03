// "내 자격 현황" — 실물 자격증 느낌의 카드 덱.
// v1.1: 트랙(조종사/경량/초경량)별로 덱 구성이 다르다(7장/4장/3장). 어떤 카드를 보여줄지는
// data/deckDefs.ts 에서만 정한다. 카드를 누르거나 옆으로 넘기면 다음 카드로 이동한다.

import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { RoleContent } from '../../data/content'
import { DECK_BY_TRACK, TRACK_SHARED_CATEGORIES } from '../../data/deckDefs'
import { PILOT_TRACK_LABEL, PILOT_TRACK_LEGAL_BASIS } from '../../lib/tracks'
import type { PilotTrack } from '../../lib/tracks'
import { certificateTrack, daysUntil } from '../../types/certificate'
import type { Certificate, CertificateCategory } from '../../types/certificate'

/** 자격 명칭 → 카드 칩용 짧은 코드 */
function certCode(cert: Certificate): string {
  const n = cert.name
  // 조종사
  if (n.includes('운송용')) return 'ATPL'
  if (n.includes('사업용') && !n.includes('유인자유기구')) return 'CPL'
  if (n.includes('자가용') && !n.includes('유인자유기구')) return 'PPL'
  if (n.includes('부조종사')) return 'MPL'
  if (n.includes('종류한정 - 비행기') || n === '비행기') return '비행기'
  if (n.includes('종류한정 - 헬리콥터') || n === '헬리콥터') return '헬리콥터'
  if (n.includes('수상다발')) return 'MES'
  if (n.includes('수상단발')) return 'SES'
  if (n.includes('육상다발') || n.includes('다발')) return 'MEL'
  if (n.includes('육상단발') || n.includes('단발')) return 'SEL'
  const type = /형식한정\(([^)]+)\)/.exec(n)
  if (type) return type[1]
  if (n.includes('계기비행증명 - 비행기')) return '비행기'
  if (n.includes('계기비행증명 - 헬리콥터')) return '헬리콥터'
  if (n.includes('계기')) return 'IR'
  if (n.includes('초급')) return '초급'
  if (n.includes('선임')) return '선임'
  if (n.includes('4등급')) return '4등급'
  if (n.includes('5등급')) return '5등급'
  if (n.includes('6등급')) return '6등급'
  // 경량
  if (n.includes('타면조종형')) return '타면조종형'
  if (n.includes('체중이동형')) return '체중이동형'
  if (n.includes('경량헬리콥터')) return '경량헬리콥터'
  if (n.includes('자이로플레인')) return '자이로플레인'
  if (n.includes('동력패러슈트')) return '동력패러슈트'
  if (n.includes('운전면허')) return '운전면허'
  // 초경량
  if (n.includes('동력비행장치')) return '동력비행장치'
  if (n.includes('회전익비행장치')) return '회전익'
  if (n.includes('무인멀티콥터')) return '무인멀티콥터'
  if (n.includes('무인비행기')) return '무인비행기'
  if (n.includes('무인헬리콥터')) return '무인헬리콥터'
  if (n.includes('무인수직이착륙기')) return '무인수직이착륙기'
  if (n.includes('실기평가')) return '실기평가조종자'
  if (n.includes('지도조종자')) return '지도조종자'
  if (n.includes('이러닝')) return '4종 이러닝'
  if (n.includes('교관과정')) return '교관과정'
  if (n.includes('평가과정')) return '평가과정'
  if (n.includes('보수교육')) return '보수교육'
  // 신체검사
  if (n.includes('제1종') || n.includes('1종')) return '1종'
  if (n.includes('제2종') || n.includes('2종')) return '2종'
  if (n.includes('제3종') || n.includes('3종')) return '3종'
  return n.replace(/\s/g, '').slice(0, 6)
}

interface MyCertificateStatusCardProps {
  certificates: Certificate[]
  roleContent?: RoleContent
  compact?: boolean
  /** 카드에 표기할 보유자 이름(계정 이름) */
  holderName?: string
  /** v1.1 — 어느 자격 구분의 덱을 보여줄지. 없으면 항공기. */
  track?: PilotTrack
  /** v1.1 — 이 구분의 총 비행시간(시간). 있으면 덱 헤더에 크게 표기 */
  totalHours?: number
}

export function MyCertificateStatusCard({ certificates, roleContent: _roleContent, compact = false, holderName, track = 'aircraft', totalHours }: MyCertificateStatusCardProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const DECK = DECK_BY_TRACK[track]

  // 트랙이 바뀌면 첫 카드로
  useEffect(() => {
    setActive(0)
    scrollerRef.current?.scrollTo({ left: 0 })
  }, [track])

  // 이 트랙의 자격만 — 단, 신체검사·무선통신사 등 공유 카테고리는 트랙과 무관하게 모두 포함
  const byCategory = useMemo(() => {
    const map = new Map<CertificateCategory, Certificate[]>()
    for (const cert of certificates) {
      const shared = TRACK_SHARED_CATEGORIES.includes(cert.category)
      if (!shared && certificateTrack(cert) !== track) continue
      if (!map.has(cert.category)) map.set(cert.category, [])
      map.get(cert.category)!.push(cert)
    }
    // 1종 신체검사 보유 시 2·3종 간주(별표 8) — 경량 덱의 "2종" 칩을 채워주기 위해 표시용으로만 처리
    return map
  }, [certificates, track])

  const goTo = (index: number) => {
    const el = scrollerRef.current
    if (!el) return
    const next = ((index % DECK.length) + DECK.length) % DECK.length
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    setActive(Math.min(DECK.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))))
  }

  return (
    <div data-mbaas-oid="ms8d0lv" className={`rounded-card border border-white/10 bg-white/[0.04] ${compact ? 'p-4' : 'p-cardpad'} backdrop-blur`}>
      <div data-mbaas-oid="mcshead" className="flex items-baseline justify-between gap-3">
        <div data-mbaas-oid="mcshead1" className="min-w-0">
          <p data-mbaas-oid="xczv64y" className="text-xs font-semibold uppercase tracking-wide text-sky">내 자격 현황</p>
          <p data-mbaas-oid="d2gdtsk" className="mt-0.5 truncate text-sm text-slate-400">
            {PILOT_TRACK_LABEL[track]} · 카드 {DECK.length}장 · {PILOT_TRACK_LEGAL_BASIS[track]}
          </p>
        </div>
        {totalHours !== undefined ? (
          <div data-mbaas-oid="mcstotal" className="shrink-0 text-right">
            <p data-mbaas-oid="mcstotal1" className="font-mono-data text-[10px] font-semibold uppercase tracking-wider text-slate-500">총 비행시간</p>
            <p data-mbaas-oid="mcstotal2" className="font-mono-data text-xl font-extrabold tabular-nums text-[#00D4FF]">
              {totalHours.toFixed(1)}<span data-mbaas-oid="mcstotal3" className="ml-0.5 text-xs font-semibold text-slate-400">h</span>
            </p>
          </div>
        ) : (
          <p data-mbaas-oid="mcshint" className="hidden shrink-0 text-[11px] text-slate-500 sm:block">← 카드 좌·우를 눌러 넘겨보세요 →</p>
        )}
      </div>

      <div
        data-mbaas-oid="mcsdeck" ref={scrollerRef}
        onScroll={handleScroll}
        className="mt-4 flex snap-x snap-mandatory overflow-x-auto rounded-card [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DECK.map((def) => {
          const held = byCategory.get(def.category) ?? []
          const heldCodes = [...new Set(held.map(certCode))]
          const dimCodes = def.standards.filter((code) => !heldCodes.includes(code)).slice(0, 3)
          const soonest = held
            .map((c) => (c.expiryDate ? daysUntil(c.expiryDate) : null))
            .filter((d): d is number => d !== null)
            .sort((a, b) => a - b)[0]
          return (
            <button
              data-mbaas-oid="mcscard" key={def.category}
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const isLeftHalf = e.clientX - rect.left < rect.width / 2
                goTo(active + (isLeftHalf ? -1 : 1))
              }}
              className={`relative w-full shrink-0 snap-center overflow-hidden rounded-card bg-gradient-to-br text-left ${def.gradient} ${compact ? 'min-h-[210px] p-4' : 'min-h-[240px] p-6'}`}
              aria-label={`${def.category} 카드 — 왼쪽을 누르면 이전, 오른쪽을 누르면 다음 자격`}
            >
              <div data-mbaas-oid="mcsc0" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.18),transparent_45%)]" />
              <div data-mbaas-oid="mcsc1" className="relative flex items-center justify-between gap-2">
                <p data-mbaas-oid="mcsc2" className="truncate font-mono-data text-[10px] tracking-wider text-white/60">[REF] {def.refText}</p>
                <span data-mbaas-oid="mcsc3" className={`shrink-0 rounded px-1.5 py-0.5 font-mono-data text-[10px] font-bold ${held.length > 0 ? 'bg-white/20 text-white' : 'bg-black/25 text-white/50'}`}>
                  {held.length > 0 ? `보유 ${held.length}` : '미등록'}
                </span>
              </div>
              <p data-mbaas-oid="mcsc4" className="relative mt-5 font-mono-data text-[10px] font-semibold tracking-[0.12em] text-white/70">{def.en}</p>
              <h3 data-mbaas-oid="mcsc5" className={`relative mt-1 font-display font-extrabold tracking-tight text-white ${compact ? 'text-xl' : 'text-2xl'}`}>
                {def.category}
              </h3>
              <p data-mbaas-oid="mcsc6" className="relative mt-4 font-mono-data text-[10px] font-bold tracking-[0.1em] text-white/75">NAME / IDENTIFIER</p>
              <p data-mbaas-oid="mcsc7" className={`relative truncate font-display font-extrabold text-white ${compact ? 'text-xl' : 'text-2xl'}`}>{holderName ?? '이름 미설정'}</p>
              <div data-mbaas-oid="mcsc9" className="relative mt-4 flex flex-wrap items-center gap-1.5">
                {heldCodes.map((code) => (
                  <span data-mbaas-oid="mcscA" key={code} className="rounded-md border border-white/35 bg-white/15 px-2 py-1 font-mono-data text-[11px] font-bold text-white">
                    {code}
                  </span>
                ))}
                {dimCodes.map((code) => (
                  <span data-mbaas-oid="mcscB" key={code} className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 font-mono-data text-[11px] font-semibold text-white/35">
                    {code}
                  </span>
                ))}
                {soonest !== undefined && (
                  <span data-mbaas-oid="mcscC" className={`ml-auto font-mono-data text-[11px] font-bold ${soonest < 0 ? 'text-rose-200' : soonest <= 30 ? 'text-amber-200' : 'text-white/70'}`}>
                    {soonest < 0 ? `만료 ${Math.abs(soonest)}일 경과` : `최단 D-${soonest}`}
                  </span>
                )}
              </div>
              {def.hint && (
                <p data-mbaas-oid="mcschint" className="relative mt-3 truncate text-[11px] text-white/55">{def.hint}</p>
              )}
            </button>
          )
        })}
      </div>

      <div data-mbaas-oid="mcsdots" className="mt-3 flex items-center justify-center gap-1.5">
        {DECK.map((def, index) => (
          <button
            data-mbaas-oid="mcsdot" key={def.category}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`${def.category} 카드로 이동`}
            className={`h-1.5 rounded-full transition-all ${active === index ? 'w-5 bg-sky' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
