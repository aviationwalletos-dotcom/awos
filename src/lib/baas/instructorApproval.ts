// "교관 승인" 게시판 전용 매칭/판정 유틸리티
//
// [BUG-004 수정] 이 게시판에는 별도의 "승인 상태" 커스텀 필드가 없어, 예전에는 게시글 숨김(is_hidden)
// 값을 승인 상태로 재사용했다: 신청 시 기본 숨김(true) = 승인 대기, 관리자가 숨김 해제(false) = 승인 완료.
// 그러나 게시글 숨김 토글(`PATCH /boards/posts/{post_id}/hidden`)은 dynamic-board.md 기준
// "작성자 본인 또는 프로젝트 소유자"만 호출할 수 있다. 우리 앱의 "기관(organization)" 계정은
// 신청서(게시글)의 작성자가 아니고 실제 BaaS 프로젝트 소유자도 아니므로, 이 API 호출은 항상
// 403 FORBIDDEN으로 실패했고, 그 결과 어떤 신청도 실제로 승인될 수 없었다(교관 서명 기능이
// 아무에게도 동작하지 않던 근본 원인). "서명 요청" 게시판에서 이미 사용한 것과 동일한
// 댓글 기반 우회 방식으로 전환한다: 로그인한 회원이면 누구나(기관 계정 포함) 다른 사람의
// 게시글에 자신의 명의로 댓글을 작성할 수 있으므로, 기관 계정이 신청서에
// `[APPROVED] {담당자명} / {YYYY-MM-DD HH:mm}` 또는 `[REJECTED] ...` 댓글을 남기는 것으로
// 승인/반려를 표시한다(src/lib/baas/signatureRequest.ts의 [SIGNED] 댓글 패턴과 동일).
//
// [BUG-005 수정] 신청서를 `is_hidden: true`로 생성하면 작성자 본인이 아닌 계정(기관 계정)은
// 목록 조회 시 그 게시글 자체를 전혀 볼 수 없었다(승인 관리 화면이 항상 빈 목록으로 보이던
// 근본 원인). 승인 여부 판정은 어차피 is_hidden이 아니라 오직 댓글로만 하므로, 신청서 게시글은
// 이제 항상 `is_hidden: false`(공개)로 생성한다.
//
// 또한 게시글 목록 조회 API(`GET /public/boards/{project_id}/{board_id}/posts`) 응답에는
// author_id/이메일이 내려오지 않고 author_name과 title만 확인 가능하다. 따라서 신청서 작성 시
// 제목에 신청자 이메일(user_id)을 포함시켜 두고, 이후 그 이메일을 제목에서 찾아 매칭한다.
// 제목이 임의로 수정되면 매칭이 실패할 수 있는 한계가 있으며, 그 경우 author_name 완전 일치로
// 근사 매칭한다(동명이인은 구분하지 못하는 한계가 있음).
//
// [BUG] 목록 조회 API의 `content` 필드는 dynamic-board.md에 명시된 대로 "내용 미리보기
// (HTML 태그 제거)"이며, 원본 줄바꿈이 보존된다는 보장이 없다. 실제로 저장 시 `\n`으로 구분한
// "소속: {affiliation}" 줄이 미리보기 가공 과정에서 공백으로 합쳐지면, `parseAffiliationFromContent`가
// 사용하는 멀티라인 정규식(`^...$`, `m` 플래그)이 더 이상 그 줄의 시작을 찾지 못해 항상 null을
// 반환한다(= 기관 대시보드의 "내 소속" 필터가 상시 빈 목록이 되던 근본 원인). 목록 API에서
// 가공되지 않는 필드는 `title`뿐이므로, 소속 기관도 제목에 함께 저장하고 목록 기반 화면에서는
// 제목을 우선 파싱한다(content 파싱은 상세 조회 등 원본 content에 접근하는 곳의 폴백으로만 사용).

import type { BoardPostListItem, CommentItem } from './boardTypes'

const APPLICATION_TITLE_PREFIX = '교관 승인 신청'

export const APPROVAL_COMMENT_PREFIX = '[APPROVED]'
export const REJECTION_COMMENT_PREFIX = '[REJECTED]'

