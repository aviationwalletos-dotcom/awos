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
      window.location.replace('/logbook')
    } else {
      setFailed(errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : '로그인 정보가 전달되지 않았어요.')
    }
  }, [])

  return (
    <div data-mbaas-oid="ocb01" className="flex min-h-screen items-center justify-center bg-navy-dark px-6 font-body text-white">
      <div data-mbaas-oid="ocb02" className="w-full max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
        {failed === null ? (
          <>
            <span data-mbaas-oid="ocb03" className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-sky border-t-transparent" aria-hidden="true" />
            <p data-mbaas-oid="ocb04" className="mt-4 text-sm text-slate-400">로그인 처리 중…</p>
          </>
        ) : (
          <>
            <TriangleAlert className="mx-auto h-10 w-10 text-amber-300" aria-hidden="true" />
            <h1 data-mbaas-oid="ocb05" className="mt-4 font-display text-lg font-extrabold">로그인에 실패했어요</h1>
            <p data-mbaas-oid="ocb06" className="mt-2 break-all text-sm text-slate-400">{failed}</p>
            <Link data-mbaas-oid="ocb07" to="/login" className="mt-5 inline-block text-sm font-semibold text-sky hover:underline">
              로그인 화면으로 돌아가기 →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
