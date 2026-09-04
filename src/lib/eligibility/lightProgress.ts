// 경량항공기·초경량비행장치 응시경력 진척도 — 원문 기준으로 값을 고정한다.
//
// 근거
//   경량항공기: 시행규칙 별표 4 제2호 (2026-07-01 시행본 확인)
//   초경량 유인: 초경량비행장치 조종자 증명 운영세칙 별표 1 (2024.7.17.)
//   초경량 무인: 무인비행장치 조종자 증명 운영세칙 별표 2·3 (2025.4.21.), 제9조·제10조·제13조
//
// 무인은 "응시경력 = 교육기관(전문·사설) 지도조종자 확인 + 대표 증명, 지정 훈련용/사업 신고 기체, 출결관리시스템 확인 시간"만 인정된다.
// 앱의 개인 기록 합계는 그 증명서를 준비하기 위한 참고치이며 화면에 그 점을 고정 표시한다.

import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'
import { isUnmannedKind, vehicleKindLabel } from '../tracks'

export interface ProgressItem {
  id: string
  label: string
  required: number
  current: number
  unit: '시간' | '회'
  met: boolean
  note?: string
}

export interface ProgressCard {
  id: string
  title: string
  legalRef: string
  /** 여러 경로 중 하나만 충족하면 되는 경우 경로별로 나눈다 */
  paths: Array<{ id: string; label: string; items: ProgressItem[]; manual?: string[] }>
  /** 카드 전체에 붙는 안내 */
  notice?: string
  /** 개인 기록으로 증빙되지 않는 구분(무인) */
  referenceOnly?: boolean
}

const r1 = (v: number) => Math.round(v * 10) / 10
const item = (id: string, label: string, required: number, current: number, unit: '시간' | '회' = '시간', note?: string): ProgressItem => ({
  id,
  label,
  required,
  current: r1(current),
  unit,
  met: current >= required,
  note,
})

function official(entries: LogbookEntry[]): LogbookEntry[] {
  return entries.filter((e) => !(e.origin === 'flight_experience_certificate' && e.certificateApprovalStatus !== 'confirmed'))
}
const sum = (rows: LogbookEntry[], f: (e: LogbookEntry) => number | undefined) => rows.reduce((s, e) => s + (f(e) ?? 0), 0)

// ─────────────────────────────────────────────────────────────────────────────
// 경량항공기 (별표 4 제2호)
// ─────────────────────────────────────────────────────────────────────────────
const LSA_XC_KINDS = new Set(['LSA_AIRPLANE', 'LSA_HELICOPTER', 'LSA_GYROPLANE'])

