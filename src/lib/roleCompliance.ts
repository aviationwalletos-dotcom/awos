// 비조종사 직군(정비사/관제사/운항관리사/드론조종자)의 법정 요건 참고 계산 유틸.
// 첨부 참고자료(gemini-code HTML)에 정리된 직군별 "implementedRules"(제목+법적 근거)를 기준으로,
// 로컬에 저장된 자격증(certificates)·업무기록(workLogEntries)·비행기록(logbook entries)만으로
// 확인 가능한 항목은 자동 계산하고, 확인이 어려운 항목은 참고 안내(info)로만 표시합니다.
//
// 주의: 이 계산은 참고자료를 근거로 한 자동 계산이며, 실제 법적 기준은 관련 법령 원문과 소속
// 기관 규정을 통해 반드시 재확인해야 합니다(조종사 커런시 계산과 동일한 성격의 참고 정보).

import type { Certificate, CertificateCategory } from '../types/certificate'
import { getCertificateStatus } from '../types/certificate'
import type { WorkLogEntry } from '../types/workLog'
import type { LogbookEntry } from '../types/logbook'
import { isUnmannedKind, vehicleKindLabel } from './tracks'

export type RequirementStatus = 'met' | 'unmet' | 'info'

export interface RequirementItem {
  key: string
  title: string
  /** 근거 법령(짧게 표시) */
  legalBasis: string
  status: RequirementStatus
  /** 배지에 표시할 라벨. 지정하지 않으면 status에 따른 기본 라벨을 사용합니다. */
  badgeLabel?: string
  /** 현재 상태를 설명하는 한 줄 안내 */
  detail: string
  /** 진행률(예: 지도조종자 누적시간)을 표시할 때만 사용 */
  progress?: { value: number; max: number; unit: string }
}

// ── 공통 헬퍼 ────────────────────────────────────────────────────────────

function parseDateSafe(dateStr: string | undefined): Date | null {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 자격증 중 조건(구분/명칭 포함)에 맞고, 만료되지 않은(또는 만료 개념이 없는) 것이 있는지 확인합니다. */
function hasValidCertificate(
  certificates: Certificate[],
  opts: { categories: CertificateCategory[]; nameIncludes?: string },
): boolean {
  return certificates.some((c) => {
    if (!opts.categories.includes(c.category)) return false
    if (opts.nameIncludes && !c.name.includes(opts.nameIncludes)) return false
    const status = getCertificateStatus(c.expiryDate)
    return status === 'valid' || status === 'warning' || status === 'urgent' || status === 'no_expiry'
  })
}

/** 최근 days일 이내에 조건(predicate)을 만족하는 업무기록이 있는지 확인합니다. */
function hasRecentWorkLogEntry(
  entries: WorkLogEntry[],
  days: number,
  predicate?: (entry: WorkLogEntry) => boolean,
): boolean {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return entries.some((e) => {
    const d = parseDateSafe(e.date)
    if (!d || d < cutoff) return false
    return !predicate || predicate(e)
  })
}

/** 최근 monthsBack개월 이내에 업무기록이 존재하는 서로 다른 월(YYYY-MM)의 개수를 셉니다. */
function countActiveMonthsWithin(entries: WorkLogEntry[], monthsBack: number): number {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - monthsBack)
  const months = new Set<string>()
  entries.forEach((e) => {
    const d = parseDateSafe(e.date)
    if (!d || d < cutoff) return
    months.add(e.date.slice(0, 7))
  })
  return months.size
}

// ── 정비사(AMT) ───────────────────────────────────────────────────────────

