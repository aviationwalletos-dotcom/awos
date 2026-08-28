import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogIn } from 'lucide-react'

import { Button } from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { useLogin } from '../hooks/baas/useLogin'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useLogin()
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
    <div data-mbaas-oid="lgnpg01" className="min-h-screen bg-navy-dark font-body text-white">
      <header data-mbaas-oid="lgnpg02" className="border-b border-white/10">
        <div data-mbaas-oid="lgnpg03" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            data-mbaas-oid="lgnpg04" to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p data-mbaas-oid="lgnpg05" className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span data-mbaas-oid="lgnpg06" className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <main data-mbaas-oid="lgnpg07" className="relative overflow-hidden py-[clamp(64px,10vw,120px)]">
        <div data-mbaas-oid="lgnpg08" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.14),transparent_55%)]" />
        <div data-mbaas-oid="lgnpg09" className="relative mx-auto max-w-md px-6">
          <div data-mbaas-oid="lgnpg10" className="text-center">
            <span data-mbaas-oid="lgnpg11" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              로그인
            </span>
            <h1
              data-mbaas-oid="lgnpg12" className="mt-6 font-display font-extrabold"
              style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}
            >
              계정으로 로그인하고
              <br data-mbaas-oid="lgnpg13" />
              자격 상태를 확인하세요
            </h1>
            <p data-mbaas-oid="lgnpg14" className="mt-4 text-sm text-slate-400" style={{ textWrap: 'pretty' } as React.CSSProperties}>
              가입 시 등록한 사용자 유형에 따라 개인 사용자는 디지털 로그북으로, 기관 사용자는 관제 대시보드로 이동합니다.
            </p>
          </div>

          <form data-mbaas-oid="lgnpg19" onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4 rounded-card border border-white/10 bg-white/5 p-cardpad">
            {(formError || error) && (
              <p data-mbaas-oid="hh3qsba" role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                {formError || error}
              </p>
            )}

            <div data-mbaas-oid="lgnpg20" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="lgnpg21" htmlFor="login-email" className="text-xs font-semibold text-slate-300">
                이메일
              </label>
              <input
                data-mbaas-oid="lgnpg22" id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-500
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
            </div>

            <div data-mbaas-oid="lgnpg23" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="lgnpg24" htmlFor="login-password" className="text-xs font-semibold text-slate-300">
                비밀번호
              </label>
              <input
                data-mbaas-oid="lgnpg25" id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-500
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
            </div>

            <Button data-mbaas-oid="lgnpg26" type="submit" size="lg" className="mt-2 w-full" disabled={isLoading} loading={isLoading}>
              로그인
            </Button>

            <p data-mbaas-oid="lgnpg27" className="text-center text-xs text-slate-500">
              계정이 없으신가요?{' '}
              <Link
                data-mbaas-oid="lgnpg28" to="/signup"
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
