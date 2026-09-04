// "내 자격 현황" — 실물 자격증 느낌의 카드 덱.
// v1.1: 트랙(조종사/경량/초경량)별로 덱 구성이 다르다(7장/4장/3장). 어떤 카드를 보여줄지는
// data/deckDefs.ts 에서만 정한다. 카드를 누르거나 옆으로 넘기면 다음 카드로 이동한다.

import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { RoleContent } from '../../data/content'
import { DECK_BY_TRACK, TRACK_SHARED_CATEGORIES } from '../../data/deckDefs'
import type { PilotTrack } from '../../lib/tracks'
import { certificateTrack, daysUntil } from '../../types/certificate'
import type { Certificate, CertificateCategory } from '../../types/certificate'

/** 자격증명 등급 서열(여러 장 보유 시 최상위를 자격명으로) */
const LICENCE_RANK: Record<string, number> = { ATPL: 4, CPL: 3, MPL: 2, PPL: 1 }
const LICENCE_EN: Record<string, string> = {
  ATPL: 'AIRLINE TRANSPORT PILOT',
  CPL: 'COMMERCIAL PILOT',
  MPL: 'MULTI-CREW PILOT',
  PPL: 'PRIVATE PILOT',
}
const CLASS_KR: Record<string, string> = { SEL: '육상단발', MEL: '육상다발', SES: '수상단발', MES: '수상다발' }

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[1]}.${m[2]}.${m[3]}` : iso
}

/** 실물 자격증 XII 한정사항 표기(예: 비행기/육상다발, 계기비행증명(비행기), 조종교육증명 초급(비행기/육상단발)) */
function ratingLine(cert: Certificate): string[] {
  const n = cert.name
  const catKr = cert.aircraftCategory === 'HELICOPTER' ? '헬리콥터' : cert.aircraftCategory === 'AIRPLANE' ? '비행기' : ''
  switch (cert.category) {
    case '조종사 자격증명':
      if (!catKr) return []
      return [cert.classRating ? `${catKr}/${CLASS_KR[cert.classRating]}` : catKr]
    case '한정': {
      if (cert.aircraftCategory) {
        const base = cert.classRating ? `${catKr}/${CLASS_KR[cert.classRating]}` : catKr
        return cert.typeRating ? [base, `형식한정(${cert.typeRating})`] : [base]
      }
      if (n.includes('수상다발')) return ['비행기/수상다발']
      if (n.includes('수상단발')) return ['비행기/수상단발']
      if (n.includes('육상다발')) return ['비행기/육상다발']
      if (n.includes('육상단발')) return ['비행기/육상단발']
      const t = /형식한정\(([^)]+)\)/.exec(n)
      if (t) return [`형식한정(${t[1]})`]
      if (n.includes('헬리콥터')) return ['헬리콥터']
      if (n.includes('비행기')) return ['비행기']
      return [n]
    }
    case '계기비행증명':
      return [n.includes('헬리콥터') ? '계기비행증명(헬리콥터)' : '계기비행증명(비행기)']
    case '조종교육증명': {
      const grade = n.includes('선임') ? '선임' : '초급'
      const kind = n.includes('헬리콥터') ? '헬리콥터' : '비행기'
      return [`조종교육증명 ${grade}(${kind})`]
    }
    case '경량항공기 조종사 자격증명':
    case '초경량비행장치 조종자증명':
      return [n.replace(/^경량항공기 조종사 - |^초경량비행장치 조종자 - /, '').replace(/ 조종자$/, '')]
    case '경량항공기 조종교육증명':
    case '지도조종자':
      return [n]
    default:
      return []
  }
}

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
  const DECK = useMemo(
    () => DECK_BY_TRACK[track].filter((def) => !def.hideWhenEmpty || certificates.some((c) => c.category === def.category)),
    [track, certificates],
  )

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
          const held = [
            ...(byCategory.get(def.category) ?? []),
            ...(def.extraCategories ?? []).flatMap((c) => byCategory.get(c) ?? []),
          ]
          // 자격증명 자체에 기록된 종류·등급도 칩으로 보여준다(예: CPL · 비행기 · MEL)
          const heldCodes = [
            ...new Set(
              held.flatMap((c) => [
                certCode(c),
                ...(c.aircraftCategory ? [c.aircraftCategory === 'AIRPLANE' ? '비행기' : '헬리콥터'] : []),
                ...(c.classRating ? [c.classRating] : []),
              ]),
            ),
          ]
          const dimCodes = def.standards.filter((code) => !heldCodes.includes(code)).slice(0, 3)
          const soonestCert = held
            .filter((c) => c.expiryDate)
            .sort((a, b) => daysUntil(a.expiryDate as string) - daysUntil(b.expiryDate as string))[0]
          const soonest = soonestCert ? daysUntil(soonestCert.expiryDate as string) : undefined
          const soonestDate = soonestCert?.expiryDate

          // ── 마스터 카드(실물 자격증 구조) 데이터
          const licences = (byCategory.get(def.category) ?? []).slice().sort((a, b) => (LICENCE_RANK[certCode(b)] ?? 0) - (LICENCE_RANK[certCode(a)] ?? 0))
          const primary = licences[0]
          const primaryCode = primary ? certCode(primary) : ''
          const ratings = [...new Set(held.flatMap(ratingLine))]

          if (def.master) {
            return (
              <button
                data-mbaas-oid="mcsmaster" key={def.category}
                type="button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  goTo(active + (e.clientX - rect.left < rect.width / 2 ? -1 : 1))
                }}
                className={`relative w-full shrink-0 snap-center overflow-hidden rounded-card bg-gradient-to-br text-left ${def.gradient} ${compact ? 'p-4' : 'p-5'}`}
                aria-label={`${def.category} 카드`}
              >
                <div data-mbaas-oid="mcsm0" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.18),transparent_45%)]" aria-hidden="true" />
                <div data-mbaas-oid="mcsm1" className="relative flex items-center justify-between gap-2">
                  <p data-mbaas-oid="mcsm2" className="truncate font-mono-data text-[10px] tracking-wider text-white/60">[REF] {def.refText}</p>
                  <span data-mbaas-oid="mcsm3" className={`shrink-0 rounded px-1.5 py-0.5 font-mono-data text-[10px] font-bold ${primary ? 'bg-white/20 text-white' : 'bg-black/30 text-white/60'}`}>
                    {primary ? '보유' : '미등록'}
                  </span>
                </div>

                <div data-mbaas-oid="mcsm4" className="relative mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">I. 자격명 (TITLE OF LICENSE)</p>
                    <p className={`truncate font-display font-extrabold text-white ${compact ? 'text-lg' : 'text-xl'}`}>
                      {primary ? primary.name.split(' · ')[0].replace(/\([A-Z]+\)$/, '').trim() : def.category}
                    </p>
                    {primaryCode && LICENCE_EN[primaryCode] && (
                      <p className="font-mono-data text-[10px] tracking-wider text-white/70">({LICENCE_EN[primaryCode]})</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">II. 자격번호</p>
                    <p className="font-mono-data text-base font-extrabold tabular-nums text-white">{primary?.licenceNumber ?? '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">III. 성명 (NAME)</p>
                    <p className="truncate font-display text-base font-extrabold text-white">{holderName ?? '—'}</p>
                  </div>
                </div>

                <div data-mbaas-oid="mcsm5" className="relative mt-2 border-t border-white/15 pt-2">
                  <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">IV. 한정사항 (RATINGS)</p>
                  {ratings.length > 0 ? (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/90">{ratings.join(', ')}</p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-white/50">등록된 한정 없음 — 자격증명 등록 시 종류·등급을 함께 입력하세요</p>
                  )}
                </div>

                <div data-mbaas-oid="mcsm6" className="relative mt-2 grid grid-cols-[1fr_auto] gap-3 border-t border-white/15 pt-2">
                  <div className="min-w-0">
                    <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">V. 제한사항 (LIMITATIONS)</p>
                    <p className={`mt-0.5 truncate text-[11px] ${primary?.limitations ? 'text-white/85' : 'text-white/55'}`}>{primary?.limitations || '없음 (NIL)'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">VI. 발급일</p>
                    <p className="font-mono-data text-[11px] font-bold text-white">{fmtDate(primary?.issuedDate) || '—'}</p>
                    <p className="truncate text-[10px] text-white/60">{primary?.issuer ?? ''}</p>
                  </div>
                </div>
              </button>
            )
          }

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
                  {held.length > 0 ? '등록' : '미등록'}
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
              </div>
              {soonest !== undefined && soonestDate && (
                <div data-mbaas-oid="mcscexp" className="relative mt-3 flex items-end justify-between gap-2 border-t border-white/15 pt-2">
                  <div>
                    <p className="font-mono-data text-[9px] font-bold tracking-[0.12em] text-white/60">만료일 (VALID UNTIL)</p>
                    <p className="font-mono-data text-base font-extrabold tabular-nums text-white">{fmtDate(soonestDate)}</p>
                  </div>
                  <span data-mbaas-oid="mcscC" className={`rounded px-2 py-1 font-mono-data text-sm font-extrabold ${soonest < 0 ? 'bg-rose-500/30 text-white' : soonest <= 30 ? 'bg-amber-400/30 text-white' : 'bg-white/15 text-white'}`}>
                    {soonest < 0 ? `만료 ${Math.abs(soonest)}일 경과` : `D-${soonest}`}
                  </span>
                </div>
              )}
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
