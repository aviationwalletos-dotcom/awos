// "서명 요청" 게시판 전용 콘텐츠 빌더 / 매칭 유틸리티
//
// 학생은 서명 요청 게시판(FREE)에 게시글을 작성해 서명을 "요청"한다. 게시글 수정/숨김 토글은
// 작성자 본인만 가능하므로(교관은 학생 게시글의 작성자가 아니다), 교관이 서명을 완료했다는
// 사실은 게시글이 아니라 "댓글"로 표시한다 — 댓글은 로그인한 프로젝트 소속 회원이면 누구나
// 자신의 명의로 작성할 수 있기 때문이다.
//
// 손그림 서명(canvas dataURL)은 presigned URL 업로드 API(`/upload/presign` → S3 PUT)로 업로드해
// 짧은 cdn_url만 확보한 뒤, 정해진 형식의 텍스트 댓글([SIGNED] {교관이름} / {YYYY-MM-DD HH:mm} ::
// {이미지 URL})에 URL을 붙여 저장한다. URL은 짧아 댓글 1~1000자 제한에 여유 있게 들어가고,
// 로그인된 교관 계정의 신원 자체도 함께 전자서명 역할을 한다. 과거 방식(이미지 없이 서명만 표시)으로
// 남은 댓글과의 호환을 위해 `::` 구분자 뒤 URL은 선택 사항으로 취급한다.

import type { AccountResponse } from './types'
import type { CommentItem } from './boardTypes'
import type { LogbookEntry } from '../../types/logbook'

export const SIGNED_COMMENT_PREFIX = '[SIGNED]'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 서명 댓글에 쓰이는 고정 포맷(YYYY-MM-DD HH:mm)으로 날짜를 포맷한다. */
export function formatSignedAtForComment(date: Date): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const h = pad2(date.getHours())
  const mi = pad2(date.getMinutes())
  return `${y}-${m}-${d} ${h}:${mi}`
}

/**
 * 교관이 서명 완료를 표시할 때 작성하는 고정 형식의 댓글 내용을 만든다.
 * imageUrl이 주어지면 `::` 구분자 뒤에 짧은 서명 이미지 URL을 덧붙인다.
 */
export function buildSignedCommentContent(instructorName: string, signedAt: Date = new Date(), imageUrl?: string): string {
  const base = `${SIGNED_COMMENT_PREFIX} ${instructorName} / ${formatSignedAtForComment(signedAt)}`
  return imageUrl ? `${base} :: ${imageUrl}` : base
}

/** 댓글이 "서명 완료" 댓글인지 판정한다(숨김 처리된 댓글은 제외). */
export function isSignedComment(comment: CommentItem): boolean {
  return !comment.is_hidden && comment.content.trim().startsWith(SIGNED_COMMENT_PREFIX)
}

function latestByCreatedAt(items: CommentItem[]): CommentItem | null {
  if (items.length === 0) return null
  return items.reduce((latest, item) => (new Date(item.created_at) > new Date(latest.created_at) ? item : latest))
}

/**
 * 댓글 목록에서 가장 최근의 "유효한" [SIGNED] 댓글을 찾는다. 없으면 null.
 *
 * [SEC-001] 로그인 회원 누구나(요청자 본인 포함) 댓글을 달 수 있으므로 접두어만으로 판정하면
 * 셀프 서명 위조가 가능하다. 따라서 approvedInstructorIds("기관에게 승인 완료된 교관" 계정
 * 집합)에 포함된 작성자의 [SIGNED] 댓글만 서명으로 인정한다. 집합이 비어 있으면(로딩·미설정
 * 포함) 어떤 댓글도 인정하지 않는다(fail-closed).
 */
export function findSignedComment(
  comments: CommentItem[],
  approvedInstructorIds: ReadonlySet<string>,
): CommentItem | null {
  return latestByCreatedAt(
    comments.filter((comment) => isSignedComment(comment) && approvedInstructorIds.has(comment.author_id)),
  )
}

/**
 * [SIGNED] 댓글 내용에서 서명 일시를 파싱한다(`[SIGNED] 이름 / YYYY-MM-DD HH:mm`).
 * 파싱에 실패하면 댓글의 created_at을 사용한다.
 */
export function parseSignedAtFromComment(comment: CommentItem): number {
  const match = comment.content.match(/\/\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
  if (match) {
    const [, y, m, d, h, mi] = match
    const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi))
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }
  const fallback = new Date(comment.created_at).getTime()
  return Number.isNaN(fallback) ? Date.now() : fallback
}

/** [SIGNED] 댓글 내용에서 `::` 뒤의 서명 이미지 URL을 파싱한다. 없으면 undefined. */
export function parseSignatureImageUrlFromComment(comment: CommentItem): string | undefined {
  const match = comment.content.match(/::\s*(\S+)\s*$/)
  return match ? match[1].trim() : undefined
}

function formatBlockTime(blockTime: number): string {
  return `${blockTime.toFixed(1)}시간`
}

/** 서명 요청 게시글 제목 — "[서명요청] {날짜} {기종} {출발}→{도착}" */
export function buildSignatureRequestTitle(entry: LogbookEntry): string {
  return `[서명요청] ${entry.date} ${entry.aircraftType} ${entry.departure}→${entry.arrival}`
}

/** 서명 요청 대상으로 특정 교관을 지정할 때 사용하는 식별 정보. */
export interface SignatureTargetInstructor {
  name: string
  userId: string
}

/**
 * 서명 요청 게시글 본문 — 비행 상세를 사람이 읽기 쉬운 텍스트로 정리하고, 마지막 줄에
 * 요청자 식별 정보를 남긴다(교관 승인 게시판과 동일하게, 목록 API가 author_id를 내려주지
 * 않는 경우를 대비한 근사 매칭용으로도 사용될 수 있다).
 *
 * targetInstructor가 주어지면 맨 앞줄에 "대상 교관: {이름} ({아이디})"을 남겨, 학생이 특정
 * 교관을 지정해 요청을 보낼 수 있게 한다(목록 응답의 content가 긴 내용에서 잘릴 수 있어
 * 맨 앞에 둔다). 지정하지 않으면 이 줄이 없고, 모든 승인된 교관에게 공개된 요청으로 취급한다.
 */
export function buildSignatureRequestContent(
  entry: LogbookEntry,
  account: AccountResponse,
  targetInstructor?: SignatureTargetInstructor,
): string {
  const lines: string[] = []
  if (targetInstructor) {
    lines.push(`대상 교관: ${targetInstructor.name} (${targetInstructor.userId})`)
  }
  lines.push(
    `날짜: ${entry.date}`,
    `기종: ${entry.aircraftType}`,
    `구간: ${entry.departure} → ${entry.arrival}`,
    `블록타임: ${formatBlockTime(entry.blockTime)}`,
    `비행 종류: ${entry.flightCategory}`,
    `이착륙: 주간 ${entry.dayLandings ?? 0}회 / 야간 ${entry.nightLandings ?? 0}회`,
    `메모: ${entry.notes?.trim() ? entry.notes.trim() : '-'}`,
    '',
    `요청자: ${account.name} (${account.user_id})`,
  )
  return lines.join('\n')
}

/** content에서 "대상 교관: {이름} ({아이디})" 줄의 아이디를 파싱한다. 없으면 null(공개 요청). */
export function parseTargetInstructorUserIdFromContent(content: string | null | undefined): string | null {
  if (!content) return null
  const match = content.match(/^\s*대상 교관:.*\(([^)]+)\)\s*$/m)
  return match ? match[1].trim() : null
}
