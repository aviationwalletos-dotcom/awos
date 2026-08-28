// 게시글 댓글 목록 조회 Hook (인증 불필요, 공개 API)
// 참고: baas-integration skill의 references/dynamic-board.md #7. 댓글 목록 조회 API

import { useCallback, useEffect, useState } from 'react'

import { type ApiEnvelope, BAAS_BASE_URL, getAuthHeaders, parseJsonResponse } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { CommentListResponse } from '../../lib/baas/boardTypes'

interface UseCommentsOptions {
  /** true면 postId가 있을 때 자동으로 목록을 조회한다. (기본값: true) */
  enabled?: boolean
  sort?: 'oldest' | 'newest'
}

interface UseCommentsReturn {
  data: CommentListResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<CommentListResponse | null>
}

export function useComments(postId: string | undefined | null, options: UseCommentsOptions = {}): UseCommentsReturn {
  const { enabled = true, sort } = options
  const [data, setData] = useState<CommentListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(enabled && postId))
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async (): Promise<CommentListResponse | null> => {
    if (!postId) return null

    setIsLoading(true)
    setError(null)

    try {
      const params = sort ? `?sort=${sort}` : ''
      const response = await baasFetch(`${BAAS_BASE_URL}/public/boards/posts/${postId}/comments${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
      })

      const result = await parseJsonResponse<ApiEnvelope<CommentListResponse>>(response)

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '댓글 목록을 불러오지 못했습니다.')
      }

      setData(result.data ?? null)
      return result.data ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : '댓글 목록을 불러오지 못했습니다.'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [postId, sort])

  useEffect(() => {
    if (enabled && postId) {
      void fetchComments()
    }
  }, [enabled, postId, fetchComments])

  return { data, isLoading, error, refetch: fetchComments }
}
