// 로그북 첫 화면 "다음 목표" — 보유 자격에 따라 어떤 진척도를 보여줄지 정한다.
//
// 무인:  (자격 없음) 날린 기체 종의 조종자증명 → (1종 보유) 지도조종자 100시간 → (지도조종자 등록) 실기평가조종자 150시간 → (등록) 완료
//        3종 보유면 2종(7시간), 2종 보유면 1종(15시간) 경로를 우선 보여준다.
// 유인:  조종자증명 → 지도조종자(200시간, 세칙 별표 1의2)
// 경량:  경량 자격증명 → 경량 조종교육증명
// 기록이 없으면 빈 목록(제목만 표시).

import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'
import { isUnmannedKind, vehicleKindLabel } from '../tracks'
import { buildLsaProgress, buildUasProgress, buildUltralightMannedProgress } from './lightProgress'
import type { ProgressCard, ProgressItem } from './lightProgress'

export interface NextGoal {
  id: string
  /** 예: "1종 무인멀티콥터 조종자증명" */
  title: string
  /** 대표 진척 항목(막대 1개) */
  primary: ProgressItem | null
  /** 완료(보유)면 true — 시간과 함께 "완료"로 표시 */
  done: boolean
  /** 부가 조건 요약 */
  hint?: string
  referenceOnly?: boolean
}

function firstPathItems(card: ProgressCard, preferPathId?: string): ProgressItem | null {
  const path = (preferPathId && card.paths.find((p) => p.id === preferPathId)) || card.paths[0]
  return path?.items[0] ?? null
}

export function computeNextGoals(track: 'lsa' | 'ultralight', entries: LogbookEntry[], certificates: Certificate[], vehicleClassById: Record<string, string | undefined> = {}): NextGoal[] {
  const goals: NextGoal[] = []
  const rows = entries.filter((e) => e.vehicleClass === track)
  if (rows.length === 0) return goals

  if (track === 'lsa') {
    const cards = buildLsaProgress(entries, certificates)
    const hasLicence = certificates.some((c) => c.category === '경량항공기 조종사 자격증명')
    const hasCfi = certificates.some((c) => c.category === '경량항공기 조종교육증명')
    if (!hasLicence) {
      for (const c of cards.filter((c) => c.id.startsWith('lsa-') && c.id !== 'lsa-cfi')) {
        const hasPilot = c.paths.some((p) => p.id === 'pilot')
        goals.push({ id: c.id, title: c.title.replace('경량항공기 조종사 자격증명 — ', '경량 조종사 자격증명 · '), primary: firstPathItems(c, hasPilot ? 'pilot' : 'general'), done: false, hint: hasPilot ? '항공기 자격 보유자 경로(5시간)' : '단독 5시간 · 야외 5시간 포함' })
      }
    } else if (!hasCfi) {
      const c = cards.find((c) => c.id === 'lsa-cfi')
      if (c) goals.push({ id: c.id, title: '경량항공기 조종교육증명', primary: firstPathItems(c, c.paths.some((p) => p.id === 'cfi') ? 'cfi' : 'lsa200'), done: false, hint: '지상교육 + 15시간 훈련' })
    } else {
      goals.push({ id: 'lsa-done', title: '경량항공기 조종교육증명', primary: null, done: true })
    }
    return goals
  }

  // ── 초경량
  const kinds = [...new Set(rows.map((e) => e.vehicleKind).filter((k): k is string => Boolean(k)))]
  const manned = buildUltralightMannedProgress(entries, certificates)
  const uas = buildUasProgress(entries, certificates, vehicleClassById)
  for (const kind of kinds) {
    const label = vehicleKindLabel(kind) ?? kind
    if (!isUnmannedKind(kind)) {
      const has = certificates.some((c) => c.category === '초경량비행장치 조종자증명' && c.name.includes(label))
      const card = manned.find((c) => c.id === `ulm-${kind}`)
      if (!has && card) {
        const hasPilot = card.paths.some((p) => p.id === 'pilot')
        goals.push({ id: card.id, title: `${label} 조종자증명`, primary: firstPathItems(card, hasPilot ? 'pilot' : 'general'), done: false, hint: '단독 비행 포함' })
      } else if (has) {
        const hoursTotal = rows.filter((e) => e.vehicleKind === kind).reduce((s, e) => s + e.blockTime, 0)
        const isInstructor = certificates.some((c) => c.category === '지도조종자' && c.name.includes(label))
        goals.push(
          isInstructor
            ? { id: `ulm-done-${kind}`, title: `${label} 지도조종자`, primary: null, done: true }
            : { id: `ulm-instr-${kind}`, title: `${label} 지도조종자`, primary: { id: 'i200', label: `${label} 총 비행시간`, required: 200, current: Math.round(hoursTotal * 10) / 10, unit: '시간', met: hoursTotal >= 200 }, done: false, hint: '세칙 별표 1의2 · 만 20세 · 교관과정 이수' },
        )
      }
      continue
    }
    // 무인: 보유 등급 판정
    const held = certificates.filter((c) => c.category === '초경량비행장치 조종자증명' && c.name.includes(label)).map((c) => Number(/([1-4])종/.exec(c.name)?.[1] ?? 0)).filter((n) => n > 0)
    const best = held.length > 0 ? Math.min(...held) : null
    const isInstructor = certificates.some((c) => c.category === '지도조종자' && c.name.startsWith('지도조종자') && c.name.includes(label))
    const isEvaluator = certificates.some((c) => c.category === '지도조종자' && c.name.startsWith('실기평가조종자') && c.name.includes(label))
    const instrCard = uas.find((c) => c.id === `uas-instr-${kind}`)
    if (best === 1) {
      if (isEvaluator) goals.push({ id: `uas-done-${kind}`, title: `${label} 실기평가조종자`, primary: null, done: true, referenceOnly: true })
      else if (isInstructor && instrCard) goals.push({ id: `uas-eval-${kind}`, title: `${label} 실기평가조종자`, primary: instrCard.paths[1]?.items[0] ?? null, done: false, hint: '실기평가과정 이수 + 공단 등록', referenceOnly: true })
      else if (instrCard) goals.push({ id: `uas-instr-${kind}`, title: `${label} 지도조종자`, primary: instrCard.paths[0]?.items[0] ?? null, done: false, hint: '조종교육교관과정 이수 + 공단 등록', referenceOnly: true })
      continue
    }
    // 자격 없음 또는 2·3종 보유 → 다음 등급
    const flownClasses = rows
      .filter((e) => e.vehicleKind === kind)
      .map((e) => Number(/([1-4])종/.exec((e.vehicleId && vehicleClassById[e.vehicleId]) || e.notes || '')?.[1] ?? 0))
      .filter((n) => n > 0)
    const targetClass = best === 2 ? 1 : best === 3 ? 2 : flownClasses.length > 0 ? Math.min(...flownClasses) : 1
    const card = uas.find((c) => c.id === `uas${targetClass}-${kind}`)
    if (!card) continue
    const preferPath = best === 2 ? 'from2' : best === 3 ? (targetClass === 2 ? 'from3' : 'from3') : 'g'
    goals.push({ id: card.id, title: `${targetClass}종 ${label} 조종자증명`, primary: firstPathItems(card, preferPath), done: false, hint: best ? `${best}종 보유 → 완화 경로` : undefined, referenceOnly: true })
  }
  return goals
}