/** 신청 게시글 content에 소속 기관을 표기할 때 쓰이는 줄의 접두어. */
const AFFILIATION_LINE_PREFIX = '소속:'
/** v1.1 — 신청 게시글 content의 "자격 구분:" 줄. 어느 구분(항공기·경량·초경량)의 교관/지도조종자로 승인받는지 */
const TRACKS_LINE_PREFIX = '자격 구분:'
const TRACK_LABEL_TO_KEY: Record<string, 'aircraft' | 'lsa' | 'ultralight'> = {
  항공기: 'aircraft',
  경량항공기: 'lsa',
  초경량비행장치: 'ultralight',
  초경량: 'ultralight',
  조종사: 'aircraft',
}
const TRACK_KEY_TO_LABEL: Record<'aircraft' | 'lsa' | 'ultralight', string> = { aircraft: '항공기', lsa: '경량항공기', ultralight: '초경량비행장치' }

export function buildTracksLine(tracks: Array<'aircraft' | 'lsa' | 'ultralight'>): string {
  return `${TRACKS_LINE_PREFIX} ${tracks.map((t) => TRACK_KEY_TO_LABEL[t]).join(', ')}`
}

/**
 * content에서 "자격 구분: 항공기, 초경량비행장치" 줄을 파싱한다.
 * 줄이 없으면(구 형식) 항공기 교관으로 본다 — 기존 승인 교관은 전부 항공기 교관이었다.
 */
export function parseTracksFromContent(content: string | null | undefined): Array<'aircraft' | 'lsa' | 'ultralight'> {
  if (!content) return ['aircraft']
  const m = new RegExp(`${TRACKS_LINE_PREFIX}\\s*([^\\n]+)`).exec(content)
  if (!m) return ['aircraft']
  const keys = m[1]
    .split(/[,·/]/)
    .map((s) => s.trim())
    .map((s) => TRACK_LABEL_TO_KEY[s])
    .filter((k): k is 'aircraft' | 'lsa' | 'ultralight' => Boolean(k))
  return keys.length > 0 ? [...new Set(keys)] : ['aircraft']
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 승인/반려 댓글에 쓰이는 고정 포맷(YYYY-MM-DD HH:mm)으로 날짜를 포맷한다. */
export function formatDecidedAtForComment(date: Date): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const h = pad2(date.getHours())
  const mi = pad2(date.getMinutes())
  return `${y}-${m}-${d} ${h}:${mi}`
}

/**
 * 신청서 게시글 제목 — 이후 본인 신청 여부 매칭에 사용할 이메일을 포함한다.
 * 소속 기관이 있으면 `[{affiliation}]` 형태로 제목 끝에 함께 저장한다(목록 조회 API에서도
 * 가공 없이 그대로 보존되는 필드가 title뿐이므로, 소속 필터링을 title 기반으로 하기 위함).
 */
export function buildInstructorApplicationTitle(name: string, userId: string, affiliation?: string): string {
  const base = `${APPLICATION_TITLE_PREFIX} - ${name} (${userId})`
  const trimmedAffiliation = affiliation?.trim()
  return trimmedAffiliation ? `${base} [${trimmedAffiliation}]` : base
}

/** 신청서 제목에서 신청자 이름/이메일(userId)을 파싱한다. 형식이 다르면 null. 소속 접미사가 있어도 매칭된다. */
export function parseInstructorApplicationTitle(title: string): { name: string; userId: string } | null {
  const match = title.match(new RegExp(`^${APPLICATION_TITLE_PREFIX} - (.+) \\(([^)]+)\\)(?:\\s*\\[[^\\]]*\\])?$`))
  if (!match) return null
  return { name: match[1].trim(), userId: match[2].trim() }
}

/** 신청서 제목 끝의 `[{affiliation}]` 접미사에서 소속 기관을 파싱한다. 없으면(구 형식 포함) null. */
export function parseAffiliationFromTitle(title: string): string | null {
  const match = title.match(/\[([^[\]]+)\]\s*$/)
  return match ? match[1].trim() : null
}

/** 신청 사유 content에 소속 기관을 나타내는 줄을 만든다. */
export function buildAffiliationLine(affiliation: string): string {
  return `${AFFILIATION_LINE_PREFIX} ${affiliation}`
}

