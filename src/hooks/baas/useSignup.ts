// BaaS 회원가입 Hook (프로젝트 회원 전용)
// 참고: baas-integration skill의 references/account.md #1. 회원가입 API

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getBaasProjectId } from '../../lib/baas/config'
import { baasFetch } from '../../lib/baas/supabaseTransport'
import type { AccountResponse, SignupOptions, UseSignupReturn } from '../../lib/baas/types'

export function useSignup(): UseSignupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AccountResponse | null>(null)

  const signup = useCallback(
    async (
      userId: string,
      userPw: string,
      name: string,
      phone: string,
      options: SignupOptions = {},
    ): Promise<AccountResponse> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await baasFetch(`${BAAS_BASE_URL}/account/signup-project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: userId,
            user_pw: userPw,
            name,
            phone,
            project_id: getBaasProjectId(),
            ...options,
          }),
        })

        const result = await response.json()

        if (result.result !== 'SUCCESS') {
          throw new Error(result.message || '회원가입에 실패했습니다.')
        }

        setData(result.data)
        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : '회원가입에 실패했습니다.'
        setError(message)
        throw err instanceof Error ? err : new Error(message)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { signup, isLoading, error, data, reset }
}
