// 대한민국 항공안전법 기준 조종사 자격 체계에 맞춘 자격증 "구분(category)"별 세부 선택 옵션.
// 자유 텍스트 입력 대신 선택 위주로 구성해 실제 존재하는 자격 명칭만 등록되도록 돕습니다.

import type { CertificateCategory } from '../types/certificate'

export interface CertificateSubType {
  key: string
  /** 자격증 명칭 입력란에 채워질 기본 라벨 */
  label: string
  /** true면 기종명 등 보조 텍스트 입력이 추가로 필요합니다(예: 형식한정). */
  requiresDetail?: boolean
  detailPlaceholder?: string
}

/** 조종사 자격증명(Licence) 세부 선택 */
export const LICENCE_TYPES: CertificateSubType[] = [
  { key: 'PPL', label: '자가용 조종사(PPL)' },
  { key: 'CPL', label: '사업용 조종사(CPL)' },
  { key: 'ATPL', label: '운송용 조종사(ATPL)' },
]

/**
 * 한정(Rating) 세부 선택 — v1.1: 항공안전법 제37조 구조를 따른다.
 * 계기비행증명은 법상 "한정"이 아니라 별도 증명(제44조)이므로 분리했다(INSTRUMENT_RATING_TYPES).
 */
/**
 * 교관 확인(Endorsement) — 운항기술기준 2.2.2.5·2.2.2.6(조종연습생 단독·야간 단독·단독 야외비행 확인),
 * 2.2.3.5 나(자가용 야간비행 훈련 이수), 2.2.1.3~2.2.1.5(종류·등급·형식 한정 응시 전 자격유지기록부 확인),
 * 2.2.3.2(자가용 응시 전 확인). 비행 1건의 서명("이 비행이 사실")과 달리 "이 학생은 ~를 해도 된다"는 교관의 확인이다.
 */
/** 조종연습허가서 — 법 제46조·시행규칙 제101조(항공기), 법 제115조·시행규칙 제293조(경량). 유효기간은 신체검사 유효기간 내 */
export const TRAINING_PERMIT_TYPES: CertificateSubType[] = [
  { key: 'PERMIT_AIRCRAFT', label: '항공기 조종연습허가서', requiresDetail: true, detailPlaceholder: '허가번호 · 지방항공청' },
  { key: 'PERMIT_LSA', label: '경량항공기 조종연습허가서', requiresDetail: true, detailPlaceholder: '허가번호 · 지방항공청' },
]

export const ENDORSEMENT_TYPES: CertificateSubType[] = [
  { key: 'SOLO', label: '단독비행 확인', requiresDetail: true, detailPlaceholder: '기종/비행장, 예: C172S / RKTL' },
  { key: 'SOLO_NIGHT', label: '야간 단독비행 확인', requiresDetail: true, detailPlaceholder: '비행장, 예: RKTL' },
  { key: 'SOLO_XC', label: '단독 야외비행 확인', requiresDetail: true, detailPlaceholder: '노선, 예: RKTL-RKPU-RKTL' },
  { key: 'NIGHT_TRAINING', label: '야간비행 훈련 이수(자가용, 2시간·이착륙 3회 동승)' },
  { key: 'EXAM_PPL', label: '자가용 조종사 응시 전 확인' },
  { key: 'EXAM_CPL', label: '사업용 조종사 응시 전 확인' },
  { key: 'EXAM_IR', label: '계기비행증명 응시 전 확인' },
  { key: 'EXAM_RATING', label: '종류·등급·형식 한정 응시 전 확인', requiresDetail: true, detailPlaceholder: '예: 육상다발(MEL)' },
  { key: 'LIMITATION', label: '자격유지기록부 제한사항 부과', requiresDetail: true, detailPlaceholder: '예: 측풍 10kt 이하, 주간만' },
]

export const RATING_TYPES: CertificateSubType[] = [
  // 종류 한정(비행기/헬리콥터)은 자격증명 등록 시 함께 받는다. 여기서는 추가 등급·형식만.
  { key: 'CAT_AIRPLANE', label: '종류한정 추가 - 비행기' },
  { key: 'CAT_HELICOPTER', label: '종류한정 추가 - 헬리콥터' },
  { key: 'SEL', label: '등급한정 - 육상단발(SEL)' },
  { key: 'MEL', label: '등급한정 - 육상다발(MEL)' },
  { key: 'SES', label: '등급한정 - 수상단발(SES)' },
  { key: 'MES', label: '등급한정 - 수상다발(MES)' },
  { key: 'TYPE', label: '형식한정', requiresDetail: true, detailPlaceholder: '예: B737, A320' },
]

