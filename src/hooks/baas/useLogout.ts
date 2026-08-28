// BaaS 로그아웃 Hook
// 참고: baas-integration skill의 references/account.md #3. 로그아웃 API

import { useCallback, useEffect, useRef, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders, setStoredAccessToken } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { UseLogoutOptions, UseLogoutReturn } from '../../lib/baas/types'

export function useLogout(options: UseLogoutOptions = {}): UseLogoutReturn {
  const { onSuccess, onError } = options
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  })

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await baasFetch(`${BAAS_BASE_URL}/account/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '로그아웃에 실패했습니다.')
      }

      setStoredAccessToken(null)
      onSuccessRef.current?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그아웃에 실패했습니다.'
      setError(message)
      onErrorRef.current?.(err instanceof Error ? err : new Error(message))
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return { logout, isLoading, error, reset }
}
