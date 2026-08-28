// 댓글 작성 Hook (로그인 + 프로젝트 소속 회원이면 본인 명의로 누구나 작성 가능)
// 참고: baas-integration skill의 references/dynamic-board.md #8. 댓글 작성 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders } from '../../lib/baas/config'
import type { CommentItem } from '../../lib/baas/boardTypes'

interface UseCreateCommentReturn {
  createComment: (content: string, parentId?: string) => Promise<CommentItem>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useCreateComment(postId: string | undefined | null): UseCreateCommentReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createComment = useCallback(async (content: string, parentId?: string): Promise<CommentItem> => {
    if (!postId) {
      throw new Error('댓글을 작성할 게시글 정보가 없습니다.')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BAAS_BASE_URL}/boards/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(parentId ? { content, parent_id: parentId } : { content }),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '댓글 작성에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '댓글 작성에 실패했습니다.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return { createComment, isLoading, error, reset }
}
