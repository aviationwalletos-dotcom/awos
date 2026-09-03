// 디지털 자격 월렛 — 자격/면허 데이터 모델
// 실 서버 연동 전까지 브라우저 localStorage에 저장되는 자격증 타입 정의입니다.

import type { PilotTrack } from '../lib/tracks'

export type CertificateCategory =
  // ── 항공기 조종사 트랙 (조종사 덱 7장)
  | '조종사 자격증명'
  | '한정'
  | '계기비행증명'
  | '조종교육증명'
  | '항공신체검사'
  | '항공영어구술능력증명'
  | '무선통신사'
  // ── 경량항공기 조종사 트랙 (경량 덱 4장) — 신체검사·무선은 위 카테고리를 공유
  | '경량항공기 조종사 자격증명'
  | '경량항공기 조종교육증명'
  // ── 초경량비행장치 조종자 트랙 (초경량 덱 3장)
  | '초경량비행장치 조종자증명'
  | '지도조종자'
  | '교육이수'
  // ── 공통
  | '운전면허'
  | '법정교육'
  | '기타 자격'

export interface Certificate {
  id: string
  // v1.1 — 이 자격이 속한 트랙. 값이 없으면 카테고리로 추정한다(certificateTrack 참고).
  track?: PilotTrack
  name: string // 예: 사업용 조종사(CPL) · 비행기 · 육상단발
  category: CertificateCategory
  // v1.1 — 항공안전법 제37조: 자격증명은 항공기 종류·등급·형식을 "한정"하여 발급된다. 한정은 자격증명의 속성이다.
  //   최초 발급 시의 종류·등급은 자격증명 자체에 기록하고, 이후 추가 취득한 한정(다른 등급·형식)은
  //   category '한정'으로 따로 등록하되 덱에서는 자격증명 카드 안에 함께 보인다.
  aircraftCategory?: 'AIRPLANE' | 'HELICOPTER'
  classRating?: 'SEL' | 'MEL' | 'SES' | 'MES'
  /** '한정' 항목이 붙는 자격증명의 id (한정 추가 시 선택). 카드에서 함께 표시할 때 사용 */
  linkedCertificateId?: string
  /** 형식 한정(예: B737). '한정' 항목 전용 */
  typeRating?: string
  /** 자격번호(III. SERIAL NO.) — 예: 12-015238. 실물 자격증의 핵심 식별자 */
  licenceNumber?: string
  /** 제한사항(XIII. LIMITATIONS) — 실물 특기사항란 */
  limitations?: string
  issuer: string // 발급기관
  issuedDate: string // YYYY-MM-DD
  /** 항공신체검사/법정교육 등 실제 만료가 있는 자격만 값을 가집니다. 조종사 자격증명/한정/조종교육증명은 만료 개념이 없어 비어 있을 수 있습니다. */
  expiryDate?: string // YYYY-MM-DD
  notes?: string
  /** 관리자 인증 상태 — undefined는 인증 요청 이력이 없는 기존 자격 */
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  /** 인증 후 내용을 수정해 인증이 해제된 시각(재요청 안내용). 다시 승인되면 지운다 */
  approvalRevokedAt?: number
  /** "자격증 인증" 게시판의 요청 게시글 id */
  approvalRequestPostId?: string
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
  '계기비행증명',
  '조종교육증명',
  '항공신체검사',
  '항공영어구술능력증명',
  '무선통신사',
  '경량항공기 조종사 자격증명',
  '경량항공기 조종교육증명',
  '초경량비행장치 조종자증명',
  '지도조종자',
  '교육이수',
  '운전면허',
  '법정교육',
  '기타 자격',
]

/** 트랙별로 등록 가능한 카테고리(자격증 등록 폼의 선택지) */
export const CERTIFICATE_CATEGORIES_BY_TRACK: Record<PilotTrack, CertificateCategory[]> = {
  aircraft: ['조종사 자격증명', '한정', '계기비행증명', '조종교육증명', '항공신체검사', '항공영어구술능력증명', '무선통신사', '법정교육', '기타 자격'],
  lsa: ['경량항공기 조종사 자격증명', '경량항공기 조종교육증명', '항공신체검사', '운전면허', '무선통신사', '법정교육', '기타 자격'],
  ultralight: ['초경량비행장치 조종자증명', '지도조종자', '교육이수', '항공신체검사', '운전면허', '법정교육', '기타 자격'],
}

/** 카테고리로 트랙을 추정한다(공유 카테고리는 항공기 기본). 기존 데이터의 track 미설정 보완용. */
export function certificateTrack(cert: Pick<Certificate, 'track' | 'category'>): PilotTrack {
  if (cert.track) return cert.track
  switch (cert.category) {
    case '경량항공기 조종사 자격증명':
    case '경량항공기 조종교육증명':
      return 'lsa'
    case '초경량비행장치 조종자증명':
    case '지도조종자':
    case '교육이수':
      return 'ultralight'
    default:
      return 'aircraft'
  }
}

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
