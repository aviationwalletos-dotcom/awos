// "개인설정" 게시판 게시글 작성 Hook (계정당 딱 1건의 "개인설정" 게시글)
// 참고: baas-integration skill의 references/dynamic-board.md #2. 게시글 작성 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, PROFILE_SETTINGS_BOARD_ID, getAuthHeaders, getBaasProjectId } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { BoardPostCreateRequest, BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseCreateProfileSettingsPostReturn {
  createProfileSettingsPost: (data: BoardPostCreateRequest) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useCreateProfileSettingsPost(): UseCreateProfileSettingsPostReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProfileSettingsPost = useCallback(async (data: BoardPostCreateRequest): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)

    try {
      // 본인 명의로 작성되며, 항상 공개(기본값)로 생성한다(is_hidden: true로 만들 필요가 없다 —
      // 숨김 게시글은 작성자 본인만 조회 가능해 초기 동기화(다른 기기)에서 사용할 수 없게 된다).
      const response = await baasFetch(`${BAAS_BASE_URL}/boards/${getBaasProjectId()}/${PROFILE_SETTINGS_BOARD_ID}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ is_hidden: false, ...data }),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '개인설정 서버 동기화(생성)에 실패했습니다.')
      }

      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '개인설정 서버 동기화(생성)에 실패했습니다.'
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

  return { createProfileSettingsPost, isLoading, error, reset }
}