/** 계기비행증명(제44조) — 조종사 덱 3번째 카드 */
export const INSTRUMENT_RATING_TYPES: CertificateSubType[] = [
  { key: 'IR_AIRPLANE', label: '계기비행증명 - 비행기' },
  { key: 'IR_HELICOPTER', label: '계기비행증명 - 헬리콥터' },
]

/** 조종교육증명 — v1.1: 초급·선임 × 종류(비행기/헬리콥터) */
export const FLIGHT_INSTRUCTOR_TYPES: CertificateSubType[] = [
  { key: 'CFI_BASIC_AIRPLANE', label: '초급 조종교육증명 - 비행기' },
  { key: 'CFI_BASIC_HELICOPTER', label: '초급 조종교육증명 - 헬리콥터' },
  { key: 'CFI_SENIOR_AIRPLANE', label: '선임 조종교육증명 - 비행기' },
  { key: 'CFI_SENIOR_HELICOPTER', label: '선임 조종교육증명 - 헬리콥터' },
]

/**
 * 항공영어구술능력증명(EPTA) — 항공안전법 제45조, 시행규칙 제99조③.
 * 유효기간: 4등급 3년 · 5등급 6년 · 6등급 영구.
 */
export const EPTA_LEVELS: CertificateSubType[] = [
  { key: 'EPTA_4', label: '항공영어구술능력증명 4등급' },
  { key: 'EPTA_5', label: '항공영어구술능력증명 5등급' },
  { key: 'EPTA_6', label: '항공영어구술능력증명 6등급' },
]

export const EPTA_VALIDITY_YEARS: Record<string, number | null> = {
  EPTA_4: 3,
  EPTA_5: 6,
  EPTA_6: null, // 영구
}

