// 게시글 상세 조회 Hook (board_id와 무관한 범용 훅, 원본 content를 그대로 반환)
// 참고: baas-integration skill의 references/dynamic-board.md #3. 게시글 상세 조회 API
//
// 목록 조회 API의 content는 "미리보기(HTML 태그 제거)"라 원본 줄바꿈/서식이 보존된다는
// 보장이 없다. 원본 content가 필요한 경우(예: JSON 직렬화 데이터 파싱) 이 훅을 사용한다.

import { useCallback, useState } from 'react'

import { type ApiEnvelope, BAAS_BASE_URL, getAuthHeaders, parseJsonResponse } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseBoardPostDetailReturn {
  fetchDetail: (postId: string) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useBoardPostDetail(): UseBoardPostDetailReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async (postId: string): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await baasFetch(`${BAAS_BASE_URL}/public/boards/posts/${postId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
      })

      const result = await parseJsonResponse<ApiEnvelope<BoardPostDetail>>(response)

      if (result.result !== 'SUCCESS' || !result.data) {
        throw new Error(result.message || '게시글 상세 조회에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '게시글 상세 조회에 실패했습니다.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return { fetchDetail, isLoading, error, reset }
}
