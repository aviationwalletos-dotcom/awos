// 소셜 로그인 콜백 — 주소 해시에 실려 온 세션을 채택하고 로그북으로 이동한다.
import { TriangleAlert } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { adoptAuthSession } from '../lib/baas/supabaseTransport'

export function AuthCallbackPage() {
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const access = params.get('access_token')
    const refresh = params.get('refresh_token')
    const errorDescription = params.get('error_description')
    if (access) {
      adoptAuthSession(access, refresh)
      // 첫 가입만 계정정보 온보딩으로, 이후 로그인은 로그북으로. (기기별 플래그: AccountPage 방문 시 기록)
      let onboarded = false
      try {
        const payload = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }
        if (payload.sub) onboarded = window.localStorage.getItem(`awos_onboarded:${payload.sub}`) === '1'
      } catch {
        onboarded = false
      }
      const next = new URLSearchParams(window.location.search).get('next')
      // [SEC] '//evil.com' 이나 '/\evil.com' 은 startsWith('/') 를 통과하지만
      // 브라우저가 외부 주소로 해석한다(오픈 리다이렉트). 앱 내부 경로만 허용한다.
      const isInternalPath = Boolean(next) && /^\/(?![/\\])/.test(next!)
      window.location.replace(isInternalPath ? next! : onboarded ? '/logbook' : '/account?setup=1')
    } else {
      setFailed(errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : '로그인 정보가 전달되지 않았어요.')
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-dark px-6 font-body text-white">
      <div className="w-full max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
        {failed === null ? (
          <>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-sky border-t-transparent" aria-hidden="true" />
            <p className="mt-4 text-sm text-slate-400">로그인 처리 중…</p>
          </>
        ) : (
          <>
            <TriangleAlert className="mx-auto h-10 w-10 text-amber-300" aria-hidden="true" />
            <h1 className="mt-4 font-display text-lg font-extrabold">로그인에 실패했어요</h1>
            <p className="mt-2 break-all text-sm text-slate-400">{failed}</p>
            <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-sky hover:underline">
              로그인 화면으로 돌아가기 →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
