// 대한민국 항공안전법 기준 조종사 자격 체계에 맞춘 자격증 "구분(category)"별 세부 선택 옵션.
// 자유 텍스트 입력 대신 선택 위주로 구성해 실제 존재하는 자격 명칭만 등록되도록 돕습니다.

import type { CertificateCategory } from '../types/certificate'
import { localToday } from '../lib/ui/localDate'

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
  { key: 'SOLO_XC', label: '단독 야외비행 확인(야외비행마다 새로 받아요)', requiresDetail: true, detailPlaceholder: '노선, 예: RKTL-RKPU-RKTL' },
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
  // 조종교육증명은 자격증에 "초급(비행기/육상단발, 비행기/육상다발)"처럼 종류·등급까지 적힌다(별표 4 한정심사).
  // 그래서 등급별로 따로 등록한다. 헬리콥터는 등급 구분이 없다.
  { key: 'CFI_BASIC_AIRPLANE_SEL', label: '초급 조종교육증명 - 비행기 육상단발' },
  { key: 'CFI_BASIC_AIRPLANE_MEL', label: '초급 조종교육증명 - 비행기 육상다발' },
  { key: 'CFI_BASIC_AIRPLANE', label: '초급 조종교육증명 - 비행기 (등급 미상)' },
  { key: 'CFI_BASIC_HELICOPTER', label: '초급 조종교육증명 - 헬리콥터' },
  { key: 'CFI_SENIOR_AIRPLANE_SEL', label: '선임 조종교육증명 - 비행기 육상단발' },
  { key: 'CFI_SENIOR_AIRPLANE_MEL', label: '선임 조종교육증명 - 비행기 육상다발' },
  { key: 'CFI_SENIOR_AIRPLANE', label: '선임 조종교육증명 - 비행기 (등급 미상)' },
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

/**
 * 항공영어구술능력증명 만료일 = 기준일 + N년 − 1일.
 *
 * 근거: 항공안전법 시행규칙 제99조제3항 — "각 호의 구분에 따른 기준일부터 계산하여 4등급은 3년,
 * 5등급은 6년, 6등급은 영구". "기준일부터" 라 초일이 들어가므로(민법 제157조 단서), 민법 제160조②에
 * 따라 마지막 해에서 기준일에 해당하는 날의 **전날**에 만료한다.
 *
 * 기준일(제99조③ 각 호):
 *   1호. 최초 응시자(유효기간이 지난 사람 포함) → 합격 통지일
 *   2호. 4·5등급 보유자가 유효기간이 끝나기 전 6개월 이내에 합격 → 기존 증명의 유효기간이 끝난 다음 날
 *
 * 2호(갱신)는 직전 증명의 만료일을 알아야 계산할 수 있어 여기서 다루지 않는다. 갱신이면 사용자가
 * 기준일 칸에 "기존 만료일 + 1일"을 넣으면 이 함수가 그대로 맞는 값을 낸다.
 *
 * [2026-09-13 수정] 예전에는 −1일이 없어 하루 길게 나왔다. 만료 다음 날에도 유효로 보여
 * 커런시 판정에서 잘못된 GO 가 날 수 있었다. TS 영어등급조회 실제 3건으로 확인:
 *   2021-06-10 → 2024-06-09 · 2024-06-10 → 2027-06-09 · 2025-12-02 → 2028-12-01
 */
