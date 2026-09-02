// "문의" 게시판 인증 요청 게시글 작성 Hook (요청 1건당 게시글 1건)
// 참고: baas-integration skill의 references/dynamic-board.md #2. 게시글 작성 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, INQUIRY_BOARD_ID, getAuthHeaders, getBaasProjectId } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { BoardPostCreateRequest, BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseCreateInquiryPostReturn {
  createInquiryPost: (data: BoardPostCreateRequest) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useCreateInquiryPost(): UseCreateInquiryPostReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInquiryPost = useCallback(async (data: BoardPostCreateRequest): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      // 기관 계정이 승인 관리 화면에서 목록/상세를 조회할 수 있어야 하므로 항상 공개(is_hidden: false)로
      // 생성한다(BUG-006: 숨김 게시글은 작성자 본인만 조회할 수 있어 기관 계정에는 보이지 않는다).
      const response = await baasFetch(
        `${BAAS_BASE_URL}/boards/${getBaasProjectId()}/${INQUIRY_BOARD_ID}/posts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify({ is_hidden: false, ...data }),
        },
      )

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '문의 등록에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '문의 등록에 실패했습니다.'
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

  return { createInquiryPost, isLoading, error, reset }
}
