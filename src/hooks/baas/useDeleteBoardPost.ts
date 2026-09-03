// 게시글 삭제 Hook (작성자 본인 또는 프로젝트 소유자만 가능)
// 참고: baas-integration skill의 references/dynamic-board.md #5. 게시글 삭제 API
import { deletePrivateRecord, parsePrivatePostId } from '../../lib/baas/privateTables'

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'

interface UseDeleteBoardPostReturn {
  deletePost: (postId: string) => Promise<void>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useDeleteBoardPost(): UseDeleteBoardPostReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePost = useCallback(async (postId: string): Promise<void> => {
      {
        const privateRef = parsePrivatePostId(postId)
        if (privateRef) {
          await deletePrivateRecord(privateRef.table, privateRef.appId)
          return
        }
      }
    setIsLoading(true)
    setError(null)

    try {
      const response = await baasFetch(`${BAAS_BASE_URL}/boards/posts/${postId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '게시글 삭제에 실패했습니다.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.'
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

  return { deletePost, isLoading, error, reset }
}
