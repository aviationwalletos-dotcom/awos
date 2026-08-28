// BaaS 계정정보 조회 Hook
// 참고: baas-integration skill의 references/account.md #4. 계정정보 조회 API

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type ApiEnvelope,
  BAAS_BASE_URL,
  getAuthHeaders,
  parseJsonResponse,
  setStoredAccessToken,
} from '../../lib/baas/config'
import type { AccountResponse, UseAccountInfoOptions, UseAccountInfoReturn } from '../../lib/baas/types'
import { baasFetch } from '../../lib/baas/supabaseTransport'

export function useAccountInfo(options: UseAccountInfoOptions = {}): UseAccountInfoReturn {
  const { enabled = true, onError } = options
  const [data, setData] = useState<AccountResponse | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

  const fetchAccountInfo = useCallback(async (): Promise<AccountResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await baasFetch(`${BAAS_BASE_URL}/account/info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
      })

      const result = await parseJsonResponse<ApiEnvelope<AccountResponse>>(response)

      if (result.result !== 'SUCCESS') {
        const isUnauthorized = response.status === 401 || result.errorCode === 'UNAUTHORIZED'

        // 진짜 인증 실패(미로그인)로 확인된 경우에만 계정 데이터/토큰을 비운다.
        // 그 외의 일시적 오류(네트워크, 서버 오류 등)까지 토큰을 지우면, 로그인 직후 이 호출이
        // 일시적으로 실패했을 때 방금 저장한 정상 토큰이 사라져 이후 모든 인증 API가 실패한다.
        if (isUnauthorized) {
          setData(null)
          setStoredAccessToken(null)
          return null
        }

        throw new Error(result.message || '계정 정보를 가져올 수 없습니다.')
      }

      setData(result.data ?? null)
      return result.data ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : '계정 정보를 가져올 수 없습니다.'
      setError(message)
      onErrorRef.current?.(err instanceof Error ? err : new Error(message))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setIsLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (enabled) {
      void fetchAccountInfo()
    }
  }, [enabled, fetchAccountInfo])

  return { data, isLoading, error, refetch: fetchAccountInfo, reset }
}
