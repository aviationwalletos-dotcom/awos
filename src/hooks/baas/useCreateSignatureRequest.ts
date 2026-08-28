// "서명 요청" 게시판 게시글(서명 요청) 작성 Hook
// 참고: baas-integration skill의 references/dynamic-board.md #2. 게시글 작성 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, SIGNATURE_REQUEST_BOARD_ID, getAuthHeaders, getBaasProjectId } from '../../lib/baas/config'
import type { BoardPostCreateRequest, BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseCreateSignatureRequestReturn {
  createRequest: (data: BoardPostCreateRequest) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useCreateSignatureRequest(): UseCreateSignatureRequestReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRequest = useCallback(async (data: BoardPostCreateRequest): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      // 서명 요청은 학생 본인 명의로 작성되므로 쿠키/세션 인증을 사용한다. 요청 게시글은 숨김
      // 처리할 필요가 없다(교관이 목록에서 바로 볼 수 있어야 한다).
      const response = await fetch(`${BAAS_BASE_URL}/boards/${getBaasProjectId()}/${SIGNATURE_REQUEST_BOARD_ID}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ is_hidden: false, ...data }),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '서명 요청 등록에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '서명 요청 등록에 실패했습니다.'
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

  return { createRequest, isLoading, error, reset }
}
