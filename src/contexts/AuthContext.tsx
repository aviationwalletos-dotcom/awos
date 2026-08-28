import React, { createContext, useCallback, useContext, useMemo } from 'react'

import { useAccountInfo } from '../hooks/baas/useAccountInfo'
import { useLogout } from '../hooks/baas/useLogout'
import type { AccountResponse, UserType } from '../lib/baas/types'

interface AuthContextValue {
  /** 로그인된 계정 정보 (미로그인/조회 전에는 null) */
  account: AccountResponse | null
  /** 계정 정보 최초 조회/로그인 직후 재조회 중 여부 */
  isLoading: boolean
  /** 계정 정보 조회 에러 (미로그인 자체는 에러로 취급하지 않음) */
  error: string | null
  /** 로그인 여부 */
  isAuthenticated: boolean
  /** 계정에 저장된 사용자 유형 (개인/기관), 없으면 개인으로 간주 */
  userType: UserType
  /** 로그인/회원가입 성공 직후 등 계정 정보를 다시 조회 */
  refetchAccount: () => Promise<AccountResponse | null>
  /** 로그아웃 처리 */
  logout: () => Promise<void>
  /** 로그아웃 진행 중 여부 */
  isLoggingOut: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: account, isLoading, error, refetch, reset } = useAccountInfo()

  const { logout: performLogout, isLoading: isLoggingOut } = useLogout({
    onSuccess: () => reset(),
  })

  const logout = useCallback(async () => {
    await performLogout()
  }, [performLogout])

  const userType: UserType = (account?.data?.user_type as UserType | undefined) ?? 'individual'

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      isLoading,
      error,
      isAuthenticated: !!account,
      userType,
      refetchAccount: refetch,
      logout,
      isLoggingOut,
    }),
    [account, isLoading, error, userType, refetch, logout, isLoggingOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  }
  return ctx
}
