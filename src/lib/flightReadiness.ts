// 비행 적합성(커런시) 공용 계산 로직
// "커런시 관리" 탭(CurrencyDashboard)과 히어로의 "실시간 비행 적합성(GO-TO-FLY)" 패널이
// 서로 다른 화면이지만 항상 같은 기준으로 판정하도록, 판정 로직을 이 파일 하나로 모읍니다.
// UI(배지 문구, 색상 등)는 각 컴포넌트에 남기고, 이 파일은 순수 계산만 담당합니다.

import type { LogbookEntry } from '../types/logbook'
import { AIRCRAFT_CLASS_LABEL, inferAircraftClass } from './aircraftClass'
import type { AircraftClass } from './aircraftClass'
import type { Certificate, CertificateStatus } from '../types/certificate'
import { getCertificateStatus } from '../types/certificate'

// ── 날짜 유틸 ────────────────────────────────────────────────────────────
// 모든 계산은 "오늘(자정)"을 기준으로 소급 기간을 구합니다.

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysAgo(from: Date, days: number): Date {
  const d = startOfDay(from)
  d.setDate(d.getDate() - days)
  return d
}

export function monthsAgo(from: Date, months: number): Date {
  const d = startOfDay(from)
  d.setMonth(d.getMonth() - months)
  return d
}

export function parseEntryDate(dateStr: string): Date | null {
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  return startOfDay(target)
}

// start <= date <= today 범위(미래 날짜 기록은 집계에서 제외)
function isWithinWindow(dateStr: string, start: Date, today: Date): boolean {
  const target = parseEntryDate(dateStr)
  if (!target) return false
  return target.getTime() >= start.getTime() && target.getTime() <= today.getTime()
}

function isWithinMonthsFromToday(dateOrNull: string | null | undefined, today: Date, months: number): boolean {
  if (!dateOrNull) return false
  const target = parseEntryDate(dateOrNull)
  if (!target) return false
  if (target.getTime() > today.getTime()) return false
  const cutoff = monthsAgo(today, months)
  return target.getTime() >= cutoff.getTime()
}

/** 항공신체검사 상태가 "지금 유효"한지 판정합니다(만료된 경우/미등록은 유효하지 않음). */
export function isMedicalStatusValid(status: CertificateStatus | null): boolean {
  return status !== null && status !== 'expired'
}

// ── 공용 계산 결과 타입 ─────────────────────────────────────────────────────

export interface MedicalReadiness {
  class1: Certificate | null
  class2: Certificate | null
  /** 제3종 항공신체검사증명(관제사 등 비조종 직무 자격 요건 확인용, 항공안전법 제40조). 조종 자격 판정(general/instructor)에는 사용하지 않습니다. */
  class3: Certificate | null
  class1Status: CertificateStatus | null
  class2Status: CertificateStatus | null
  class3Status: CertificateStatus | null
  /** 제1종이 없거나 만료된 경우 true(교관/사업용 조종사는 제1종이 반드시 유효해야 함) */
  class1Missing: boolean
}

export interface RecencyByClass {
  aircraftClass: AircraftClass
  landingCount: number
  nightLandingCount: number
  baseMet: boolean
  nightMet: boolean
  /**
   * 이 등급의 한정(육상단발/다발/회전익)을 승인된 자격증으로 보유했는가 — 항공안전법 제36조(업무범위)·제37조(한정).
   * false 면 이 등급은 GO 가 아니라 "조종연습만 가능(제46조①1호, 감독 필요)". 한정 카드가 하나도 없으면 null(판정 보류).
   */
  ratingHeld: boolean | null
  /** 커런시가 끊겼을 때 회복 조건 — 운항기술기준 8.2.4 가 */
  recoveryHint: string | null
}

export interface RecencyReadiness {
  recentCount: number
  landingCount: number
  nightLandingCount: number
  baseMet: boolean
  nightMet: boolean
  /** v1.1 — 적용된 기간(일). 일반 180 / 여객·2인조종·운송사업 90 (운항기술기준 8.2.2) */
  windowDays: number
  /** 착륙 횟수 기재가 없어(해외 증명서 등) 판정에서 제외한 기록 수 */
  unknownLandingCount: number
  /** 야간 1회 요건이 법정으로 붙는지(8.2.2 가항 = 여객·2인조종·운송사업만). 일반 운항은 참고치 */
  nightRequired: boolean
  /** 8.2.2 "동일 등급 항공기 형식" — 최근 비행에 나타난 등급별 판정 */
  byClass: RecencyByClass[]
  /** 판정에서 뺀 시뮬레이터(FTD·BATD) 기록 수 — 지정 장치가 아니면 착륙으로 안 세요 */
  excludedSimCount: number
  /** 전체 커런시가 끊겼을 때 회복 조건(8.2.4 가). 유지 중이면 null */
  recoveryHint: string | null
}