export function buildLsaProgress(entries: LogbookEntry[], certificates: Certificate[]): ProgressCard[] {
  const rows = official(entries.filter((e) => e.vehicleClass === 'lsa'))
  const kinds = [...new Set(rows.map((e) => e.vehicleKind).filter((k): k is string => Boolean(k)))]
  const hasPilotLicence = certificates.some((c) => c.category === '조종사 자격증명')
  const hasAircraftCfi = certificates.some((c) => c.category === '조종교육증명')
  const hasLsaLicence = certificates.some((c) => c.category === '경량항공기 조종사 자격증명')
  const cards: ProgressCard[] = []
  const targets = kinds.length > 0 ? kinds : ['LSA_AIRPLANE']
  for (const kind of targets) {
    const k = rows.filter((e) => e.vehicleKind === kind || (!e.vehicleKind && kinds.length === 0))
    const total = sum(k, (e) => e.blockTime)
    const solo = sum(k, (e) => e.pilotingTime?.solo)
    const xc = sum(k, (e) => e.conditions?.crossCountry)
    const label = vehicleKindLabel(kind) ?? kind
    const paths: ProgressCard['paths'] = [
      {
        id: 'general',
        label: '일반 (나목)',
        items: [
          item('total', `${label} 비행경력`, 20, total),
          item('solo', '단독 비행경력', 5, solo),
          ...(LSA_XC_KINDS.has(kind) ? [item('xc', '야외 비행경력', 5, xc)] : []),
        ],
        manual: LSA_XC_KINDS.has(kind) ? ['120km 이상 구간에서 1개 이상 다른 지점 이륙·착륙 (수동 확인)'] : [],
      },
    ]
    if (hasPilotLicence) {
      paths.push({
        id: 'pilot',
        label: '항공기 조종사 자격증명 보유자 (다목)',
        items: [item('total5', `${label} 비행경력`, 5, total), item('solo2', '단독 비행경력', 2, solo)],
        manual: ['비행기 한정 → 조종형비행기 / 헬리콥터 한정 → 경량헬리콥터·자이로플레인'],
      })
    }
    cards.push({
      id: `lsa-${kind}`,
      title: `경량항공기 조종사 자격증명 — ${label}`,
      legalRef: '시행규칙 별표 4 제2호 가목',
      paths,
      notice: '전문교육기관 이수자도 같은 20시간 요건(완화 없음). 신체는 2종 항공신체검사 또는 자동차운전면허(제291조).',
    })
  }
  // 경량 조종교육증명
  const allTotal = sum(rows, (e) => e.blockTime)
  const dualFromLsaCfi = sum(rows, (e) => e.pilotingTime?.dualReceived)
  cards.push({
    id: 'lsa-cfi',
    title: '경량항공기 조종교육증명',
    legalRef: '시행규칙 별표 4 제2호 나목',
    paths: [
      ...(hasAircraftCfi
        ? [{ id: 'cfi', label: '항공기 조종교육증명 보유자', items: [item('lsa5', '해당 경량항공기 비행경력', 5, allTotal)], manual: ['사업용·운송용 조종사 한정 종류에 맞는 경량항공기'] }]
        : []),
      {
        id: 'lsa200',
        label: '경량 자격증명 보유 + 200시간',
        items: [item('lsa200', '경량항공기 종류별 비행경력', 200, allTotal, '시간', '조종형은 비행기 시간, 경량헬리콥터는 헬리콥터 시간 포함 가능'), item('dual15', '경량 조종교육증명 보유자와 비행훈련', 15, dualFromLsaCfi)],
        manual: ['조종교육 지상교육 이수 (국토교통부장관 인정)', ...(hasLsaLicence ? [] : ['경량항공기 조종사 자격증명 먼저 취득'])],
      },
      { id: 'course', label: '전문교육기관·제작사 조종교관과정 이수 (또는 외국정부 교육증명)', items: [], manual: ['이수증명서 제출'] },
    ],
  })
  return cards
}

// ─────────────────────────────────────────────────────────────────────────────
// 초경량 유인 (세칙 별표 1)
// ─────────────────────────────────────────────────────────────────────────────
export function buildUltralightMannedProgress(entries: LogbookEntry[], certificates: Certificate[]): ProgressCard[] {
  const rows = official(entries.filter((e) => e.vehicleClass === 'ultralight' && e.vehicleKind && !isUnmannedKind(e.vehicleKind)))
  const kinds = [...new Set(rows.map((e) => e.vehicleKind as string))]
  const hasPilotLicence = certificates.some((c) => c.category === '조종사 자격증명')
  const cards: ProgressCard[] = []
  for (const kind of kinds) {
    if (kind !== 'UL_POWERED' && kind !== 'UL_ROTOR') continue // 행글라이더·패러글라이더 등은 횟수·동승 요건이라 별도
    const k = rows.filter((e) => e.vehicleKind === kind)
    const total = sum(k, (e) => e.blockTime)
    const solo = sum(k, (e) => e.pilotingTime?.solo ?? (e.pilotingTime?.pic && !e.pilotingTime?.training ? e.pilotingTime.pic : 0))
    const label = vehicleKindLabel(kind) ?? kind
    const paths: ProgressCard['paths'] = [
      { id: 'general', label: '일반', items: [item('total', `${label} 총 비행시간`, 20, total), item('solo', '단독 비행', 5, solo)] },
    ]
    if (hasPilotLicence) paths.push({ id: 'pilot', label: '자가용·사업용·운송용 조종사 자격증명 보유자', items: [item('total5', `${label} 총 비행시간`, 5, total), item('solo2', '단독 비행', 2, solo)] })
    cards.push({
      id: `ulm-${kind}`,
      title: `초경량비행장치 조종자증명 — ${label}`,
      legalRef: '초경량비행장치 조종자 증명 운영세칙 별표 1',
      paths,
      notice: '만 14세 이상. 동력비행장치는 경량항공기(타면조종형) 탑승 시간도 포함. 신체: 항공신체검사증명 또는 2종 보통 이상 운전면허(제13조).',
    })
  }
  return cards
}