export function computeMechanicCompliance(
  certificates: Certificate[],
  workLogEntries: WorkLogEntry[],
): RequirementItem[] {
  const hasLegalTraining = hasValidCertificate(certificates, { categories: ['법정교육'] })
  const hasHumanFactorsTraining = hasValidCertificate(certificates, {
    categories: ['기타 자격', '법정교육'],
    nameIncludes: '인적요인',
  })
  const activeMonths = countActiveMonthsWithin(workLogEntries, 24)
  const recentExperienceMet = activeMonths >= 6

  return [
    {
      key: 'legal_training',
      title: '법정 보수교육 이수',
      legalBasis: '항공안전법 제32조의2',
      status: hasLegalTraining ? 'met' : 'unmet',
      detail: hasLegalTraining
        ? '자격증 관리 탭에 유효한 법정교육 이수 기록이 등록되어 있습니다.'
        : '유효한 법정교육 이수 기록이 확인되지 않았습니다. 자격증 관리 탭에서 "법정교육" 구분으로 등록해 주세요.',
    },
    {
      key: 'human_factors',
      title: '인적요인훈련(HF) 유효성',
      legalBasis: '항공안전법 시행규칙 제92조',
      status: hasHumanFactorsTraining ? 'met' : 'unmet',
      detail: hasHumanFactorsTraining
        ? '유효한 인적요인훈련(HF) 이수 기록이 확인되었습니다.'
        : '등록 필요: 자격증 관리 탭에서 명칭에 "인적요인"이 포함되도록 등록하면 자동으로 확인됩니다.',
    },
    {
      key: 'recent_experience',
      title: '정비 실무경력(최근경험)',
      legalBasis: '항공안전법 시행규칙 제94조(최근경험)',
      status: recentExperienceMet ? 'met' : 'unmet',
      detail: `최근 24개월 중 정비기록이 있는 월 ${activeMonths}개월 확인 (기준: 6개월 이상)`,
    },
  ]
}

// ── 관제사(ATC) ───────────────────────────────────────────────────────────

export function computeAtcCompliance(certificates: Certificate[], workLogEntries: WorkLogEntry[]): RequirementItem[] {
  const hasClass3Medical = hasValidCertificate(certificates, { categories: ['항공신체검사'], nameIncludes: '제3종' })
  const hasEpta = hasValidCertificate(certificates, { categories: ['기타 자격'], nameIncludes: 'EPTA' })
  const hasRecentDuty = hasRecentWorkLogEntry(workLogEntries, 180)

  return [
    {
      key: 'medical_class3',
      title: '제3종 항공신체검사 유효성',
      legalBasis: '항공안전법 제40조',
      status: hasClass3Medical ? 'met' : 'unmet',
      detail: hasClass3Medical
        ? '유효한 제3종 항공신체검사증명이 확인되었습니다.'
        : '유효한 제3종 항공신체검사증명이 확인되지 않았습니다. 자격증 관리 탭에서 등록해 주세요.',
    },
    {
      key: 'epta',
      title: '항공영어구사능력증명(EPTA) Level 4 유효성',
      legalBasis: '항공안전법 제45조',
      status: hasEpta ? 'met' : 'unmet',
      detail: hasEpta
        ? '유효한 EPTA 자격 기록이 확인되었습니다.'
        : '등록 필요: 자격증 관리 탭에서 명칭에 "EPTA"가 포함되도록 등록하면 자동으로 확인됩니다.',
    },
    {
      key: 'recent_duty',
      title: '관제 실무경험(180일 내 업무 실적)',
      legalBasis: '관제 실무경험 기준(참고)',
      status: hasRecentDuty ? 'met' : 'unmet',
      detail: hasRecentDuty
        ? '최근 180일 이내 관제 근무기록이 확인되었습니다.'
        : '최근 180일 이내 등록된 관제 근무기록이 없습니다. 관제 근무기록 관리 탭에서 기록을 추가해 주세요.',
    },
  ]
}

// ── 운항관리사(DISP) ──────────────────────────────────────────────────────

