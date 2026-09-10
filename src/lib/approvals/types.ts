// 서명·승인 전용 테이블(approval_requests, schema12) 타입.
// 게시판+댓글 파싱 구조(부채 3단계 이전)를 대체한다.

export type ApprovalKind = 'signature' | 'instructor' | 'certificate' | 'medical' | 'flight_experience' | 'endorsement'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type PilotTrack = 'aircraft' | 'lsa' | 'ultralight'

export const APPROVAL_KIND_LABEL: Record<ApprovalKind, string> = {
  signature: '기록 서명',
  instructor: '교관 승인',
  certificate: '자격증 인증',
  medical: '항공신체검사 인증',
  flight_experience: '비행경력증명서 승인',
  endorsement: '교관 확인(Endorsement)',
}

export const TRACK_LABEL: Record<PilotTrack, string> = {
  aircraft: '항공기',
  lsa: '경량항공기',
  ultralight: '초경량비행장치',
}

/** 구분별 교관 호칭 — 초경량은 법령상 "지도조종자" */
export const TRACK_INSTRUCTOR_LABEL: Record<PilotTrack, string> = {
  aircraft: '항공기 조종교관',
  lsa: '경량항공기 조종교관',
  ultralight: '초경량비행장치 지도조종자',
}

export interface ApprovalRequest {
  id: string
  kind: ApprovalKind
  /** 요청자 auth uuid. 탈퇴하면 null 이 되고 행은 남는다(schema17). */
  requester_id: string | null
  requester_name: string
  requester_email: string | null
  /** 요청자가 탈퇴한 시각(schema17). 값이 있으면 화면에 "탈퇴한 사용자"를 붙인다. */
  requester_deleted_at?: string | null
  target_id: string | null
  track: PilotTrack | null
  subject_id: string | null
  affiliation: string | null
  title: string
  summary: string | null
  payload: Record<string, unknown>
  attachment_path: string | null
  status: ApprovalStatus
  decided_by: string | null
  decided_by_name: string | null
  decided_at: string | null
  decision_note: string | null
  signature_path: string | null
  created_at: string
  updated_at: string
}

export interface CreateApprovalRequestInput {
  kind: ApprovalKind
  requesterName: string
  requesterEmail?: string | null
  targetId?: string | null
  track?: PilotTrack | null
  subjectId?: string | null
  affiliation?: string | null
  title: string
  summary?: string | null
  payload?: Record<string, unknown>
  attachmentPath?: string | null
}

/** 승인된 교관 1명(서명 대상 선택·판정 집합용) */
export interface ApprovedInstructor {
  userId: string
  name: string
  track: PilotTrack
  affiliation: string | null
  approvedAt: string | null
}
