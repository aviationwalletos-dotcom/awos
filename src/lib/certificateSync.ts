// "자격증관리" 게시판을 이용한 자격증(자격/면허) 서버 동기화 제목/본문 포맷 및 파싱 유틸
//
// 자격증 1건당 게시글 1건으로 저장한다. content에는 자격증 데이터를 JSON.stringify로
// 한 줄 문자열(들여쓰기 없음 → 줄바꿈 없음)로 그대로 담는다. 목록 조회 API
// (`GET /public/boards/{project_id}/{board_id}/posts`)의 content는 "미리보기(HTML 태그 제거)"라서
// 원본 줄바꿈이 보존된다는 보장이 없는데(다른 게시판 연동에서 실제로 겪은 문제, 관련 주석은
// src/lib/baas/instructorApproval.ts 참고), 애초에 줄바꿈이 없는 한 줄 JSON 문자열을 쓰면
// 이 문제 자체를 피할 수 있다. 다만 안전하게, 실제 자격증 데이터를 읽어야 하는 곳(초기 동기화 등)은
// 항상 상세 조회(`GET /public/boards/posts/{post_id}`, 원본 content를 그대로 준다)를 사용한다.
//
// 제목에는 본인 게시글 필터링에 쓰이는 계정 아이디(이메일)를 포함한다("교관 승인"/"서명 요청" 게시판과
// 동일한 패턴). 목록 조회 API 응답에는 author_id가 없어(author_name만 제공), 제목에 포함해두지
// 않으면 다른 회원의 게시글과 구분할 방법이 없다.

import type { Certificate } from '../types/certificate'
import type { BoardPostListItem } from './baas/boardTypes'

const TITLE_PREFIX = '자격증'

/** 자격증 게시글 제목 — 본인 게시글 필터링용으로 계정 아이디(이메일)를 포함한다. */
export function buildCertificateTitle(userId: string): string {
  return `${TITLE_PREFIX} - ${userId}`
}

/** 제목에 포함된 이메일(userId)로 본인 명의의 자격증 게시글만 걸러낸다. */
export function findCertificatePostsByUserId(items: BoardPostListItem[], userId: string): BoardPostListItem[] {
  const marker = `${TITLE_PREFIX} - ${userId}`
  return items.filter((item) => item.title === marker)
}

/** 자격증 게시글 본문 — JSON.stringify는 들여쓰기 없이 호출하면 줄바꿈 없는 한 줄 문자열이 된다. */
export function buildCertificateContent(certificate: Certificate): string {
  return JSON.stringify(certificate)
}

/**
 * 삭제된 자격증 게시글의 본문(content)에 남기는 "삭제됨" 마커(BUG-014 후속).
 * 로컬(기기별) tombstone만으로는 다른 기기가 서버 게시글을 그대로 병합해버리는 문제가 있어,
 * 서버 게시글 자체의 content를 이 마커로 덮어써(update) 어떤 기기에서 동기화하든 삭제된 것으로
 * 인식하게 한다. 별도의 서버 tombstone 게시판을 새로 만들지 않고 기존 update API만 재사용한다.
 */
export function buildDeletedCertificateContent(): string {
  return JSON.stringify({ deleted: true })
}

/**
 * 게시글 content(JSON 문자열)를 Certificate 객체로 복원한다.
 * 파싱 실패나 필수 필드 누락 시, 또는 "삭제됨" 마커(BUG-014 후속)인 경우 안전하게 null을 반환한다
 * (호출부에서 조용히 무시할 것).
 */
export function parseCertificateFromContent(content: string | null | undefined): Certificate | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object') return null
    // 삭제 마커: 다른 기기에서 삭제된 자격증이 재동기화되지 않도록 병합 대상에서 제외한다.
    if ((parsed as { deleted?: unknown }).deleted === true) return null
    const candidate = parsed as Partial<Certificate>
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.category !== 'string' ||
      typeof candidate.issuer !== 'string' ||
      typeof candidate.issuedDate !== 'string' ||
      typeof candidate.createdAt !== 'number' ||
      typeof candidate.updatedAt !== 'number'
    ) {
      return null
    }
    return candidate as Certificate
  } catch {
    return null
  }
}