export interface IfrReadiness {
  recentCount: number
  approachCount: number
  instrumentHours: number
  flownMet: boolean
  checkDateValid: boolean
  met: boolean
}

export interface InstructorReadiness {
  recentCount: number
  instructorHours: number
  flownMet: boolean
  isNewInstructorGrace: boolean
  /** 유예 판정에 쓴 조종교육증명 최초 발급일(등록된 자격증에서 파생) */
  firstCertDate: string | null
  met: boolean
}

export interface FlightReadinessOverrides {
  instrumentCheckDate?: string | null
  instructorFirstCertDate?: string | null
  instructorRecoveryChecked?: boolean
  /** v1.1 — 운항형태. commercial이면 최근 비행경험 기간이 180일 → 90일로 줄고 야간 요건이 붙는다. */
  operationType?: 'general' | 'commercial'
}

export interface FlightReadinessResult {
  today: Date
  medical: MedicalReadiness
  recency: RecencyReadiness
  ifr: IfrReadiness
  instructor: InstructorReadiness
}

/**
 * 항공신체검사(제1종/제2종) 유효 여부, 최근 비행경험(180일), 계기비행 경험(IFR, 6개월),
 * 조종교육 비행경험(교관, 1년) 커런시를 한 번에 계산합니다. "커런시 관리" 탭과 히어로의
 * 비행 적합성 패널이 동일한 판정 기준을 갖도록 이 함수 하나만 사용합니다.
 */