export function computeEptaExpiryDate(issuedDate: string, levelKey: string): string | null {
  const years = EPTA_VALIDITY_YEARS[levelKey]
  if (years == null || !issuedDate) return null
  const issued = new Date(`${issuedDate}T00:00:00`)
  if (Number.isNaN(issued.getTime())) return null
  const due = new Date(issued)
  due.setFullYear(due.getFullYear() + years)
  due.setDate(due.getDate() - 1) // 기준일 당일을 포함해 세므로 마지막 날은 하루 앞이다
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`
}

/** 만료일에서 기준일을 거꾸로 구한다(증서에 만료일만 적혀 있을 때). 위 규칙의 역이다. */
export function eptaBaseDateFromExpiry(expiryDate: string, levelKey: string): string | null {
  const years = EPTA_VALIDITY_YEARS[levelKey]
  if (years == null || !expiryDate) return null
  const expiry = new Date(`${expiryDate}T00:00:00`)
  if (Number.isNaN(expiry.getTime())) return null
  const base = new Date(expiry)
  base.setFullYear(base.getFullYear() - years)
  base.setDate(base.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`
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
 *   1종: 12개월. 6개월 예외(별표 8, 개정 2025. 12. 5.): ①항공운송사업 60세 이상 ②항공기사용사업 60세 이상 ③1명 조종 여객 운송사업 40세 이상.
 *        앱은 운항형태 "상업"이면 40세 이상부터 6개월로 봄(③ 기준, 보수적). 2인 조종 40~59세는 법상 12개월인데 6개월로 짧게 나올 수 있음 — 편성 정보가 없어 안전한 쪽으로.
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

/**
 * AI 가 읽은 신체검사 종류를 세부 종류 키로 바꾼다.
 *
 * 스키마는 정수(1·2·3)를 요구하지만, 예전 스키마가 '제1종' 같은 문자열을 쓴 적이 있고
 * 모델이 문자열로 답할 수도 있어 둘 다 받는다.
 *
 * [2026-09-14] 스키마에 medicalClass 가 두 번 정의돼 있었다(문자열/정수). JS 라 뒤엣것(정수)만
 * 살아남는데 받는 쪽은 `typeof === 'string'` 일 때만 처리했다. 그래서 종류가 한 번도 자동으로
 * 채워지지 않았고, 유효기간도 엉뚱한 종류로 계산됐다(제2종 35세 60개월 vs 제1종 12개월).
 */
export function medicalKeyFromAi(raw: unknown): 'CLASS1' | 'CLASS2' | 'CLASS3' | null {
  const n = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? (raw.includes('1') ? 1 : raw.includes('2') ? 2 : raw.includes('3') ? 3 : 0)
      : 0
  return n === 1 ? 'CLASS1' : n === 2 ? 'CLASS2' : n === 3 ? 'CLASS3' : null
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

/**
 * 통신보안교육 기한의 기준일 = 최종교육일과 자격증 발급일 중 **늦은 쪽**.
 *
 * 근거: 전파법 제30조제2항 · 「무선국 운용 등에 관한 규정」 제7조(통신보안 교육) —
 * "무선통신업무에 종사하는 자는 5년마다 1회의 통신보안 교육을 받아야 한다".
 * ※ 「무선국 운용 등에 관한 규정」은 시행규칙이 아니라 행정규칙(고시)이다. law.go.kr API 로 볼 때
 *    target=admrul 을 써야 한다.
 *
 * [미확인] 위 조문은 "5년마다 1회"만 정하고 기산일이나 만료일 계산법을 적지 않는다.
 * 아래 두 가지는 전파진흥원 실제 기록에서 역산한 것이지 조문에서 읽은 것이 아니다:
 *   · 만료일 = 기준일 + 5년 − 1일   (실측 1건: 2022-03-08 → 2027-03-07)
 *   · 기준일 = 최종교육일과 발급일 중 늦은 쪽  (제도 구조에서 유추)
 * 근거가 필요하면 전파진흥원에 계산 기준을 직접 확인할 것.
 *
 * 제도가 두 단계라 "늦은 쪽"이 맞는다고 본 이유:
 *   · 교육을 아직 안 받았으면 → 자격 취득(발급)이 기준이 된다
 *   · 한 번이라도 받았으면   → 그 최종교육일부터 다시 5년이다
 * 최종교육일은 자격증에 안 적혀 있고 전파진흥원에서 따로 조회한다. 모르면 비워 두면 된다.
 *
 * 실제 사례(2026-09-13): 자격 발급 2017-11-24 · 최종교육 2022-03-08 → 4년 4개월 차이.
 * 발급일만 쓰면 만료를 2022-11-23 로 잡아 "기한이 지났어요"를 잘못 띄웠다(실제는 2027-03-07).
 */
export function commEducationBaseDate(issuedDate: string, lastEducationDate?: string): string {
  if (!lastEducationDate) return issuedDate
  if (!issuedDate) return lastEducationDate
  return lastEducationDate > issuedDate ? lastEducationDate : issuedDate
}

/**
 * 무선통신사 통신보안 의무교육(5년 주기)의 마지막 유효일 = 기준일 + 5년 − 1일.
 *
 * 한국방송통신전파진흥원 통신보안교육내역 실제 기록으로 확인(2026-09-13):
 *   최종교육일 2022-03-08 → 통신보안교육만료일 2027-03-07
 * 항공영어(시행규칙 제99조③)와 같은 방식이다. 기간을 "…부터 5년"으로 세면 초일이 들어가므로
 * 민법 제160조②에 따라 마지막 해의 해당일 전날에 끝난다.
 *
 * 기준일은 commEducationBaseDate() 로 구해서 넘긴다(최종교육일과 발급일 중 늦은 쪽).
 */
export function commEducationDueDate(lastEducationDate: string): string | null {
  const base = new Date(`${lastEducationDate}T00:00:00`)
  if (Number.isNaN(base.getTime())) return null
  const due = new Date(base)
  due.setFullYear(due.getFullYear() + 5)
  due.setDate(due.getDate() - 1) // 기준일 당일을 포함해 세므로 마지막 날은 하루 앞이다
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`
}

/** 무선통신사 교육 기한(발급 후 5년)이 지났는가 */
/** 통신보안교육 기한이 지났는지. 만료일 당일까지는 유효하므로 "만료일 < 오늘" 이어야 지난 것이다. */
export function isCommEducationDue(lastEducationDate: string): boolean {
  const due = commEducationDueDate(lastEducationDate)
  return Boolean(due) && due! < localToday()
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