/** 신청 사유 content에서 소속 기관 줄을 파싱한다. 없으면 null. */
export function parseAffiliationFromContent(content: string | null | undefined): string | null {
  if (!content) return null
  const match = content.match(new RegExp(`^\\s*${AFFILIATION_LINE_PREFIX}\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

function latestByCreatedAt<T extends { created_at: string }>(items: T[]): T | null {
  if (items.length === 0) return null
  return items.reduce((latest, item) => (new Date(item.created_at) > new Date(latest.created_at) ? item : latest))
}

/** 제목에 포함된 이메일(userId)로 신청서를 찾는다(가장 신뢰도 높은 매칭). */
export function findInstructorApplicationByUserId(items: BoardPostListItem[], userId: string): BoardPostListItem | null {
  return latestByCreatedAt(items.filter((item) => parseInstructorApplicationTitle(item.title)?.userId === userId))
}

/** 이메일 매칭에 실패했을 때의 근사 매칭(한계: 동명이인 구분 불가). */
export function findLatestInstructorApplicationByName(items: BoardPostListItem[], authorName: string): BoardPostListItem | null {
  return latestByCreatedAt(items.filter((item) => item.author_name === authorName))
}

/** 댓글이 "승인" 댓글인지 판정한다(숨김 처리된 댓글은 제외). */
export function isApprovalComment(comment: CommentItem): boolean {
  return !comment.is_hidden && comment.content.trim().startsWith(APPROVAL_COMMENT_PREFIX)
}

/** 댓글이 "반려" 댓글인지 판정한다(숨김 처리된 댓글은 제외). */
export function isRejectionComment(comment: CommentItem): boolean {
  return !comment.is_hidden && comment.content.trim().startsWith(REJECTION_COMMENT_PREFIX)
}

/** 교관이 서명 완료를 표시할 때 남기는 [SIGNED] 댓글과 동일한 패턴으로, 기관 담당자가 남기는 승인 댓글. */
export function buildApprovalCommentContent(approverName: string, decidedAt: Date = new Date()): string {
  return `${APPROVAL_COMMENT_PREFIX} ${approverName} / ${formatDecidedAtForComment(decidedAt)}`
}

/** 반려 댓글 내용을 만든다. */
export function buildRejectionCommentContent(approverName: string, decidedAt: Date = new Date()): string {
  return `${REJECTION_COMMENT_PREFIX} ${approverName} / ${formatDecidedAtForComment(decidedAt)}`
}

export type ApprovalDecisionStatus = 'pending' | 'approved' | 'rejected'

export interface ApprovalDecisionResult {
  status: ApprovalDecisionStatus
  /** 최종 판정에 사용된 댓글(승인/반려 중 가장 최근 것). pending이면 null. */
  comment: CommentItem | null
}

/**
 * 신청 게시글의 댓글 목록에서 가장 최근의 "유효한" 승인/반려 댓글을 찾아 최종 판정을 내린다.
 * 승인 이후 반려 댓글이 더 최근에 달리면(또는 그 반대) 더 최근 댓글을 최종 상태로 취급한다.
 *
 * [SEC-001] 로그인 회원 누구나 댓글을 달 수 있으므로 내용 접두어만으로 판정하면 위조가 가능하다.
 * 따라서 authorizedOrgIds(authorized_orgs 테이블에 등록된 기관 계정)에 포함된 작성자의
 * 댓글만 판정에 사용한다. 집합이 비어 있으면(로딩·미설정 포함) 항상 'pending'을 반환한다.
 */
export function resolveApprovalDecision(
  comments: CommentItem[],
  authorizedOrgIds: ReadonlySet<string>,
): ApprovalDecisionResult {
  const decisionComments = comments.filter(
    (comment) =>
      (isApprovalComment(comment) || isRejectionComment(comment)) && authorizedOrgIds.has(comment.author_id),
  )
  const latest = latestByCreatedAt(decisionComments)
  if (!latest) return { status: 'pending', comment: null }
  return { status: isApprovalComment(latest) ? 'approved' : 'rejected', comment: latest }
}

/** 댓글 목록만으로 승인 여부를 판정하는 축약 헬퍼. [SEC-001] 기관 계정 댓글만 인정. */
export function isApprovedByComments(comments: CommentItem[], authorizedOrgIds: ReadonlySet<string>): boolean {
  return resolveApprovalDecision(comments, authorizedOrgIds).status === 'approved'
}

/**
 * 승인/반려 댓글 내용에서 결정 일시를 파싱한다(`[APPROVED]|[REJECTED] 이름 / YYYY-MM-DD HH:mm`).
 * 파싱에 실패하면 댓글의 created_at을 사용한다.
 */
export function parseDecidedAtFromComment(comment: CommentItem): number {
  const match = comment.content.match(/\/\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
  if (match) {
    const [, y, m, d, h, mi] = match
    const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi))
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }
  const fallback = new Date(comment.created_at).getTime()
  return Number.isNaN(fallback) ? Date.now() : fallback
}