export function computeFlightReadiness(
  entries: LogbookEntry[],
  certificates: Certificate[],
  overrides: FlightReadinessOverrides = {},
): FlightReadinessResult {
  const today = startOfDay(new Date())
  const { instrumentCheckDate, instructorRecoveryChecked = false, operationType = 'general' } = overrides
  // v1.1 — 조종교육증명 최초 취득일은 별도 입력 대신 등록된 조종교육증명 중 가장 이른 발급일에서 파생한다.
  const instructorFirstCertDate =
    overrides.instructorFirstCertDate ??
    certificates
      .filter((c) => c.category === '조종교육증명' && c.issuedDate)
      .map((c) => c.issuedDate as string)
      .sort()[0] ??
    null

  // 0) 항공신체검사 커런시
  const meds = certificates.filter((c) => c.category === '항공신체검사')
  function findLatestByKeyword(keyword: string): Certificate | null {
    const matches = meds.filter((c) => c.name.includes(keyword))
    if (matches.length === 0) return null
    return matches.reduce((latest, c) => (c.issuedDate > latest.issuedDate ? c : latest))
  }
  const class1 = findLatestByKeyword('제1종')
  const class2 = findLatestByKeyword('제2종')
  const class3 = findLatestByKeyword('제3종')
  const class1Status = class1 ? getCertificateStatus(class1.expiryDate) : null
  const class2Status = class2 ? getCertificateStatus(class2.expiryDate) : null
  const class3Status = class3 ? getCertificateStatus(class3.expiryDate) : null
  const class1Missing = !class1 || class1Status === 'expired'
  const medical: MedicalReadiness = {
    class1,
    class2,
    class3,
    class1Status,
    class2Status,
    class3Status,
    class1Missing,
  }

  // 1) 최근 비행경험 — 운항기술기준 8.2.2
  //    가. 여객 운송 또는 2인 이상 조종 항공기의 기장: 90일 내 동일 등급 형식 3회 이착륙 + 야간 1회 (시행규칙 제121조도 90일)
  //    나. 그 외 기장: 180일 내 동일 등급 형식 3회 이착륙 (야간 요건 없음 → 참고치로만 표시)
  const windowDays = operationType === 'commercial' ? 90 : 180
  const nightRequired = operationType === 'commercial'
  const recencyStart = daysAgo(today, windowDays)
  // 8.2.2 "동일 등급 항공기 형식 또는 모의비행장치", 제121조③ "지방항공청장이 지정한 모의비행훈련장치".
  // 시뮬레이터 기록은 FFS(모의비행장치)만 착륙에 넣고, FTD·BATD 는 뺀다(지정 장치가 아닐 가능성이 커서 보수적으로).
  const countsForRecency = (e: LogbookEntry) => !((e.groundTrainerTime ?? 0) > 0 && e.simDevice && e.simDevice !== 'FFS')
  const recencyRecent = entries.filter((e) => isWithinWindow(e.date, recencyStart, today) && countsForRecency(e))
  const excludedSimCount = entries.filter((e) => isWithinWindow(e.date, recencyStart, today) && !countsForRecency(e)).length
  const landingCount = recencyRecent.reduce((sum, e) => sum + (e.dayLandings ?? 0) + (e.nightLandings ?? 0), 0)
  const nightLandingCount = recencyRecent.reduce((sum, e) => sum + (e.nightLandings ?? 0), 0)
  // 착륙 횟수 "기재 없음"(undefined) 기록 — 해외 증명서(AG·Part 61 타임빌딩)처럼 착륙 수가 없는 이월 기록. 0 으로 세지 않고 제외한 뒤 건수를 알린다.
  const unknownLandingCount = recencyRecent.filter((e) => e.dayLandings === undefined && e.nightLandings === undefined).length
  const baseMet = landingCount >= 3
  const nightMet = baseMet && (!nightRequired || nightLandingCount >= 1)
  // 등급별(8.2.2 "동일 등급") — 최근 24개월 안에 비행한 등급마다 따로 센다. 등급 미기재 기록은 모든 등급에 합산(보수적)
  const classWindow = daysAgo(today, 730)
  const classesFlown = [...new Set(entries.filter((e) => isWithinWindow(e.date, classWindow, today)).map(inferAircraftClass))].filter((c): c is Exclude<AircraftClass, 'unknown'> => c !== 'unknown')
  // 한정 보유 — 승인된 "한정" 카드의 등급. 하나도 없으면 판정 보류(null), 있으면 등급별로 확인(제36조·제37조).
  const ratingCards = certificates.filter((c) => c.category === '한정' && c.approvalStatus === 'approved' && getCertificateStatus(c.expiryDate) !== 'expired')
  const heldClasses = new Set<AircraftClass>()
  for (const c of ratingCards) {
    if (c.aircraftCategory === 'HELICOPTER') heldClasses.add('ROTOR')
    else if (c.classRating === 'MEL' || c.classRating === 'MES') heldClasses.add('MEL')
    else if (c.classRating === 'SEL' || c.classRating === 'SES') heldClasses.add('SEL')
  }
  const recoveryHint = '회복하려면 조종교육증명을 받은 교관과 같은 등급 항공기(또는 모의비행장치)로 2시간 이상, 이착륙 3회 이상 비행교육을 받으세요(운항기술기준 8.2.4 가).'
  const byClass: RecencyByClass[] = classesFlown.map((cls) => {
    const rows = recencyRecent.filter((e) => {
      const c = inferAircraftClass(e)
      return c === cls || c === 'unknown'
    })
    const l = rows.reduce((s, e) => s + (e.dayLandings ?? 0) + (e.nightLandings ?? 0), 0)
    const n = rows.reduce((s, e) => s + (e.nightLandings ?? 0), 0)
    const met = l >= 3
    return {
      aircraftClass: cls,
      landingCount: l,
      nightLandingCount: n,
      baseMet: met,
      nightMet: met && (!nightRequired || n >= 1),
      ratingHeld: ratingCards.length === 0 ? null : heldClasses.has(cls),
      recoveryHint: met ? null : recoveryHint,
    }
  })
  const recency: RecencyReadiness = {
    recentCount: recencyRecent.length,
    landingCount,
    nightLandingCount,
    baseMet,
    nightMet,
    windowDays,
    unknownLandingCount,
    nightRequired,
    byClass,
    excludedSimCount,
    recoveryHint: baseMet ? null : recoveryHint,
  }

  // 2) 계기비행 경험(IFR) — 6개월(월 단위 소급)
  const ifrStart = monthsAgo(today, 6)
  const ifrRecent = entries.filter((e) => isWithinWindow(e.date, ifrStart, today))
  const approachCount = ifrRecent.reduce((sum, e) => sum + (e.instrumentApproaches ?? 0), 0)
  const instrumentHours = ifrRecent.reduce(
    (sum, e) => sum + (e.conditions?.actualInstrument ?? 0) + (e.conditions?.simulatedInstrument ?? 0),
    0,
  )
  const ifrFlownMet = approachCount >= 6 && instrumentHours >= 6
  const ifrCheckDateValid = isWithinMonthsFromToday(instrumentCheckDate, today, 6)
  const ifr: IfrReadiness = {
    recentCount: ifrRecent.length,
    approachCount,
    instrumentHours,
    flownMet: ifrFlownMet,
    checkDateValid: ifrCheckDateValid,
    met: ifrFlownMet || ifrCheckDateValid,
  }

  // 3) 조종교육 비행경험(교관) — 1년
  const instructorStart = monthsAgo(today, 12)
  const instructorRecent = entries.filter((e) => isWithinWindow(e.date, instructorStart, today))
  const instructorHours = instructorRecent.reduce((sum, e) => sum + (e.pilotingTime?.flightInstructor ?? 0), 0)
  const instructorFlownMet = instructorHours >= 10
  const isNewInstructorGrace = isWithinMonthsFromToday(instructorFirstCertDate, today, 12)
  const instructor: InstructorReadiness = {
    recentCount: instructorRecent.length,
    instructorHours,
    flownMet: instructorFlownMet,
    isNewInstructorGrace,
    firstCertDate: instructorFirstCertDate,
    met: instructorFlownMet || instructorRecoveryChecked,
  }

  return { today, medical, recency, ifr, instructor }
}

