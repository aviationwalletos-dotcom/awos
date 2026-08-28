// "자격증관리" 게시판 목록 조회 Hook
// 참고: baas-integration skill의 references/dynamic-board.md #1. 게시글 목록 조회 API
//
// 자격증 데이터 자체는 상세 조회(useBoardPostDetail)로 가져오므로, 이 훅은 "본인 명의로 된
// 자격증 게시글 id 목록"을 찾는 용도(초기 서버 동기화 등)로 주로 사용한다.

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type ApiEnvelope,
  BAAS_BASE_URL,
  CERTIFICATE_BOARD_ID,
  getAuthHeaders,
  getBaasProjectId,
  parseJsonResponse,
} from '../../lib/baas/config'
import type { BoardPostListItem, BoardPostListResponse } from '../../lib/baas/boardTypes'

interface UseCertificateBoardPostsOptions {
  /** true면 마운트 시 자동으로 목록을 조회한다. (기본값: true) */
  enabled?: boolean
  /** 조회 개수 (기본값: 100, 최대: 100) */
  limit?: number
}

interface UseCertificateBoardPostsReturn {
  data: BoardPostListResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<BoardPostListResponse | null>
  /**
   * offset/limit으로 전체 페이지를 순차 조회해 모든 게시글을 하나의 배열로 합쳐 반환한다.
   * 목록 조회 API는 1회 최대 100건만 반환하므로, 100건을 초과하는 회원 기록도 누락 없이
   * 가져오기 위한 용도(초기 서버 동기화 전용). 실패 시 그때까지 모은 게시글만 반환하거나(부분 성공),
   * 첫 페이지부터 실패하면 null을 반환한다. `refetch()`(단일 페이지)는 하위 호환을 위해 그대로 둔다.
   */
  refetchAll: () => Promise<BoardPostListItem[] | null>
}

/** 한 번에 조회할 페이지 크기(목록 조회 API 최대값) */
const PAGE_SIZE = 100
/** 무한 루프 방지를 위한 최대 페이지 수 상한 (최대 5000건까지 조회) */
const MAX_PAGES = 50

async function fetchCertificatePostsPage(offset: number, limit: number): Promise<BoardPostListResponse> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  const response = await fetch(
    `${BAAS_BASE_URL}/public/boards/${getBaasProjectId()}/${CERTIFICATE_BOARD_ID}/posts?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    },
  )

  const result = await parseJsonResponse<ApiEnvelope<BoardPostListResponse>>(response)

  if (result.result !== 'SUCCESS' || !result.data) {
    throw new Error(result.message || '자격증 게시글 목록을 불러오지 못했습니다.')
  }

  return result.data
}

export function useCertificateBoardPosts(options: UseCertificateBoardPostsOptions = {}): UseCertificateBoardPostsReturn {
  const { enabled = true, limit = 100 } = options
  const [data, setData] = useState<BoardPostListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const limitRef = useRef(limit)
  limitRef.current = limit

  const fetchPosts = useCallback(async (): Promise<BoardPostListResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const pageData = await fetchCertificatePostsPage(0, limitRef.current)
      setData(pageData)
      return pageData
    } catch (err) {
      const message = err instanceof Error ? err.message : '자격증 게시글 목록을 불러오지 못했습니다.'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetchAll = useCallback(async (): Promise<BoardPostListItem[] | null> => {
    setIsLoading(true)
    setError(null)

    const collected: BoardPostListItem[] = []

    try {
      let offset = 0
      let totalCount = Infinity

      for (let page = 0; page < MAX_PAGES && offset < totalCount; page += 1) {
        try {
          const pageData = await fetchCertificatePostsPage(offset, PAGE_SIZE)
          collected.push(...pageData.items)
          totalCount = pageData.total_count
          offset += PAGE_SIZE

          if (page === 0) {
            setData(pageData)
          }

          // 서버가 total_count보다 적은 항목을 계속 반환하면(예: 0건) 무한 루프 방지를 위해 중단
          if (pageData.items.length === 0) break
        } catch (err) {
          if (collected.length === 0) {
            const message = err instanceof Error ? err.message : '자격증 게시글 목록을 불러오지 못했습니다.'
            setError(message)
            return null
          }
          // 이미 일부 페이지를 모았다면 부분 성공으로 반환해 호출부(초기 동기화)가 에러 없이 진행되게 한다.
          console.warn('[자격증 게시글 전체 목록 조회 중 일부 페이지 실패]', err)
          break
        }
      }

      return collected
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      void fetchPosts()
    }
  }, [enabled, fetchPosts])

  return { data, isLoading, error, refetch: fetchPosts, refetchAll }
}
