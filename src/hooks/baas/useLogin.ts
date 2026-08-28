// BaaS 로그인 Hook
// 참고: baas-integration skill의 references/account.md #2. 로그인 API

import { useCallback, useState } from 'react'

import {
  type ApiEnvelope,
  BAAS_BASE_URL,
  getBaasProjectId,
  parseJsonResponse,
  setStoredAccessToken,
} from '../../lib/baas/config'
import type { TokenResponse, UseLoginReturn } from '../../lib/baas/types'
import { baasFetch } from '../../lib/baas/supabaseTransport'

export function useLogin(): UseLoginReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TokenResponse | null>(null)

  const login = useCallback(async (userId: string, userPw: string): Promise<TokenResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await baasFetch(`${BAAS_BASE_URL}/account/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          user_pw: userPw,
          project_id: getBaasProjectId(),
        }),
      })

      const result = await parseJsonResponse<ApiEnvelope<TokenResponse>>(response)

      if (result.result !== 'SUCCESS' || !result.data) {
        throw new Error(result.message || '로그인에 실패했습니다.')
      }

      setData(result.data)
      // 쿠키가 서드파티 컨텍스트라 저장되지 않는 환경(샌드박스 미리보기 등)을 대비해
      // access_token을 별도로 보관하고 이후 요청에 Authorization 헤더로 사용한다.
      setStoredAccessToken(result.data?.access_token)
      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { login, isLoading, error, data, reset }
}
