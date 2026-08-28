// "공유 게시판"(상태공유 용도) 게시글 작성 Hook
// 참고: baas-integration skill의 references/dynamic-board.md #2. 게시글 작성 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, STATUS_SHARE_BOARD_ID, getAuthHeaders, getBaasProjectId } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { BoardPostCreateRequest, BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseCreateStatusSharePostReturn {
  createStatusSharePost: (data: BoardPostCreateRequest) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useCreateStatusSharePost(): UseCreateStatusSharePostReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createStatusSharePost = useCallback(async (data: BoardPostCreateRequest): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      // 현재 로그인한 사용자 본인 명의로 작성되므로 쿠키/세션 인증을 사용한다.
      const response = await baasFetch(`${BAAS_BASE_URL}/boards/${getBaasProjectId()}/${STATUS_SHARE_BOARD_ID}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '상태 공유에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '상태 공유에 실패했습니다.'
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

  return { createStatusSharePost, isLoading, error, reset }
}