export function computeDispatcherCompliance(
  certificates: Certificate[],
  workLogEntries: WorkLogEntry[],
): RequirementItem[] {
  const hasSecurityTraining = hasValidCertificate(certificates, { categories: ['법정교육'], nameIncludes: '보안' })
  const hasFamiliarizationFlight = hasRecentWorkLogEntry(workLogEntries, 365, (e) => e.taskDetail.includes('관숙비행'))
  const hasDutyOverLimit = hasRecentWorkLogEntry(workLogEntries, 90, (e) => typeof e.hours === 'number' && e.hours > 10)

  return [
    {
      key: 'duty_time_limit',
      title: '법정 근무시간(연속 10시간 이내)',
      legalBasis: '항공안전법 제56조의2',
      status: hasDutyOverLimit ? 'unmet' : 'met',
      badgeLabel: hasDutyOverLimit ? '확인 필요' : undefined,
      detail: hasDutyOverLimit
        ? '최근 90일 이내 업무기록 중 근무시간이 10시간을 초과한 기록이 있습니다. 실제 연속 근무 여부를 확인해 주세요.'
        : '최근 90일 이내 업무기록에서 10시간을 초과한 근무 기록이 발견되지 않았습니다.',
    },
    {
      key: 'security_training',
      title: '정기 보안교육 수료',
      legalBasis: '항공보안법 제28조',
      status: hasSecurityTraining ? 'met' : 'unmet',
      detail: hasSecurityTraining
        ? '유효한 보안교육 이수 기록이 확인되었습니다.'
        : '유효한 보안교육 이수 기록이 확인되지 않았습니다. 자격증 관리 탭에서 명칭에 "보안"이 포함되도록 등록해 주세요.',
    },
    {
      key: 'familiarization_flight',
      title: '관숙비행(연 1회 조종실 탑승)',
      legalBasis: '운항기술기준(관숙비행)',
      status: hasFamiliarizationFlight ? 'met' : 'unmet',
      detail: hasFamiliarizationFlight
        ? '최근 1년 이내 "관숙비행" 관련 업무기록이 확인되었습니다.'
        : '최근 1년 이내 "관숙비행"이 포함된 업무기록이 없습니다. 업무기록 등록 시 내용에 "관숙비행"을 포함해 주세요.',
    },
  ]
}

// ── 초경량비행장치 조종자(ULTRALIGHT) ───────────────────────────────────────
// v1.1: 반드시 트랙 필터링된 entries(filterEntriesByTrack(entries, 'ultralight'))를 받아야 한다.
// 이전 computeDroneCompliance는 전체 로그를 합산해 C172·DA42 시간이 드론 누적시간으로 잡히는 오염이 있었다.

/** 초경량 기록을 유인/무인으로 나눠 누적시간을 계산한다 */
function splitUltralightHours(entries: LogbookEntry[]): { manned: number; unmanned: number; byKind: Record<string, number> } {
  let manned = 0
  let unmanned = 0
  const byKind: Record<string, number> = {}
  for (const e of entries) {
    const h = typeof e.blockTime === 'number' ? e.blockTime : 0
    const kind = e.vehicleKind ?? 'UNSPECIFIED'
    byKind[kind] = (byKind[kind] ?? 0) + h
    if (isUnmannedKind(e.vehicleKind)) unmanned += h
    else manned += h
  }
  return { manned, unmanned, byKind }
}