export function computeEptaExpiryDate(issuedDate: string, levelKey: string): string | null {
  const years = EPTA_VALIDITY_YEARS[levelKey]
  if (years == null || !issuedDate) return null
  const issued = new Date(`${issuedDate}T00:00:00`)
  if (Number.isNaN(issued.getTime())) return null
  const due = new Date(issued)
  due.setFullYear(due.getFullYear() + years)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`
}

// ── 경량항공기 조종사 트랙 ─────────────────────────────────────────────────

/** 경량항공기 조종사 자격증명 — 종류 한정 5종(시행규칙 제113조) */
export const LSA_LICENCE_TYPES: CertificateSubType[] = [
  { key: 'LSA_AIRPLANE', label: '경량항공기 조종사 - 타면조종형비행기' },
  { key: 'LSA_WEIGHT_SHIFT', label: '경량항공기 조종사 - 체중이동형비행기' },
  { key: 'LSA_HELICOPTER', label: '경량항공기 조종사 - 경량헬리콥터' },
  { key: 'LSA_GYROPLANE', label: '경량항공기 조종사 - 자이로플레인' },
  { key: 'LSA_POWERED_PARACHUTE', label: '경량항공기 조종사 - 동력패러슈트' },
]

export const LSA_INSTRUCTOR_TYPES: CertificateSubType[] = [
  { key: 'LSA_CFI', label: '경량항공기 조종교육증명', requiresDetail: true, detailPlaceholder: '예: 타면조종형비행기' },
]

/** 경량은 항공신체검사 2종 또는 자동차운전면허로 갈음 가능(제115조) */
export const DRIVER_LICENCE_TYPES: CertificateSubType[] = [
  { key: 'DL_2', label: '자동차운전면허 제2종 보통 이상' },
  { key: 'DL_1', label: '자동차운전면허 제1종' },
]

// ── 초경량비행장치 조종자 트랙 ─────────────────────────────────────────────

/**
 * 초경량비행장치 조종자증명 종류 — 초경량비행장치 조종자 증명 운영세칙(유인) [별표 1],
 * 무인비행장치 조종자 증명 운영세칙 [별표 2] <개정 2025. 4. 21.> (무인은 종류 5 × 1~4종).
 */
export const ULTRALIGHT_CERT_TYPES: CertificateSubType[] = [
  { key: 'UL_POWERED', label: '동력비행장치 조종자' },
  { key: 'UL_ROTOR', label: '회전익비행장치 조종자' },
  { key: 'UL_POWERED_PARAGLIDER', label: '동력패러글라이더 조종자' },
  { key: 'UL_HANG_GLIDER', label: '행글라이더 조종자' },
  { key: 'UL_PARAGLIDER', label: '패러글라이더 조종자' },
  { key: 'UL_BALLOON_PRIVATE', label: '유인자유기구 조종자(자가용)' },
  { key: 'UL_BALLOON_COMMERCIAL', label: '유인자유기구 조종자(사업용)' },
  { key: 'UAS_AIRPLANE', label: '무인비행기', requiresDetail: true, detailPlaceholder: '1종 / 2종 / 3종 / 4종' },
  { key: 'UAS_HELICOPTER', label: '무인헬리콥터', requiresDetail: true, detailPlaceholder: '1종 / 2종 / 3종 / 4종' },
  { key: 'UAS_MULTICOPTER', label: '무인멀티콥터', requiresDetail: true, detailPlaceholder: '1종 / 2종 / 3종 / 4종' },
  { key: 'UAS_VTOL', label: '무인수직이착륙기', requiresDetail: true, detailPlaceholder: '1종 / 2종 / 3종 / 4종' },
  { key: 'UAS_AIRSHIP', label: '무인비행선' },
]

export const ULTRALIGHT_INSTRUCTOR_TYPES: CertificateSubType[] = [
  { key: 'UL_INSTRUCTOR', label: '지도조종자', requiresDetail: true, detailPlaceholder: '예: 무인멀티콥터' },
  { key: 'UL_EVALUATOR', label: '실기평가조종자', requiresDetail: true, detailPlaceholder: '예: 무인멀티콥터' },
]

export const ULTRALIGHT_EDUCATION_TYPES: CertificateSubType[] = [
  { key: 'UL_ELEARNING_4', label: '4종 이러닝 교육이수증명' },
  { key: 'UL_INSTRUCTOR_COURSE', label: '조종교육교관과정 이수증명' },
  { key: 'UL_EVALUATOR_COURSE', label: '실기평가과정 이수증명' },
  { key: 'UL_REFRESHER', label: '보수교육 이수' },
]

/** 조종교육증명은 세부 선택 없이 단일 항목으로 고정합니다. */
export const FLIGHT_INSTRUCTOR_CERTIFICATE_LABEL = '조종교육증명'

/** 항공신체검사증명 종별(제1종/제2종/제3종) 세부 선택. 제3종은 관제사 자격 요건(항공안전법 제40조) 확인에 사용됩니다. */
export const MEDICAL_CERTIFICATE_TYPES: CertificateSubType[] = [
  { key: 'CLASS1', label: '제1종 항공신체검사증명' },
  { key: 'CLASS2', label: '제2종 항공신체검사증명' },
  { key: 'CLASS3', label: '제3종 항공신체검사증명' },
]

/** 이 구분들은 실제로 만료 개념이 없는 자격(발급일만 존재)입니다. */
export const CATEGORIES_WITHOUT_EXPIRY: CertificateCategory[] = [
  '조종사 자격증명',
  '한정',
  '계기비행증명',
  '조종교육증명',
  '무선통신사',
  '경량항공기 조종사 자격증명',
  '경량항공기 조종교육증명',
  '초경량비행장치 조종자증명',
  '지도조종자',
]

/**
 * v1.1 — 항공신체검사 유효기간, 항공안전법 시행규칙 [별표 8] 기준.
 * 검사일 기준 연령으로 갈린다(월말 만료 원칙 적용).
 *   1종: 12개월 (40세 이상 + 1인 조종 여객 운송 등은 6개월 예외 — 운항형태로 판정)
 *   2종: 40세 미만 60개월 / 40~49세 24개월 / 50세 이상 12개월
 *   3종: 40세 미만 48개월 / 40~49세 24개월 / 50세 이상 12개월
 * 1종 소지자는 2종·3종 검사를 받은 것으로 간주한다(간주 규정은 덱 표시에서 처리).
 *
 * 생년월일이 없으면 가장 보수적인(짧은) 값으로 계산하고 "생년월일 입력 시 정확해집니다"를 안내한다.
 */
export interface MedicalValidityInput {
  medicalKey: string
  issuedDate: string
  birthDate?: string | null
  /** 1종 6개월 예외(여객 운송 1인 조종 등) 적용 여부 — 운항형태 commercial + 40세 이상 */
  commercialSinglePilot?: boolean
}

export function ageOnDate(birthDate: string, onDate: string): number | null {
  const b = new Date(`${birthDate}T00:00:00`)
  const d = new Date(`${onDate}T00:00:00`)
  if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null
  let age = d.getFullYear() - b.getFullYear()
  const beforeBirthday = d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export function medicalValidityMonths(input: MedicalValidityInput): { months: number; assumedAge: boolean } {
  const age = input.birthDate ? ageOnDate(input.birthDate, input.issuedDate) : null
  const assumedAge = age === null
  // 생년월일이 없으면 50세 이상(최단)으로 가정
  const a = age ?? 50
  switch (input.medicalKey) {
    case 'CLASS1':
      return { months: a >= 40 && input.commercialSinglePilot ? 6 : 12, assumedAge }
    case 'CLASS2':
      return { months: a < 40 ? 60 : a < 50 ? 24 : 12, assumedAge }
    case 'CLASS3':
      return { months: a < 40 ? 48 : a < 50 ? 24 : 12, assumedAge }
    default:
      return { months: 12, assumedAge }
  }
}

/** @deprecated v1.1 — 연령 미반영 임시값. medicalValidityMonths()를 쓸 것. 기존 import 호환용으로만 남긴다. */
export const MEDICAL_VALIDITY_MONTHS: Record<string, number> = {
  CLASS1: 12,
  CLASS2: 12,
  CLASS3: 12,
}

/**
 * 항공신체검사 만료일 자동 계산 — 발급일 + 종별 개월 수를 "월말 만료 원칙"으로 보정.
 * (계산된 만료일이 그 달의 말일이 아니면 그 달 말일까지 유효)
 */
export function computeMedicalExpiryDate(
  issuedDate: string,
  medicalKey: string,
  opts: { birthDate?: string | null; commercialSinglePilot?: boolean } = {},
): string | null {
  if (!issuedDate) return null
  const { months } = medicalValidityMonths({ medicalKey, issuedDate, ...opts })
  if (!months) return null
  const issued = new Date(`${issuedDate}T00:00:00`)
  if (Number.isNaN(issued.getTime())) return null
  const end = new Date(issued.getFullYear(), issued.getMonth() + months + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
}

/** 무선통신사 통신보안 의무교육(5년 주기) 다음 기한 = 발급일 + 5년 */
export function commEducationDueDate(issuedDate: string): string | null {
  const issued = new Date(`${issuedDate}T00:00:00`)
  if (Number.isNaN(issued.getTime())) return null
  const due = new Date(issued)
  due.setFullYear(due.getFullYear() + 5)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`
}

/** 무선통신사 교육 기한(발급 후 5년)이 지났는가 */
export function isCommEducationDue(issuedDate: string): boolean {
  const due = commEducationDueDate(issuedDate)
  return Boolean(due) && due! <= new Date().toISOString().slice(0, 10)
}

export type ExpiryRequirement = 'required' | 'optional' | 'hidden'

/** 구분별 만료일 입력 요구 수준을 반환합니다. */
export function getExpiryRequirement(category: CertificateCategory): ExpiryRequirement {
  if (CATEGORIES_WITHOUT_EXPIRY.includes(category)) return 'hidden'
  if (category === '항공신체검사' || category === '법정교육' || category === '운전면허' || category === '교육이수') return 'required'
  if (category === '항공영어구술능력증명') return 'optional' // 6등급은 영구
  return 'optional' // 기타 자격
}

/** "형식한정(B737)"처럼 세부 선택 + 보조 입력을 조합해 최종 명칭을 만듭니다. */
export function buildRatingName(subType: CertificateSubType, detail: string): string {
  const trimmed = detail.trim()
  if (subType.requiresDetail && trimmed) return `${subType.label}(${trimmed})`
  return subType.label
}