// ── 4가지 비행 가능 상태 판정 ────────────────────────────────────────────────

export type ReadinessStateKey = 'general' | 'night' | 'ifr' | 'instructor'

export interface ReadinessState {
  key: ReadinessStateKey
  label: string
  met: boolean
  /** 미충족 시 부족한 조건 사유 목록(충족 시 빈 배열) */
  reasons: string[]
  /**
   * 등급별 판정(일반·야간). 8.2.2 는 "동일 등급"이 요건이므로 단발·다발·회전익을 따로 본다.
   * 하나라도 충족이면 met=true 지만, 안 되는 등급이 있으면 partial=true 로 표시해 오해를 막는다.
   */
  byClass?: Array<{ label: string; met: boolean }>
  partial?: boolean
}

export interface FlightReadinessSummary {
  /** "일반 비행 가능" 여부를 기준으로 한 종합 GO/NO-GO 판정 */
  overallGo: boolean
  states: ReadinessState[]
}

/**
 * computeFlightReadiness() 결과와 보유 자격증 목록을 바탕으로 4가지 비행 가능 상태(일반/야간/
 * 계기비행(PIC)/조종교육)를 조합 판정합니다. 각 상태는 상위 조건(예: 일반 비행 가능)을 포함해
 * 누적으로 검사하며, 미충족 사유를 사람이 읽을 수 있는 문장으로 함께 반환합니다.
 */
