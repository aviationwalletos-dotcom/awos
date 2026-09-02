// "내 자격 현황" — 실물 자격증 느낌의 카드 덱.
// 카테고리(자격증명·한정·신체검사·교육증명·무선통신사)별 카드 1장씩, 카드를 누르거나
// 옆으로 넘기면 다음 카드로 이동한다(스크롤바는 숨김, 하단 점으로 위치 표시).

import React, { useMemo, useRef, useState } from 'react'

import type { RoleContent } from '../../data/content'
import { daysUntil } from '../../types/certificate'
import type { Certificate, CertificateCategory } from '../../types/certificate'

interface DeckCardDef {
  category: CertificateCategory
  en: string
  refText: string
  gradient: string
  standards: string[]
}

const DECK: DeckCardDef[] = [
  { category: '조종사 자격증명', en: 'AERONAUTICAL PERSONNEL', refText: 'ICAO Annex 1 · 항공안전법 제34조', gradient: 'from-[#0B2A6B] via-[#123C8F] to-[#1D4ED8]', standards: ['PPL', 'CPL', 'ATPL'] },
  { category: '한정', en: 'RATINGS', refText: '항공안전법 제37조', gradient: 'from-[#312E81] via-[#4C1D95] to-[#7C3AED]', standards: ['IR', 'ME'] },
  { category: '항공신체검사', en: 'MEDICAL CERTIFICATE', refText: '항공안전법 제40조', gradient: 'from-[#064E3B] via-[#047857] to-[#0D9488]', standards: ['1종', '2종', '3종'] },
  { category: '조종교육증명', en: 'FLIGHT INSTRUCTOR', refText: 'ICAO Annex 1', gradient: 'from-[#7C2D12] via-[#9A3412] to-[#D97706]', standards: ['초급', '선임'] },
  { category: '무선통신사', en: 'RADIO OPERATOR', refText: '전파법', gradient: 'from-[#155E75] via-[#0E7490] to-[#0891B2]', standards: [] },
]

/** 자격 명칭 → 카드 칩용 짧은 코드 */
function certCode(cert: Certificate): string {
  const n = cert.name
  if (n.includes('운송용')) return 'ATPL'
  if (n.includes('사업용')) return 'CPL'
  if (n.includes('자가용')) return 'PPL'
  if (n.includes('경량')) return 'LSA'
  if (n.includes('계기')) return 'IR'
  if (n.includes('다발')) return 'ME'
  if (n.includes('단발')) return 'SE'
  const type = /형식한정\(([^)]+)\)/.exec(n)
  if (type) return type[1]
  if (n.includes('제1종') || n.includes('1종')) return '1종'
  if (n.includes('제2종') || n.includes('2종')) return '2종'
  if (n.includes('제3종') || n.includes('3종')) return '3종'
  if (n.includes('초급')) return '초급'
  if (n.includes('선임')) return '선임'
  return n.replace(/\s/g, '').slice(0, 5)
}

interface MyCertificateStatusCardProps {
  certificates: Certificate[]
  roleContent?: RoleContent
  compact?: boolean
  /** 카드에 표기할 보유자 이름(계정 이름) */
  holderName?: string
  /** 카드에 표기할 회원 식별번호 */
  memberId?: string
}

export function MyCertificateStatusCard({ certificates, roleContent, compact = false, holderName, memberId }: MyCertificateStatusCardProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const byCategory = useMemo(() => {
    const map = new Map<CertificateCategory, Certificate[]>()
    for (const cert of certificates) {
      if (!map.has(cert.category)) map.set(cert.category, [])
      map.get(cert.category)!.push(cert)
    }
    return map
  }, [certificates])

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
            {roleContent ? `${roleContent.name} 자격 요약` : '등록된 자격 요약'}
          </p>
        </div>
        <p data-mbaas-oid="mcshint" className="hidden shrink-0 text-[11px] text-slate-500 sm:block">카드를 누르면 다음 자격 →</p>
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
              onClick={() => goTo(active + 1)}
              className={`relative w-full shrink-0 snap-center overflow-hidden rounded-card bg-gradient-to-br text-left ${def.gradient} ${compact ? 'min-h-[210px] p-4' : 'min-h-[240px] p-6'}`}
              aria-label={`${def.category} 카드, 누르면 다음 자격으로 넘어갑니다`}
            >
              <div data-mbaas-oid="mcsc0" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.18),transparent_45%)]" />
              <div data-mbaas-oid="mcsc1" className="relative flex items-center justify-between gap-2">
                <p data-mbaas-oid="mcsc2" className="truncate font-mono-data text-[10px] tracking-wider text-white/60">[REF] {def.refText}</p>
                <span data-mbaas-oid="mcsc3" className={`shrink-0 rounded px-1.5 py-0.5 font-mono-data text-[10px] font-bold ${held.length > 0 ? 'bg-white/20 text-white' : 'bg-black/25 text-white/50'}`}>
                  {held.length > 0 ? `보유 ${held.length}` : '미등록'}
                </span>
              </div>
              <p data-mbaas-oid="mcsc4" className="relative mt-5 font-mono-data text-[10px] font-semibold tracking-[0.22em] text-white/70">{def.en}</p>
              <h3 data-mbaas-oid="mcsc5" className={`relative mt-1 font-display font-extrabold tracking-tight text-white ${compact ? 'text-xl' : 'text-2xl'}`}>
                {def.category}
              </h3>
              <p data-mbaas-oid="mcsc6" className="relative mt-4 font-mono-data text-[10px] tracking-wider text-white/50">NAME / IDENTIFIER</p>
              <p data-mbaas-oid="mcsc7" className="relative truncate text-base font-bold text-white">{holderName ?? '이름 미설정'}</p>
              {memberId && <p data-mbaas-oid="mcsc8" className="relative font-mono-data text-xs font-semibold text-sky-200/90">{memberId}</p>}
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
