// ============================================================================
// 승인·서명 권한 검증 (SEC-001)
// ============================================================================
// [문제] 기존에는 [APPROVED]/[REJECTED]/[SIGNED] 댓글의 "내용 접두어"만 보고 판정했다.
// 게시판 정책상 로그인 회원 누구나 댓글을 달 수 있으므로, 학생이 자기 게시글에 직접
// "[SIGNED] ..." 댓글을 달아 셀프 서명하는 위조가 가능했다.
//
// [해결] 판정에 "작성자 권한" 조건을 추가한다.
//  - 승인/반려([APPROVED]/[REJECTED]) 댓글: authorized_orgs 테이블(Supabase, 관리자가
//    대시보드에서만 등록)에 있는 기관 계정이 쓴 것만 유효.
//  - 서명([SIGNED]) 댓글: "기관에게 승인 완료된 교관" 계정이 쓴 것만 유효.
//
// [Fail-closed 원칙] 권한 목록을 아직 못 불러왔거나(로딩/오류) 테이블이 비어 있으면
// 아무 댓글도 유효 처리하지 않는다. 위조 허용보다 판정 보류가 안전하다.
// 주의: supabase/schema3-authorization.sql을 실행하고 기관 계정을 등록하기 전까지는
// 새로운 승인·서명이 인정되지 않는다(기존에 저장된 서명 상태는 영향 없음).

import { useEffect, useState } from 'react'

import { supabase } from '../supabase/client'
import { fetchApprovedInstructorIdSet, invalidateApprovalCaches } from '../approvals/api'

/** 로딩 중이거나 실패했을 때 쓰는 빈 집합(어떤 작성자도 통과 못 함 = fail-closed). */
export const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>()

const CACHE_TTL_MS = 2 * 60 * 1000 // 2분: 승인 직후 반영 지연을 짧게 유지

// ---------------------------------------------------------------------------
// 1) 기관 계정 목록 (authorized_orgs 테이블)
// ---------------------------------------------------------------------------

let orgIdsCache: { at: number; promise: Promise<ReadonlySet<string>> } | null = null

async function fetchAuthorizedOrgIdsOnce(): Promise<ReadonlySet<string>> {
  try {
    const { data, error } = await supabase.from('authorized_orgs').select('user_id')
    if (error) {
      // 테이블이 아직 없거나(SQL 미실행) 조회 실패 → 빈 집합(fail-closed)
      console.warn('[authorization] authorized_orgs 조회 실패 — 승인·서명 판정을 보류합니다:', error.message)
      return EMPTY_ID_SET
    }
    return new Set((data ?? []).map((row) => String((row as { user_id: unknown }).user_id)))
  } catch (e) {
    console.warn('[authorization] authorized_orgs 조회 중 오류:', e)
    return EMPTY_ID_SET
  }
}

/** 기관 계정 user_id 집합을 반환한다(2분 캐시, 동시 호출은 한 번만 요청). */
export function fetchAuthorizedOrgIds(): Promise<ReadonlySet<string>> {
  const now = Date.now()
  if (orgIdsCache && now - orgIdsCache.at < CACHE_TTL_MS) return orgIdsCache.promise
  const promise = fetchAuthorizedOrgIdsOnce()
  orgIdsCache = { at: now, promise }
  return promise
}

/** 컴포넌트에서 기관 계정 집합을 쓰기 위한 훅. 로딩 중이면 null. */
export function useAuthorizedOrgIds(): { orgIds: ReadonlySet<string> | null } {
  const [orgIds, setOrgIds] = useState<ReadonlySet<string> | null>(null)
  useEffect(() => {
    let alive = true
    void fetchAuthorizedOrgIds().then((ids) => {
      if (alive) setOrgIds(ids)
    })
    return () => {
      alive = false
    }
  }, [])
  return { orgIds }
}

// ---------------------------------------------------------------------------
// 2) 승인 교관 집합 — approval_requests(schema12) 기준
// ---------------------------------------------------------------------------
// 부채 3단계: 게시판 신청서 전체 조회 + 댓글 배치 파싱 → 테이블 1회 조회(lib/approvals/api).
// 집합의 원소는 auth 사용자 uuid 다(서명 판정의 decided_by / target_id 와 같은 키).

/** "승인 완료된 교관" uuid 집합을 반환한다(2분 캐시). */
export function fetchApprovedInstructorIds(): Promise<ReadonlySet<string>> {
  return fetchApprovedInstructorIdSet()
}

/** 컴포넌트에서 승인 교관 집합을 쓰기 위한 훅. 로딩 중이면 null. */
export function useApprovedInstructorIdSet(): { instructorIds: ReadonlySet<string> | null } {
  const [instructorIds, setInstructorIds] = useState<ReadonlySet<string> | null>(null)
  useEffect(() => {
    let alive = true
    void fetchApprovedInstructorIds().then((ids) => {
      if (alive) setInstructorIds(ids)
    })
    return () => {
      alive = false
    }
  }, [])
  return { instructorIds }
}

/** 승인/서명 직후 캐시를 비워 다음 판정에 즉시 반영되게 한다. */
export function invalidateAuthorizationCaches(): void {
  orgIdsCache = null
  invalidateApprovalCaches()
}
