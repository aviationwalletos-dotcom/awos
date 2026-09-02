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

/** 한정(Rating) 세부 선택 */
export const RATING_TYPES: CertificateSubType[] = [
  { key: 'IR', label: '계기한정(IR)' },
  { key: 'MEL', label: '등급한정 - 육상다발(MEL)' },
  { key: 'SEL', label: '등급한정 - 육상단발(SEL)' },
  { key: 'TYPE', label: '형식한정', requiresDetail: true, detailPlaceholder: '예: B737, A320' },
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
export const CATEGORIES_WITHOUT_EXPIRY: CertificateCategory[] = ['조종사 자격증명', '한정', '조종교육증명', '무선통신사']

/**
 * [검증 필요 v0.9] 항공신체검사 종별 유효기간(개월).
 * 실무 검토(오재헌) 후 값만 바꾸면 자동 계산에 그대로 반영됩니다.
 */
export const MEDICAL_VALIDITY_MONTHS: Record<string, number> = {
  CLASS1: 12,
  CLASS2: 12,
  CLASS3: 24,
}

/**
 * 항공신체검사 만료일 자동 계산 — 발급일 + 종별 개월 수를 "월말 만료 원칙"으로 보정.
 * (계산된 만료일이 그 달의 말일이 아니면 그 달 말일까지 유효)
 */
export function computeMedicalExpiryDate(issuedDate: string, medicalKey: string): string | null {
  if (!issuedDate) return null
  const months = MEDICAL_VALIDITY_MONTHS[medicalKey]
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
  if (category === '항공신체검사' || category === '법정교육') return 'required'
  return 'optional' // 기타 자격
}

/** "형식한정(B737)"처럼 세부 선택 + 보조 입력을 조합해 최종 명칭을 만듭니다. */
export function buildRatingName(subType: CertificateSubType, detail: string): string {
  const trimmed = detail.trim()
  if (subType.requiresDetail && trimmed) return `${subType.label}(${trimmed})`
  return subType.label
}
