import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { getStoredAccessToken } from '../lib/baas/config'
import type { UserType } from '../lib/baas/types'

interface RequireUserTypeProps {
  /** 이 라우트에 접근을 허용할 사용자 유형 (배열이면 그중 하나만 일치해도 통과) */
  userType: UserType | UserType[]
  children: React.ReactNode
}

const TYPE_LABEL: Record<UserType, string> = {
  individual: '개인 사용자',
  organization: '기관 사용자',
}

const TYPE_PATH: Record<UserType, string> = {
  individual: '/logbook',
  organization: '/dashboard',
}

/**
 * 로그인 여부와 계정 유형(userType)에 따라 라우트 접근을 제한하는 가드 컴포넌트.
 * - 로딩 중: 로딩 화면을 보여주고 리다이렉트하지 않음
 * - 비로그인: /login으로 리다이렉트
 * - 로그인했지만 유형 불일치: 안내 메시지와 함께 자신의 유형에 맞는 페이지로 이동 링크 제공
 */
export function RequireUserType({ userType, children }: RequireUserTypeProps) {
  const { isAuthenticated, isLoading, userType: currentUserType, error, refetchAccount } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-dark text-white">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-300">로그인 상태를 확인하는 중이에요...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // 토큰은 있는데 계정 조회가 오류(시간 초과·네트워크)로 끝난 경우 — 로그인 화면으로 튕기지 말고 다시 시도하게 한다.
    if (error && getStoredAccessToken()) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-navy-dark px-6 text-white">
          <div className="max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-300" aria-hidden="true" />
            <h1 className="mt-4 font-display text-xl font-extrabold">연결이 불안정해요</h1>
            <p className="mt-3 text-sm text-slate-300">계정 정보를 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.</p>
            <p className="mt-1 break-all text-xs text-slate-500">{error}</p>
            <button type="button"
              onClick={() => void refetchAccount()}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-control bg-sky px-5 text-sm font-bold text-navy hover:bg-sky/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              다시 시도
            </button>
          </div>
        </div>
      )
    }
    return <Navigate to="/login" replace />
  }

  const allowedTypes = Array.isArray(userType) ? userType : [userType]

  if (!allowedTypes.includes(currentUserType)) {
    const correctPath = TYPE_PATH[currentUserType]
    const allowedLabel = allowedTypes.map((type) => TYPE_LABEL[type]).join(' / ')
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-dark px-6 text-white">
        <div className="max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" aria-hidden="true" />
          <h1 className="mt-4 font-display text-xl font-extrabold">접근 권한이 없어요</h1>
          <p className="mt-3 text-sm text-slate-300">
            이 페이지는 {allowedLabel} 전용이에요. 현재 계정은{' '}
            <span>{TYPE_LABEL[currentUserType]}</span>(으)로 등록되어 있어 접근할 수
            없어요.
          </p>
          <Link to={correctPath}
            className="mt-6 inline-flex items-center justify-center rounded-control bg-sky px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-sky/90
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <span>{TYPE_LABEL[currentUserType]}</span>&nbsp;페이지로 이동
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
