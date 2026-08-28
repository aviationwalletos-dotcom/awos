// 게시글 수정 Hook (작성자 본인만 가능, board_id와 무관한 범용 훅)
// 참고: baas-integration skill의 references/dynamic-board.md #4. 게시글 수정 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { BoardPostDetail, BoardPostUpdateRequest } from '../../lib/baas/boardTypes'

interface UseUpdateBoardPostReturn {
  updatePost: (postId: string, data: BoardPostUpdateRequest) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useUpdateBoardPost(): UseUpdateBoardPostReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePost = useCallback(async (postId: string, data: BoardPostUpdateRequest): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      // PUT /boards/posts/{post_id}는 작성자 본인만 호출할 수 있으므로, 본인 게시글을
      // 갱신하는 용도로만 사용해야 한다(다른 사람 게시글에 사용하면 FORBIDDEN 응답).
      const response = await baasFetch(`${BAAS_BASE_URL}/boards/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '게시글 수정에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '게시글 수정에 실패했습니다.'
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

  return { updatePost, isLoading, error, reset }
}
