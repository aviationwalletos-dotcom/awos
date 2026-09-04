// 현재 계정이 승인된 교관인지 — approval_requests(schema12) 기준.
// 부채 3단계: 게시판 신청서 + [APPROVED] 댓글 파싱 → 테이블 status 조회로 교체.
// 구분(track)별 승인이므로 approvedTracks 를 함께 돌려준다.

import { useMyInstructorApprovals } from '../../lib/approvals/hooks'
import type { PilotTrack } from '../../lib/approvals/types'
import type { AccountResponse } from '../../lib/baas/types'

interface UseInstructorApprovalStatusReturn {
  /** 어느 구분이든 하나라도 승인된 교관인지 */
  isApproved: boolean
  /** 승인된 구분 목록 */
  approvedTracks: PilotTrack[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInstructorApprovalStatus(account: AccountResponse | null): UseInstructorApprovalStatusReturn {
  const { approvedTracks, isApprovedAny, isLoading, error, refetch } = useMyInstructorApprovals(account?.id ?? null)
  return {
    isApproved: isApprovedAny,
    approvedTracks,
    isLoading,
    error,
    refetch: async () => {
      await refetch()
    },
  }
}
