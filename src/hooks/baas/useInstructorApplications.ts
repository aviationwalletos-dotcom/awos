// "교관 승인" 게시판 목록 조회 Hook
// 참고: baas-integration skill의 references/dynamic-board.md #1. 게시글 목록 조회 API

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type ApiEnvelope,
  BAAS_BASE_URL,
  INSTRUCTOR_APPROVAL_BOARD_ID,
  getAuthHeaders,
  getBaasProjectId,
  parseJsonResponse,
} from '../../lib/baas/config'
import type { BoardPostListResponse } from '../../lib/baas/boardTypes'

interface UseInstructorApplicationsOptions {
  /** true면 마운트 시 자동으로 목록을 조회한다. (기본값: true) */
  enabled?: boolean
  /** 조회 개수 (기본값: 100, 최대: 100) */
  limit?: number
}

interface UseInstructorApplicationsReturn {
  data: BoardPostListResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<BoardPostListResponse | null>
}

export function useInstructorApplications(options: UseInstructorApplicationsOptions = {}): UseInstructorApplicationsReturn {
  const { enabled = true, limit = 100 } = options
  const [data, setData] = useState<BoardPostListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const limitRef = useRef(limit)
  limitRef.current = limit

  const fetchApplications = useCallback(async (): Promise<BoardPostListResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ limit: String(limitRef.current) })
      const response = await fetch(
        `${BAAS_BASE_URL}/public/boards/${getBaasProjectId()}/${INSTRUCTOR_APPROVAL_BOARD_ID}/posts?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
        },
      )

      const result = await parseJsonResponse<ApiEnvelope<BoardPostListResponse>>(response)

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '교관 승인 신청 목록을 불러오지 못했습니다.')
      }

      setData(result.data ?? null)
      return result.data ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : '교관 승인 신청 목록을 불러오지 못했습니다.'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      void fetchApplications()
    }
  }, [enabled, fetchApplications])

  return { data, isLoading, error, refetch: fetchApplications }
}
