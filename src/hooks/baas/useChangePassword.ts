// BaaS 비밀번호 변경 Hook
// 참고: baas-integration skill의 references/account.md #5. 비밀번호 변경 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getAuthHeaders } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { UseChangePasswordReturn } from '../../lib/baas/types'

export function useChangePassword(): UseChangePasswordReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const response = await baasFetch(`${BAAS_BASE_URL}/account/profile/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const result = await response.json()

      if (result.result !== 'SUCCESS') {
        throw new Error(result.message || '비밀번호 변경에 실패했습니다.')
      }

      setIsSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setIsSuccess(false)
  }, [])

  return { changePassword, isLoading, error, isSuccess, reset }
}