export function computeUltralightCompliance(entries: LogbookEntry[]): RequirementItem[] {
  const { manned, unmanned, byKind } = splitUltralightHours(entries)
  const topUnmannedKind = Object.entries(byKind)
    .filter(([k]) => isUnmannedKind(k))
    .sort((a, b) => b[1] - a[1])[0]
  const topMannedKind = Object.entries(byKind)
    .filter(([k]) => k !== 'UNSPECIFIED' && !isUnmannedKind(k))
    .sort((a, b) => b[1] - a[1])[0]

  const items: RequirementItem[] = []

  if (unmanned > 0 || !topMannedKind) {
    const kindLabel = topUnmannedKind ? (vehicleKindLabel(topUnmannedKind[0]) ?? '무인비행장치') : '무인비행장치'
    const hours = topUnmannedKind ? topUnmannedKind[1] : unmanned
    items.push({
      key: 'uas_instructor_hours',
      title: `지도조종자 요건 — ${kindLabel} 1종 100시간`,
      legalBasis: '무인비행장치 조종자 증명 운영세칙 별표 3',
      status: hours >= 100 ? 'met' : 'unmet',
      badgeLabel: hours >= 100 ? '등록 요건 충족' : undefined,
      detail: `${kindLabel} 누적 ${hours.toFixed(1)} / 100시간 (실기평가조종자는 150시간). 종류별로 따로 계산됩니다.`,
      progress: { value: hours, max: 100, unit: '시간' },
    })
    items.push({
      key: 'uas_experience_proof',
      title: '비행경력 증빙 방식',
      legalBasis: '운영세칙 제9조 · 제10조',
      status: 'info',
      detail: '응시·등록용 비행경력은 지도조종자 확인 + 교육기관 대표 증명(비행경력증명서)만 인정됩니다. 이 로그북의 무인 기록은 참고·보조 자료입니다.',
    })
  }

  if (manned > 0 || topMannedKind) {
    const kindLabel = topMannedKind ? (vehicleKindLabel(topMannedKind[0]) ?? '유인 초경량') : '유인 초경량'
    const hours = topMannedKind ? topMannedKind[1] : manned
    items.push({
      key: 'ul_instructor_hours',
      title: `지도조종자 요건 — ${kindLabel} 200시간`,
      legalBasis: '초경량비행장치 조종자 증명 운영세칙 별표 1의2',
      status: hours >= 200 ? 'met' : 'unmet',
      badgeLabel: hours >= 200 ? '등록 요건 충족' : undefined,
      detail: `${kindLabel} 누적 ${hours.toFixed(1)} / 200시간 (동력비행장치는 비행기 100시간, 회전익은 헬리콥터 100시간까지 합산 가능).`,
      progress: { value: hours, max: 200, unit: '시간' },
    })
  }

  items.push(
    {
      key: 'airworthiness',
      title: '기체 안전성 인증 유효성',
      legalBasis: '항공안전법 제124조',
      status: 'info',
      detail: '자동 계산이 어려운 항목입니다. 자격증 관리 탭에서 "기체 안전성 인증" 명칭으로 등록하면 만료 알림(D-30/D-7)을 받을 수 있습니다.',
    },
    {
      key: 'no_fly_zone',
      title: '비행금지·제한구역 검증',
      legalBasis: '항공안전법 제127조',
      status: 'info',
      detail: '비행 전 드론원스톱 등 공식 채널에서 비행금지·제한구역 여부를 반드시 직접 확인해 주세요.',
    },
  )
  return items
}

/** @deprecated v1.1 — 트랙 필터 없이 전체 로그를 합산했던 옛 함수. computeUltralightCompliance로 대체. */
export function computeDroneCompliance(entries: LogbookEntry[]): RequirementItem[] {
  return computeUltralightCompliance(entries)
}

// ── 경량항공기 조종사(LSA) ─────────────────────────────────────────────────

export function computeLsaCompliance(entries: LogbookEntry[]): RequirementItem[] {
  const total = entries.reduce((s, e) => s + (typeof e.blockTime === 'number' ? e.blockTime : 0), 0)
  const solo = entries.reduce((s, e) => s + (e.pilotingTime?.solo ?? 0), 0)
  const xc = entries.reduce((s, e) => s + (e.conditions?.crossCountry ?? 0), 0)
  return [
    {
      key: 'lsa_licence_hours',
      title: '경량항공기 조종사 응시경력 — 총 20시간',
      legalBasis: '시행규칙 별표 4 제2호',
      status: total >= 20 ? 'met' : 'unmet',
      detail: `경량항공기 누적 ${total.toFixed(1)} / 20시간 (항공기 조종사 자격 보유자는 단독 2시간 포함 5시간)`,
      progress: { value: total, max: 20, unit: '시간' },
    },
    {
      key: 'lsa_solo',
      title: '단독 비행 5시간',
      legalBasis: '시행규칙 별표 4 제2호',
      status: solo >= 5 ? 'met' : 'unmet',
      detail: `단독 ${solo.toFixed(1)} / 5시간`,
      progress: { value: solo, max: 5, unit: '시간' },
    },
    {
      key: 'lsa_xc',
      title: '야외비행 5시간 (120km 이상 · 1개 이상 다른 지점 이착륙)',
      legalBasis: '시행규칙 별표 4 제2호',
      status: xc >= 5 ? 'met' : 'unmet',
      detail: `야외 ${xc.toFixed(1)} / 5시간 — 타면조종형비행기·경량헬리콥터·자이로플레인만 해당. 거리·지점 조건은 직접 확인.`,
      progress: { value: xc, max: 5, unit: '시간' },
    },
    {
      key: 'lsa_night',
      title: '야간비행',
      legalBasis: '항공안전법 제120조 · 규칙 제311조',
      status: 'info',
      detail: '경량항공기는 야간비행이 금지됩니다. 이 트랙에서는 야간 카드·야간 커런시를 계산하지 않습니다.',
    },
  ]
}
