// 게시글 숨김 토글 Hook (교관 승인 게시판의 승인/반려 전환에 사용)
// 참고: baas-integration skill의 references/dynamic-board.md #6. 게시글 숨김 토글 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders } from '../../lib/baas/config'
import type { BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseTogglePostHiddenReturn {
  /** is_hidden: false = 승인 처리, true = 승인 대기(반려/재검토)로 되돌리기 */
  toggleHidden: (postId: string, isHidden: boolean) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useTogglePostHidden(): UseTogglePostHiddenReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleHidden = useCallback(async (postId: string, isHidden: boolean): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BAAS_BASE_URL}/boards/posts/${postId}/hidden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ is_hidden: isHidden }),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '처리 상태 변경에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '처리 상태 변경에 실패했습니다.'
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

  return { toggleHidden, isLoading, error, reset }
}
