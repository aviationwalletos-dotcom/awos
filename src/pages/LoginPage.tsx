import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogIn } from 'lucide-react'

import { Button } from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { resendSignupConfirmation } from '../lib/supabase/passwordReset'
import { SocialLoginButtons } from '../components/SocialLoginButtons'
import { useLogin } from '../hooks/baas/useLogin'
import { suggestEmailFix } from '../lib/emailTypo'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useLogin()
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const needsVerification = Boolean(error && error.includes('이메일 인증이 완료되지'))

  async function handleResendVerification() {
    if (!email.trim() || resendState === 'sending') return
    setResendState('sending')
    try {
      await resendSignupConfirmation(email.trim())
      setResendState('sent')
    } catch {
      setResendState('idle')
    }
  }
  const { refetchAccount } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!email.trim() || !password) {
      setFormError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    try {
      await login(email.trim(), password)
      // 로그인 성공(쿠키 발급) 후 계정정보를 조회해 저장된 사용자 유형에 따라 이동한다.
      const account = await refetchAccount()
      const userType = (account?.data?.user_type as string | undefined) ?? 'individual'
      navigate(userType === 'organization' ? '/dashboard' : '/logbook')
    } catch {
      // error 상태로 화면에 안내됨
    }
  }

  return (
    <div className="min-h-screen bg-navy-dark font-body text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <main className="relative overflow-hidden py-[clamp(64px,10vw,120px)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(0,212,255,0.14),transparent_55%)]" />
        <div className="relative mx-auto max-w-md px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              로그인
            </span>
            <h1 className="mt-6 font-display font-extrabold"
              style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}
            >
              계정으로 로그인하고
              <br />
              자격 상태를 확인하세요
            </h1>
            <p className="mt-4 text-sm text-slate-400" style={{ textWrap: 'pretty' } as React.CSSProperties}>
              비행기록·자격증·커런시를 한곳에서. 로그인하면 이어서 바로 기록할 수 있어요.
            </p>
          </div>

          <div className="mt-8">
            <SocialLoginButtons />
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4 rounded-card border border-white/10 bg-white/5 p-cardpad">
            {(formError || error) && (
              <p role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/100/10 px-3 py-2 text-xs font-medium text-rose-300">
                {formError || error}
              </p>
            )}
            {needsVerification && (
              <button type="button"
                onClick={() => void handleResendVerification()}
                disabled={resendState === 'sending'}
                className="rounded-control border border-sky/40 bg-sky/10 px-4 py-2.5 text-sm font-semibold text-sky transition hover:bg-sky/20 disabled:opacity-60"
              >
                {resendState === 'sent' ? '재발송 완료 — 메일함(스팸함)을 확인하세요' : resendState === 'sending' ? '보내는 중…' : '인증 메일 다시 보내기'}
              </button>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold text-slate-300">
                이메일
              </label>
              <input id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {suggestEmailFix(email) && (
                <button type="button" onClick={() => setEmail(suggestEmailFix(email) as string)} className="text-left text-xs text-amber-300 underline">
                  혹시 {suggestEmailFix(email)} 아닌가요? (눌러서 고치기)
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">
                비밀번호
              </label>
              <input id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading} loading={isLoading} data-testid="login-submit">
              로그인
            </Button>

            <p className="text-center text-xs">
              <Link to="/forgot-password"
                className="font-medium text-slate-400 hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </p>

            <p className="text-center text-xs text-slate-400">
              계정이 없으신가요?{' '}
              <Link to="/signup"
                className="font-semibold text-sky hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
              >
                회원가입하기
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