export function computeReadinessStates(
  result: FlightReadinessResult,
  certificates: Certificate[],
): FlightReadinessSummary {
  const { medical, recency, ifr, instructor } = result

  const class1Valid = isMedicalStatusValid(medical.class1Status)
  const class2Valid = isMedicalStatusValid(medical.class2Status)
  const medicalValid = class1Valid || class2Valid

  const hasInstrumentRating = certificates.some(
    (c) => c.category === '한정' && c.name.includes('계기한정'),
  )
  const hasInstructorCertificate = certificates.some((c) => c.category === '조종교육증명')
  const instructorRecencyMet = instructor.met || instructor.isNewInstructorGrace

  // 1) 일반 비행 가능 — 등급별(단발/다발/회전익)로 본다. 최근 24개월 안에 탄 등급이 둘 이상이면 각 등급을 따로 판정하고,
  //    하나라도 되면 "가능"이되 안 되는 등급이 있으면 partial(일부)로 표시한다(운항기술기준 8.2.2 "동일 등급").
  const classRows = recency.byClass
  const useClasses = classRows.length > 0
  const generalReasons: string[] = []
  if (!medicalValid) generalReasons.push('유효한 항공신체검사(제1종 또는 제2종)가 없습니다')
  // 한정이 없는 등급은 커런시가 있어도 "가능"으로 치지 않는다(항공안전법 제36조·제37조). 조종연습(감독 필요)만 가능.
  const generalByClass = useClasses
    ? classRows.map((r) => ({ label: AIRCRAFT_CLASS_LABEL[r.aircraftClass], met: r.baseMet && r.ratingHeld !== false, landings: r.landingCount }))
    : []
  const generalRecencyMet = useClasses ? generalByClass.some((c) => c.met) : recency.baseMet
  const noRatingClasses = classRows.filter((r) => r.ratingHeld === false).map((r) => AIRCRAFT_CLASS_LABEL[r.aircraftClass])
  if (noRatingClasses.length > 0 && !generalRecencyMet) {
    generalReasons.push(`${noRatingClasses.join('·')} 한정이 등록·승인되지 않았습니다(제37조). 한정 없이는 조종연습만 가능합니다`)
  }
  if (!generalRecencyMet) {
    generalReasons.push(`최근 ${recency.windowDays}일 이착륙 ${recency.landingCount}/3회로 기준 미달입니다(운항기술기준 8.2.2)`)
    if (recency.unknownLandingCount > 0) {
      generalReasons.push(`착륙 횟수가 기재되지 않은 기록 ${recency.unknownLandingCount}건(해외 증명서 등)은 판정에서 제외했어요`)
    }
  }
  for (const c of generalByClass) {
    if (!c.met) generalReasons.push(`${c.label}: 최근 ${recency.windowDays}일 이착륙 ${c.landings}/3회 — 이 등급은 제한`)
  }
  const generalMet = medicalValid && generalRecencyMet
  const generalPartial = generalMet && generalByClass.some((c) => !c.met)

  // 2) 야간 비행 가능 — 마찬가지로 등급별
  const nightReasons: string[] = generalReasons.filter((r) => !r.includes('이 등급은 제한'))
  const nightByClass = useClasses
    ? classRows.map((r) => ({ label: AIRCRAFT_CLASS_LABEL[r.aircraftClass], met: r.nightMet, nightLandings: r.nightLandingCount }))
    : []
  const nightRecencyMet = useClasses ? nightByClass.some((c) => c.met) : recency.nightMet
  if (generalMet && !nightRecencyMet) {
    nightReasons.push(recency.nightRequired ? `최근 ${recency.windowDays}일 야간 이착륙이 1회 이상 없습니다(8.2.2 가항)` : `최근 ${recency.windowDays}일 야간 이착륙이 없습니다(일반 운항은 법정 요건이 아닌 참고치)`)
  }
  for (const c of nightByClass) {
    if (!c.met) nightReasons.push(`${c.label}: 최근 ${recency.windowDays}일 야간 이착륙 ${c.nightLandings}회 — 이 등급은 야간 제한`)
  }
  const nightMetOverall = generalMet && nightRecencyMet
  const nightPartial = nightMetOverall && nightByClass.some((c) => !c.met)

  // 3) 계기비행(PIC IFR) 가능
  const ifrReasons = [...generalReasons]
  if (generalMet && !ifr.met) {
    ifrReasons.push('계기비행 유지 요건(6개월 이내 계기접근 6회 및 계기비행 6시간)을 충족하지 못했습니다')
  }
  if (!hasInstrumentRating) ifrReasons.push('계기한정(IR) 자격증이 등록되어 있지 않습니다')
  const ifrMetOverall = generalMet && ifr.met && hasInstrumentRating

  // 4) 조종교육 가능
  const instructorReasons = [...generalReasons]
  if (generalMet && !instructorRecencyMet) {
    instructorReasons.push('조종교육 비행경험(최근 1년 10시간 또는 회복 조건)을 충족하지 못했습니다')
  }
  if (!hasInstructorCertificate) instructorReasons.push('조종교육증명 자격증이 등록되어 있지 않습니다')
  if (!class1Valid) instructorReasons.push('항공신체검사 제1종이 유효하지 않습니다(교관은 제1종이 필수입니다)')
  const instructorMetOverall = generalMet && instructorRecencyMet && hasInstructorCertificate && class1Valid

  const states: ReadinessState[] = [
    {
      key: 'general',
      label: '일반 비행',
      met: generalMet,
      partial: generalPartial,
      byClass: generalByClass.map(({ label, met }) => ({ label, met })),
      // 일부 등급이 제한이면 충족 상태여도 그 등급 사유를 남긴다
      reasons: generalMet ? generalReasons.filter((r) => r.includes('이 등급은 제한')) : generalReasons,
    },
    {
      key: 'night',
      label: '야간 비행',
      met: nightMetOverall,
      partial: nightPartial,
      byClass: nightByClass.map(({ label, met }) => ({ label, met })),
      reasons: nightMetOverall ? nightReasons.filter((r) => r.includes('야간 제한')) : nightReasons,
    },
    { key: 'ifr', label: '계기비행', met: ifrMetOverall, reasons: ifrMetOverall ? [] : ifrReasons },
    {
      key: 'instructor',
      label: '조종교육',
      met: instructorMetOverall,
      reasons: instructorMetOverall ? [] : instructorReasons,
    },
  ]

  return { overallGo: generalMet, states }
}
