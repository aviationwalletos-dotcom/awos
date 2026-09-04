// 이메일 인증 완료 착지 페이지 — 메일의 [이메일 인증하기] 링크가 여기로 온다.
// 링크에 실린 세션을 채택해 곧바로 로그인 상태로 만든다.
import { CheckCircle2, MailWarning } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { adoptAuthSession } from '../lib/baas/supabaseTransport'

export function VerifyEmailPage() {
  const [status, setStatus] = useState<'working' | 'success' | 'invalid'>('working')

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const access = params.get('access_token')
    const refresh = params.get('refresh_token')
    if (access) {
      adoptAuthSession(access, refresh)
      window.history.replaceState(null, '', '/verify-email')
      setStatus('success')
    } else {
      setStatus('invalid')
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-dark px-6 font-body text-white">
      <div className="w-full max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
        {status === 'working' && <p className="text-sm text-slate-400">인증 확인 중…</p>}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-go" aria-hidden="true" />
            <h1 className="mt-4 font-display text-xl font-extrabold">이메일 인증 완료!</h1>
            <p className="mt-2 text-sm text-slate-400">
              가입이 마무리됐어요. 이제 디지털 로그북을 시작할 수 있습니다.
            </p>
            <Button size="lg" className="mt-6 w-full" onClick={() => { window.location.href = '/logbook' }}>
              AWOS 시작하기 →
            </Button>
          </>
        )}
        {status === 'invalid' && (
          <>
            <MailWarning className="mx-auto h-12 w-12 text-amber-300" aria-hidden="true" />
            <h1 className="mt-4 font-display text-xl font-extrabold">인증 링크가 유효하지 않아요</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              링크가 만료됐거나 이미 사용됐을 수 있어요. 로그인 화면에서 이메일·비밀번호로 로그인해 보세요 —
              인증이 안 된 계정이면 그 자리에서 인증 메일을 다시 받을 수 있어요.
            </p>
            <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-sky hover:underline">
              로그인으로 가기 →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