// ─────────────────────────────────────────────────────────────────────────────
// 초경량 무인 (세칙 별표 2·3) — 참고 진척도
// ─────────────────────────────────────────────────────────────────────────────
const UAS_KINDS = ['UAS_AIRPLANE', 'UAS_HELICOPTER', 'UAS_MULTICOPTER', 'UAS_VTOL', 'UAS_AIRSHIP']

/** 기체 카드의 종(1~4종) 라벨 또는 기록 비고에서 종을 읽는다 */
function classOf(e: LogbookEntry, vehicleClassLabel?: string): 1 | 2 | 3 | 4 | null {
  const src = vehicleClassLabel ?? e.notes ?? ''
  const m = /([1-4])종/.exec(src)
  return m ? (Number(m[1]) as 1 | 2 | 3 | 4) : null
}

function heldUasClass(certificates: Certificate[], kindLabel: string): 1 | 2 | 3 | 4 | null {
  const held = certificates
    .filter((c) => c.category === '초경량비행장치 조종자증명' && c.name.includes(kindLabel))
    .map((c) => /([1-4])종/.exec(c.name)?.[1])
    .filter(Boolean)
    .map(Number)
  return held.length > 0 ? (Math.min(...held) as 1 | 2 | 3 | 4) : null
}

export function buildUasProgress(entries: LogbookEntry[], certificates: Certificate[], vehicleClassById: Record<string, string | undefined> = {}): ProgressCard[] {
  const rows = official(entries.filter((e) => e.vehicleClass === 'ultralight' && e.vehicleKind && UAS_KINDS.includes(e.vehicleKind)))
  const kinds = [...new Set(rows.map((e) => e.vehicleKind as string))]
  const cards: ProgressCard[] = []
  for (const kind of kinds) {
    const label = vehicleKindLabel(kind) ?? kind
    const k = rows.filter((e) => e.vehicleKind === kind)
    const byClass = (cls: number) => sum(k.filter((e) => classOf(e, e.vehicleId ? vehicleClassById[e.vehicleId] : undefined) === cls), (e) => e.blockTime)
    const h1 = byClass(1), h2 = byClass(2), h3 = byClass(3)
    const heldClass = heldUasClass(certificates, label)
    const hasHeliOrMulti1 =
      (kind === 'UAS_HELICOPTER' && certificates.some((c) => c.category === '초경량비행장치 조종자증명' && c.name.includes('무인멀티콥터') && c.name.includes('1종'))) ||
      (kind === 'UAS_MULTICOPTER' && certificates.some((c) => c.category === '초경량비행장치 조종자증명' && c.name.includes('무인헬리콥터') && c.name.includes('1종')))

    if (kind === 'UAS_AIRSHIP') {
      cards.push({ id: 'uas-airship', title: '무인비행선 조종자증명', legalRef: '무인비행장치 조종자 증명 운영세칙 별표 2', referenceOnly: true, paths: [{ id: 'g', label: '일반', items: [item('t', '무인비행선 조종 시간', 20, sum(k, (e) => e.blockTime))] }] })
      continue
    }
    // 1종
    const p1: ProgressCard['paths'] = [{ id: 'g', label: '일반', items: [item('c1', `1종 ${label} 조종 시간`, 20, h1)] }]
    if (heldClass === 2) p1.push({ id: 'from2', label: '2종 자격 보유', items: [item('c1-15', `1종 ${label} 조종 시간`, 15, h1)], manual: ['2종 취득 시 2종 10시간 조건 충족자'] })
    if (heldClass === 3) p1.push({ id: 'from3', label: '3종 자격 보유', items: [item('c1-17', `1종 ${label} 조종 시간`, 17, h1)], manual: ['3종 취득 시 2·3종 6시간 조건 충족자'] })
    if (hasHeliOrMulti1) p1.push({ id: 'cross', label: kind === 'UAS_HELICOPTER' ? '1종 무인멀티콥터 자격 보유' : '1종 무인헬리콥터 자격 보유', items: [item('c1-10', `1종 ${label} 조종 시간`, 10, h1)] })
    cards.push({ id: `uas1-${kind}`, title: `1종 ${label} 조종자증명 (25kg 초과 ~ 150kg)`, legalRef: '무인비행장치 조종자 증명 운영세칙 별표 2', referenceOnly: true, paths: p1 })
    // 2종
    const p2: ProgressCard['paths'] = [{ id: 'g', label: '일반', items: [item('c12', `1종 또는 2종 ${label} 조종 시간`, 10, h1 + h2)] }]
    if (heldClass === 3) p2.push({ id: 'from3', label: '3종 자격 보유', items: [item('c2-7', `2종 ${label} 조종 시간`, 7, h2)] })
    cards.push({ id: `uas2-${kind}`, title: `2종 ${label} 조종자증명 (7kg 초과 ~ 25kg)`, legalRef: '별표 2', referenceOnly: true, paths: p2 })
    // 3종
    cards.push({ id: `uas3-${kind}`, title: `3종 ${label} 조종자증명 (2kg 초과 ~ 7kg)`, legalRef: '별표 2', referenceOnly: true, paths: [{ id: 'g', label: '일반', items: [item('c123', `1·2·3종 ${label} 조종 시간`, 6, h1 + h2 + h3)] }] })
    // 전문교관
    const hasClass1 = certificates.some((c) => c.category === '초경량비행장치 조종자증명' && c.name.includes(label) && c.name.includes('1종'))
    const isInstructor = certificates.some((c) => c.category === '지도조종자' && c.name.startsWith('지도조종자') && c.name.includes(label))
    const hasInstructorCourse = certificates.some((c) => c.category === '교육이수' && c.name.includes('조종교육교관과정'))
    const hasEvaluatorCourse = certificates.some((c) => c.category === '교육이수' && c.name.includes('실기평가과정'))
    cards.push({
      id: `uas-instr-${kind}`,
      title: `${label} 지도조종자 · 실기평가조종자 등록`,
      legalRef: '무인비행장치 조종자 증명 운영세칙 별표 3',
      referenceOnly: true,
      paths: [
        {
          id: 'instructor',
          label: '지도조종자 (비행시간 확인·조종교육)',
          items: [item('i100', `1종 ${label} 조종 시간`, 100, h1)],
          manual: [hasClass1 ? '✔ 1종 조종자증명 보유' : '1종 조종자증명 취득', hasInstructorCourse ? '✔ 조종교육교관과정 이수' : '조종교육교관과정 이수(규칙 제307조)', '만 18세 이상', '공단 전문교관 등록(별지 제3호)'],
        },
        {
          id: 'evaluator',
          label: '실기평가조종자 (+ 전문교육기관 자체 실기평가)',
          items: [item('e150', `1종 ${label} 조종 시간`, 150, h1)],
          manual: [isInstructor ? '✔ 지도조종자 등록됨' : '지도조종자로 먼저 등록', hasEvaluatorCourse ? '✔ 실기평가과정 이수' : '실기평가과정 이수(규칙 제307조)'],
        },
      ],
    })
  }
  return cards
}
