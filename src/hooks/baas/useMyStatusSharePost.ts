// 로그인한 본인 명의로 이미 작성된 상태공유 게시글이 있는지 찾는 Hook
// (findInstructorApplicationByUserId 패턴과 동일 — 제목에 포함된 이메일로 매칭한다.)

import { useMemo } from 'react'

import { findStatusSharePostByUserId } from '../../lib/statusShare'
import type { BoardPostListItem } from '../../lib/baas/boardTypes'
import { useStatusSharePosts } from './useStatusSharePosts'

interface UseMyStatusSharePostReturn {
  post: BoardPostListItem | null
  isLoading: boolean
  error: string | null
  /**
   * 전체 페이지를 순차 조회해(`refetchAll`) 최신 게시글 배열을 반환한다. 소속 기관의 상태공유
   * 게시글 총량이 100건(1페이지)을 넘어도 본인 게시글을 누락 없이 찾을 수 있도록, 목록 1페이지만
   * 보는 `refetch` 대신 `refetchAll`을 사용한다.
   */
  refetch: () => Promise<BoardPostListItem[] | null>
}

export function useMyStatusSharePost(userId: string | null | undefined): UseMyStatusSharePostReturn {
  const { data, isLoading, error, refetchAll } = useStatusSharePosts({ enabled: Boolean(userId) })

  const post = useMemo(() => {
    if (!userId) return null
    return findStatusSharePostByUserId(data?.items ?? [], userId)
  }, [data, userId])

  return { post, isLoading, error, refetch: refetchAll }
}
