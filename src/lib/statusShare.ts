// "공유 게시판"을 이용한 회원 상태 공유(status share) 게시글의 제목/본문 포맷 및 파싱 유틸
//
// 목록 조회 API(`GET /public/boards/{project_id}/{board_id}/posts`)의 `content` 필드는
// dynamic-board.md에 "내용 미리보기(HTML 태그 제거)"로 명시되어 있고, 실제로 원본 줄바꿈이
// 보존된다는 보장이 없다(src/lib/baas/instructorApproval.ts의 BUG 주석 참고 — 줄바꿈 기준
// 멀티라인 정규식이 실제로는 항상 실패했던 사례가 있다). 따라서 이 파일의 본문 파싱 함수는
// 줄 시작/끝 앵커(^...$, m 플래그)에 의존하지 않고, 순서대로 나타나는 구분자(":", "/")만으로
// 값을 찾는 단순 정규식을 사용한다 — 줄바꿈이 보존되든 공백으로 뭉개지든 동일하게 동작한다.
// 제목은 목록 API에서도 가공 없이 그대로 내려오므로, 소속 기관/이메일은 기존 "교관 승인" 게시판과
// 동일하게 제목에 포함해 안전하게 보존한다.

import type { Certificate } from '../types/certificate'
import { CERTIFICATE_STATUS_LABEL, type CertificateStatus, daysUntil } from '../types/certificate'
import type { ReadinessState } from './flightReadiness'
import type { BoardPostListItem } from './baas/boardTypes'

const TITLE_PREFIX = '상태공유'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 본문의 "마지막 갱신" 줄에 쓰이는 고정 포맷(YYYY-MM-DD HH:mm). */
export function formatStatusShareDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const h = pad2(date.getHours())
  const mi = pad2(date.getMinutes())
  return `${y}-${m}-${d} ${h}:${mi}`
}

/**
 * 상태공유 게시글 제목 — 이후 본인 게시글 매칭에 쓰이는 이메일(user_id)과, 기관 대시보드의
 * 소속 필터링에 쓰이는 소속 기관을 함께 포함한다(목록 API에서도 가공 없이 보존되는 필드는
 * title뿐이므로 "교관 승인" 게시판과 동일한 패턴을 따른다).
 */
export function buildStatusShareTitle(name: string, userId: string, affiliation?: string): string {
  const base = `${TITLE_PREFIX} - ${name} (${userId})`
  const trimmedAffiliation = affiliation?.trim()
  return trimmedAffiliation ? `${base} [${trimmedAffiliation}]` : base
}

/** 상태공유 게시글 제목에서 이름/이메일(userId)을 파싱한다. 형식이 다르면 null. */
export function parseStatusShareTitle(title: string): { name: string; userId: string } | null {
  const match = title.match(new RegExp(`^${TITLE_PREFIX} - (.+) \\(([^)]+)\\)(?:\\s*\\[[^\\]]*\\])?$`))
  if (!match) return null
  return { name: match[1].trim(), userId: match[2].trim() }
}

/** 상태공유 게시글 제목 끝의 `[{affiliation}]` 접미사에서 소속 기관을 파싱한다. 없으면 null. */
export function parseAffiliationFromStatusShareTitle(title: string): string | null {
  const match = title.match(/\[([^[\]]+)\]\s*$/)
  return match ? match[1].trim() : null
}

/**
 * 소속 기관 문자열 비교용 정규화. 앞뒤 공백 제거 + 소문자 변환 + 연속 공백을 1칸으로 축소한다.
 * 개인 계정이 입력한 소속 문자열과 기관 계정의 organization_affiliation 값 사이에 흔히 발생하는
 * 공백/대소문자 차이로 인해 완전 일치(===) 비교가 실패해 회원이 필터링되어 빠지는 문제를 막기
 * 위해 사용한다. 화면에 표시되는 원본 문자열 자체는 그대로 유지하고, 비교 시에만 사용한다.
 */
