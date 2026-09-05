// 승인된 교관 목록 — approval_requests(schema12) 기준.
// 학생이 서명 요청을 보낼 때 "특정 교관 지정" 드롭다운에 사용된다.
// 부채 3단계: 게시판 신청서 전체 조회 + 게시글별 댓글 조회 → 테이블 1회 조회로 교체.

import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchApprovedInstructors, invalidateApprovalCaches } from '../../lib/approvals/api'
import type { ApprovedInstructor as ApprovedInstructorRow, PilotTrack } from '../../lib/approvals/types'

export interface ApprovedInstructor {
  name: string
  /** auth 사용자 uuid — 서명 요청의 target_id 로 그대로 쓴다 */
  userId: string
  /** 소속. 없으면 "미상". */
  affiliation: string
  /** 승인받은 자격 구분(복수) */
  tracks: PilotTrack[]
}

interface UseApprovedInstructorsReturn {
  instructors: ApprovedInstructor[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function groupByUser(rows: ApprovedInstructorRow[]): ApprovedInstructor[] {
  const map = new Map<string, ApprovedInstructor>()
  for (const r of rows) {
    const cur = map.get(r.userId)
    if (cur) {
      if (!cur.tracks.includes(r.track)) cur.tracks.push(r.track)
      if (cur.affiliation === '미상' && r.affiliation) cur.affiliation = r.affiliation
    } else {
      map.set(r.userId, {
        name: r.name,
        userId: r.userId,
        affiliation: r.affiliation || '미상',
        tracks: [r.track],
      })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function useApprovedInstructors(): UseApprovedInstructorsReturn {
  const [rows, setRows] = useState<ApprovedInstructorRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await fetchApprovedInstructors())
    } catch (err) {
      setError(err instanceof Error ? err.message : '승인 교관 목록을 불러오지 못했습니다.')
      setRows([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refetch = useCallback(async () => {
    invalidateApprovalCaches()
    await load()
  }, [load])

  const instructors = useMemo(() => groupByUser(rows ?? []), [rows])
  return { instructors, isLoading: rows === null, error, refetch }
}
