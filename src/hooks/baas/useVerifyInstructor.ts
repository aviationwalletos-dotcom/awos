// 교관 본인 인증(로그인 검증) Hook
// 참고: baas-integration skill의 references/account.md #2. 로그인 API, #4. 계정정보 조회 API
//
// 주의: 이 훅은 "현재 로그인된 사용자(로그북 소유자)"의 세션에 절대 영향을 주면 안 되므로
// useLogin/useAccountInfo와 달리 독립적으로 동작한다.
// - credentials: 'include'를 사용하지 않아 쿠키에 영향을 주지 않는다.
// - 로그인 성공 시 받은 access_token은 이 함수 호출 안에서만 Authorization 헤더로
//   잠깐 사용하고, 어디에도 저장하지 않은 채 즉시 버린다(setStoredAccessToken 호출 안 함).

import { useCallback, useState } from 'react'

import { BAAS_BASE_URL, getBaasProjectId } from '../../lib/baas/config'
import type { VerifiedInstructor } from '../../lib/baas/types'

interface UseVerifyInstructorReturn {
  verifyInstructor: (email: string, password: string) => Promise<VerifiedInstructor>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useVerifyInstructor(): UseVerifyInstructorReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyInstructor = useCallback(async (email: string, password: string): Promise<VerifiedInstructor> => {
    setIsLoading(true)
    setError(null)

    try {
      const loginResponse = await fetch(`${BAAS_BASE_URL}/account/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: email,
          user_pw: password,
          project_id: getBaasProjectId(),
        }),
      })

      const loginResult = await loginResponse.json()

      if (loginResult.result !== 'SUCCESS' || !loginResult.data?.access_token) {
        throw new Error(loginResult.message || '이메일 또는 비밀번호가 올바르지 않습니다.')
      }

      // 검증 전용 토큰. 이 요청 안에서만 사용하고 저장하지 않는다.
      const verificationToken: string = loginResult.data.access_token

      const infoResponse = await fetch(`${BAAS_BASE_URL}/account/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${verificationToken}`,
        },
      })

      const infoResult = await infoResponse.json()

      if (infoResult.result !== 'SUCCESS' || !infoResult.data) {
        throw new Error(infoResult.message || '교관 계정 정보를 확인할 수 없습니다.')
      }

      return {
        name: infoResult.data.name,
        userId: infoResult.data.user_id,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '교관 본인 인증에 실패했습니다.'
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

  return { verifyInstructor, isLoading, error, reset }
}
