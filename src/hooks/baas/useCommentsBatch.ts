// 여러 게시글의 댓글을 한 번의 요청으로 가져와 post_id 별로 나눈다.
// 서명 요청함처럼 목록의 각 항목 상태를 댓글로 판정하는 화면에서 N+1 요청을 없앤다.
import { useCallback, useEffect, useMemo, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders, parseJsonResponse } from '../../lib/baas/config'
import type { ApiEnvelope } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { CommentItem, CommentListResponse } from '../../lib/baas/boardTypes'

export function useCommentsBatch(postIds: string[]) {
  const key = useMemo(() => [...postIds].sort().join(','), [postIds])
  const [byPost, setByPost] = useState<Record<string, CommentItem[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!key) {
      setByPost({})
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await baasFetch(`${BAAS_BASE_URL}/public/boards/comments/batch?post_ids=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
      })
      const parsed = await parseJsonResponse<ApiEnvelope<CommentListResponse>>(res)
      if (parsed.result !== 'SUCCESS' || !parsed.data) throw new Error(parsed.message || '댓글 조회 실패')
      const map: Record<string, CommentItem[]> = {}
      for (const c of parsed.data.items) (map[c.post_id] ??= []).push(c)
      setByPost(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : '댓글 조회 실패')
    } finally {
      setIsLoading(false)
    }
  }, [key])

  useEffect(() => {
    void load()
  }, [load])

  return { byPost, isLoading, error, refetch: load }
}
