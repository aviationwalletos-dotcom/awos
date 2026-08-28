// 디지털 자격 월렛 — 자격/면허 데이터 모델
// 실 서버 연동 전까지 브라우저 localStorage에 저장되는 자격증 타입 정의입니다.

export type CertificateCategory =
  | '조종사 자격증명'
  | '한정'
  | '조종교육증명'
  | '항공신체검사'
  | '법정교육'
  | '기타 자격'

export interface Certificate {
  id: string
  name: string // 예: 사업용 조종사(CPL), 형식한정(B737)
  category: CertificateCategory
  issuer: string // 발급기관
  issuedDate: string // YYYY-MM-DD
  /** 항공신체검사/법정교육 등 실제 만료가 있는 자격만 값을 가집니다. 조종사 자격증명/한정/조종교육증명은 만료 개념이 없어 비어 있을 수 있습니다. */
  expiryDate?: string // YYYY-MM-DD
  notes?: string
  createdAt: number
  updatedAt: number
  /**
   * 이 자격증과 연결된 "자격증관리" 게시판 게시글 id (실 서버 동기화 완료 시 채워짐).
   * 서버 동기화는 best-effort이므로, 값이 없으면 아직 서버에 반영되지 않았거나 실패한 것이다.
   */
  syncPostId?: string
}

export type CertificateInput = Omit<Certificate, 'id' | 'createdAt' | 'updatedAt' | 'syncPostId'>

export const CERTIFICATE_CATEGORIES: CertificateCategory[] = [
  '조종사 자격증명',
  '한정',
  '조종교육증명',
  '항공신체검사',
  '법정교육',
  '기타 자격',
]

export type CertificateStatus = 'valid' | 'warning' | 'urgent' | 'expired' | 'no_expiry'

export const CERTIFICATE_STATUS_LABEL: Record<CertificateStatus, string> = {
  valid: '유효',
  warning: '주의(D-30 이내)',
  urgent: '긴급(D-7 이내)',
  expired: '만료됨',
  no_expiry: '만료 없음',
}

/** 만료일 기준 오늘로부터 남은 일수를 계산합니다(자정 기준, 시간대는 로컬 기준). */
export function daysUntil(dateStr: string, from: Date = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/** 만료일이 없는 자격(조종사 자격증명/한정/조종교육증명 등)은 항상 'no_expiry'를 반환합니다. */
export function getCertificateStatus(expiryDate?: string, from: Date = new Date()): CertificateStatus {
  if (!expiryDate) return 'no_expiry'
  const remaining = daysUntil(expiryDate, from)
  if (remaining < 0) return 'expired'
  if (remaining <= 7) return 'urgent'
  if (remaining <= 30) return 'warning'
  return 'valid'
}
