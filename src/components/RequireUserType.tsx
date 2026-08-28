import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
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
  const { isAuthenticated, isLoading, userType: currentUserType } = useAuth()

  if (isLoading) {
    return (
      <div data-mbaas-oid="2rp51uw" className="flex min-h-screen items-center justify-center bg-navy-dark text-white">
        <div data-mbaas-oid="6yme6xa" className="flex flex-col items-center gap-3">
          <span
            data-mbaas-oid="4l75ovx" className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky border-t-transparent"
            aria-hidden="true"
          />
          <p data-mbaas-oid="41p9xyz" className="text-sm text-slate-300">로그인 상태를 확인하는 중입니다...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const allowedTypes = Array.isArray(userType) ? userType : [userType]

  if (!allowedTypes.includes(currentUserType)) {
    const correctPath = TYPE_PATH[currentUserType]
    const allowedLabel = allowedTypes.map((type) => TYPE_LABEL[type]).join(' / ')
    return (
      <div data-mbaas-oid="lleqmuy" className="flex min-h-screen items-center justify-center bg-navy-dark px-6 text-white">
        <div data-mbaas-oid="elnlvng" className="max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" aria-hidden="true" />
          <h1 data-mbaas-oid="i79ybwk" className="mt-4 font-display text-xl font-extrabold">접근 권한이 없습니다</h1>
          <p data-mbaas-oid="lboqpdo" className="mt-3 text-sm text-slate-300">
            이 페이지는 {allowedLabel} 전용입니다. 현재 계정은{' '}
            <span data-mbaas-oid="hy5kde8">{TYPE_LABEL[currentUserType]}</span>(으)로 등록되어 있어 접근할 수
            없습니다.
          </p>
          <Link
            data-mbaas-oid="xjp1a35" to={correctPath}
            className="mt-6 inline-flex items-center justify-center rounded-control bg-sky px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-sky/90
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <span data-mbaas-oid="aozl2m4">{TYPE_LABEL[currentUserType]}</span>&nbsp;페이지로 이동
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
