// "교관 승인" 게시판 기준으로 현재 계정이 승인된 교관인지 판정하는 Hook.
// [BUG-004 수정] 승인 여부는 더 이상 게시글 is_hidden이 아니라, 신청 게시글에 달린
// [APPROVED]/[REJECTED] 댓글(lib/baas/instructorApproval.ts)로 판정한다.
// [BUG-008 수정] 신청서 매칭에 이름 완전 일치 근사 매칭(findLatestInstructorApplicationByName)을
// 폴백으로 사용하면 동명이인일 경우 전혀 다른 사람의 승인 상태를 가져올 위험이 있다(교관 승인
// 신청을 한 적 없는 계정도 우연히 같은 이름의 다른 계정이 승인된 교관이면 "서명 요청함" 탭이
// 잘못 노출됨). "서명 요청함" 탭 노출 여부처럼 신뢰성이 중요한 판정에는 제목에 포함된
// 이메일(user_id) 완전 일치만 사용하고, 이름 기반 근사 매칭은 사용하지 않는다.

import { useCallback, useMemo } from 'react'

import { findInstructorApplicationByUserId, isApprovedByComments } from '../../lib/baas/instructorApproval'
import { useComments } from './useComments'
import { useInstructorApplications } from './useInstructorApplications'

import type { AccountResponse } from '../../lib/baas/types'

interface UseInstructorApprovalStatusReturn {
  /** 현재 계정이 "교관 승인" 게시판 기준으로 승인 완료된 교관인지 여부 */
  isApproved: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInstructorApprovalStatus(account: AccountResponse | null): UseInstructorApprovalStatusReturn {
  const {
    data: applicationsData,
    isLoading: isLoadingApplications,
    error: applicationsError,
    refetch: refetchApplications,
  } = useInstructorApplications({ enabled: Boolean(account) })

  const myApplication = useMemo(() => {
    if (!account) return null
    const items = applicationsData?.items ?? []
    return findInstructorApplicationByUserId(items, account.user_id)
  }, [applicationsData, account])

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    error: commentsError,
    refetch: refetchComments,
  } = useComments(myApplication?.id, { enabled: Boolean(myApplication) })

  const isApproved = useMemo(() => isApprovedByComments(commentsData?.items ?? []), [commentsData])

  const refetch = useCallback(async () => {
    await refetchApplications()
    if (myApplication) {
      await refetchComments()
    }
  }, [refetchApplications, refetchComments, myApplication])

  return {
    isApproved,
    isLoading: isLoadingApplications || (Boolean(myApplication) && isLoadingComments),
    error: applicationsError || commentsError,
    refetch,
  }
}
