// "교관 승인" 게시판 전체 신청서를 조회한 뒤, 각 게시글의 댓글을 확인해 승인된 교관만
// 필터링해서 반환하는 Hook. 학생이 서명 요청을 보낼 때 "특정 교관 지정" 드롭다운에 사용된다.
//
// 게시글이 많지 않다는 전제 하에, 목록 조회 후 게시글별로 댓글 조회를 병렬로 수행한다
// (useComments 훅은 반복문 안에서 호출할 수 없어 - React Hooks 규칙 위반 - 이 훅 내부에서
// 직접 fetch를 호출한다).

import { useCallback, useEffect, useState } from 'react'

import { type ApiEnvelope, BAAS_BASE_URL, getAuthHeaders, parseJsonResponse } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import { fetchAuthorizedOrgIds } from '../../lib/baas/authorization'
import {
  parseAffiliationFromContent,
  parseInstructorApplicationTitle,
  parseTracksFromContent,
  resolveApprovalDecision,
} from '../../lib/baas/instructorApproval'
import { useInstructorApplications } from './useInstructorApplications'

import type { CommentListResponse } from '../../lib/baas/boardTypes'

export interface ApprovedInstructor {
  name: string
  userId: string
  /** content의 "소속: ..." 줄에서 파싱한 값. 없으면 "미상". */
  affiliation: string
  /** 승인받은 자격 구분. 구 형식(줄 없음)은 ['aircraft'] */
  tracks: Array<'aircraft' | 'lsa' | 'ultralight'>
}

interface UseApprovedInstructorsReturn {
  instructors: ApprovedInstructor[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

async function fetchCommentsForPost(postId: string): Promise<CommentListResponse | null> {
  try {
    const response = await baasFetch(`${BAAS_BASE_URL}/public/boards/posts/${postId}/comments`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    })
    const result = await parseJsonResponse<ApiEnvelope<CommentListResponse>>(response)
    if (result.result !== 'SUCCESS') return null
    return result.data ?? null
  } catch {
    return null
  }
}

export function useApprovedInstructors(): UseApprovedInstructorsReturn {
  const {
    data: applicationsData,
    isLoading: isLoadingApplications,
    error: applicationsError,
    refetch: refetchApplications,
  } = useInstructorApplications({ limit: 100 })

  const [instructors, setInstructors] = useState<ApprovedInstructor[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const resolveApproved = useCallback(async () => {
    const items = applicationsData?.items ?? []
    if (items.length === 0) {
      setInstructors([])
      return
    }

    setIsResolving(true)
    setResolveError(null)

    try {
      // [SEC-001] 기관 계정의 [APPROVED] 댓글만 유효 승인으로 인정한다.
      const orgIds = await fetchAuthorizedOrgIds()
      const results = await Promise.all(
        items.map(async (item) => {
          const parsed = parseInstructorApplicationTitle(item.title)
          if (!parsed) return null

          const comments = await fetchCommentsForPost(item.id)
          const decision = resolveApprovalDecision(comments?.items ?? [], orgIds)
          if (decision.status !== 'approved') return null

          const affiliation = parseAffiliationFromContent(item.content) ?? '미상'
          const tracks = parseTracksFromContent(item.content)
          return { name: parsed.name, userId: parsed.userId, affiliation, tracks }
        }),
      )
      setInstructors(results.filter((result): result is ApprovedInstructor => result !== null))
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : '승인된 교관 목록을 확인하지 못했습니다.')
    } finally {
      setIsResolving(false)
    }
  }, [applicationsData])

  useEffect(() => {
    void resolveApproved()
  }, [resolveApproved])

  const refetch = useCallback(async () => {
    await refetchApplications()
  }, [refetchApplications])

  return {
    instructors,
    isLoading: isLoadingApplications || isResolving,
    error: applicationsError || resolveError,
    refetch,
  }
}
