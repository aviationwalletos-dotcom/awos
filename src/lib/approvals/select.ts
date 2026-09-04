// approval_requests 행 목록에서 화면 판정에 쓰는 순수 함수(훅과 분리해 테스트한다).

import type { ApprovalRequest, PilotTrack } from './types'

/**
 * 구분(track)별 대표 신청 1건을 고른다.
 *  - 취소된 요청은 무시
 *  - 승인된 것이 있으면 그것(승인은 되돌리지 않으므로 항상 우선)
 *  - 없으면 가장 최근 것(대기중/반려)
 */
export function pickInstructorRequestByTrack(rows: ApprovalRequest[]): Partial<Record<PilotTrack, ApprovalRequest>> {
  const out: Partial<Record<PilotTrack, ApprovalRequest>> = {}
  for (const row of rows) {
    if (row.kind !== 'instructor' || !row.track || row.status === 'cancelled') continue
    const prev = out[row.track]
    if (!prev) {
      out[row.track] = row
      continue
    }
    if (prev.status === 'approved') continue
    if (row.status === 'approved' || row.created_at > prev.created_at) out[row.track] = row
  }
  return out
}

export function approvedTracksOf(byTrack: Partial<Record<PilotTrack, ApprovalRequest>>): PilotTrack[] {
  return (Object.keys(byTrack) as PilotTrack[]).filter((t) => byTrack[t]?.status === 'approved')
}
