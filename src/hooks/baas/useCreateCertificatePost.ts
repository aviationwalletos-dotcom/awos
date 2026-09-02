// 자격증 저장 — [schema6 이후] 게시판 대신 본인 전용 테이블(user_certificates)에 저장한다.
// 반환 형태는 기존 게시글(BoardPostDetail)과 호환되는 합성 객체라 상위 훅 수정이 필요 없다.

import { useCallback, useState } from 'react'

import { buildPrivatePostId, upsertPrivateRecord } from '../../lib/baas/privateTables'
import type { BoardPostCreateRequest, BoardPostDetail } from '../../lib/baas/boardTypes'

interface UseCreateCertificatePostReturn {
  createCertificatePost: (data: BoardPostCreateRequest) => Promise<BoardPostDetail>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useCreateCertificatePost(): UseCreateCertificatePostReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCertificatePost = useCallback(async (data: BoardPostCreateRequest): Promise<BoardPostDetail> => {
    setIsLoading(true)
    setError(null)
    try {
      const parsed = JSON.parse(data.content) as { id?: string }
      const appId = parsed?.id
      if (!appId) throw new Error('자격증 id가 없어 저장할 수 없습니다.')
      await upsertPrivateRecord('user_certificates', appId, data.content)
      return {
        id: buildPrivatePostId('user_certificates', appId),
        title: data.title,
        content: data.content,
      } as BoardPostDetail
    } catch (err) {
      const message = err instanceof Error ? err.message : '자격증 저장에 실패했습니다.'
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

  return { createCertificatePost, isLoading, error, reset }
}