export function normalizeAffiliation(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** 제목에 포함된 이메일(userId)로 본인 게시글을 찾는다(가장 최근 것). */
export function findStatusSharePostByUserId(items: BoardPostListItem[], userId: string): BoardPostListItem | null {
  const matches = items.filter((item) => parseStatusShareTitle(item.title)?.userId === userId)
  if (matches.length === 0) return null
  return matches.reduce((latest, item) => (new Date(item.created_at) > new Date(latest.created_at) ? item : latest))
}

// ── 본문(content) 빌드 ──────────────────────────────────────────────────────

export interface NearestExpiringCertificate {
  name: string
  expiryDate: string
}

/** 만료일이 있는 자격증 중 가장 임박한(D-day가 가장 작은) 것을 찾는다. 없으면 null. */
export function findNearestExpiringCertificate(certificates: Certificate[]): NearestExpiringCertificate | null {
  const withExpiry = certificates.filter((c): c is Certificate & { expiryDate: string } => Boolean(c.expiryDate))
  if (withExpiry.length === 0) return null
  const nearest = withExpiry.reduce((soonest, c) =>
    daysUntil(c.expiryDate) < daysUntil(soonest.expiryDate) ? c : soonest,
  )
  return { name: nearest.name, expiryDate: nearest.expiryDate }
}

function formatMedicalStatusLine(label: string, status: CertificateStatus | null): string {
  if (!status) return `${label}: 미등록`
  return `${label}: ${CERTIFICATE_STATUS_LABEL[status]}`
}

export interface StatusShareContentInput {
  overallGo: boolean
  states: ReadinessState[]
  class1Status: CertificateStatus | null
  class2Status: CertificateStatus | null
  class3Status?: CertificateStatus | null
  certificates: Certificate[]
  /** 기관 대시보드 "구성원 현황" 탭에서 역할별로 표시하기 위한 개인 역할 한글 라벨(예: "조종사"). */
  roleLabel: string
  /** 기관 대시보드 "구성원 현황" 탭에서 표시하기 위한 누적 비행시간(블록타임 합계, 시간 단위). */
  totalHours: number
  updatedAt?: Date
}

/** 상태공유 게시글 본문(사람이 읽기 쉬운 텍스트)을 만든다. */
export function buildStatusShareContent(input: StatusShareContentInput): string {
  const updatedAt = input.updatedAt ?? new Date()
  const nearest = findNearestExpiringCertificate(input.certificates)

  const lines: string[] = []
  lines.push(`종합 상태: ${input.overallGo ? 'GO' : 'NO-GO'}`)
  lines.push(`직무: ${input.roleLabel}`)
  lines.push(`누적 비행시간: ${input.totalHours.toFixed(1)}h`)
  lines.push('')
  lines.push('세부 상태:')
  for (const state of input.states) {
    const reasonPart = !state.met && state.reasons.length > 0 ? ` (사유: ${state.reasons.join('; ')})` : ''
    lines.push(`- ${state.label}: ${state.met ? '가능' : '제한'}${reasonPart}`)
  }
  lines.push('')
  lines.push(formatMedicalStatusLine('항공신체검사 제1종', input.class1Status))
  lines.push(formatMedicalStatusLine('항공신체검사 제2종', input.class2Status))
  if (input.class3Status !== undefined) {
    lines.push(formatMedicalStatusLine('항공신체검사 제3종', input.class3Status))
  }
  lines.push('')
  if (nearest) {
    lines.push(`가장 임박한 자격증 만료: ${nearest.name} / ${nearest.expiryDate} / D-day ${daysUntil(nearest.expiryDate)}`)
  } else {
    lines.push('가장 임박한 자격증 만료: 없음(만료일이 있는 자격증 미등록)')
  }
  lines.push('')
  lines.push(`마지막 갱신: ${formatStatusShareDateTime(updatedAt)}`)
  return lines.join('\n')
}

// ── 본문(content) 파싱 (기관 대시보드에서 목록 미리보기 기준으로 사용) ─────────────────────

/** 본문(또는 목록 미리보기)에서 종합 상태(GO/NO-GO)를 파싱한다. 찾지 못하면 null. */
export function parseOverallGoFromContent(content: string | null | undefined): boolean | null {
  if (!content) return null
  const match = content.match(/종합\s*상태:\s*(NO-GO|GO)/)
  if (!match) return null
  return match[1] === 'GO'
}

export interface ParsedNearestExpiry {
  name: string
  expiryDate: string
  daysUntil: number
}

/** 본문(또는 목록 미리보기)에서 가장 임박한 자격증 만료 정보를 파싱한다. 없거나 형식이 다르면 null. */
export function parseNearestExpiryFromContent(content: string | null | undefined): ParsedNearestExpiry | null {
  if (!content) return null
  const match = content.match(/가장\s*임박한\s*자격증\s*만료:\s*([^/]+)\/\s*(\d{4}-\d{2}-\d{2})\s*\/\s*D-day\s*(-?\d+)/)
  if (!match) return null
  return { name: match[1].trim(), expiryDate: match[2], daysUntil: Number(match[3]) }
}

/** 본문(또는 목록 미리보기)에서 "마지막 갱신" 일시 문자열(YYYY-MM-DD HH:mm)을 파싱한다. 없으면 null. */
export function parseUpdatedAtFromContent(content: string | null | undefined): string | null {
  if (!content) return null
  const match = content.match(/마지막\s*갱신:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/)
  return match ? match[1] : null
}

/**
 * 본문(또는 목록 미리보기)에서 "직무" 라벨을 파싱한다. 줄바꿈이 공백으로 뭉개진 경우에도
 * 동작하도록, 다음 필드("누적 비행시간:")가 나타나기 전까지(또는 문자열 끝까지)를
 * 값으로 취급한다(`[\s\S]`로 개행 여부와 무관하게 매칭). 형식이 다르거나 값이 비어있으면 null.
 */
export function parseRoleLabelFromContent(content: string | null | undefined): string | null {
  if (!content) return null
  const match = content.match(/직무:\s*([\s\S]+?)\s*(?:누적\s*비행시간:|$)/)
  if (!match) return null
  const label = match[1].trim()
  return label ? label : null
}

/** 본문(또는 목록 미리보기)에서 누적 비행시간(시간 단위 숫자)을 파싱한다. 없거나 형식이 다르면 null. */
export function parseTotalHoursFromContent(content: string | null | undefined): number | null {
  if (!content) return null
  const match = content.match(/누적\s*비행시간:\s*(-?\d+(?:\.\d+)?)\s*h/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}
