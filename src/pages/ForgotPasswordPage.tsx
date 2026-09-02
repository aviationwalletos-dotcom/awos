import { KeyRound } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { requestPasswordReset } from '../lib/supabase/passwordReset'

const inputClass = `rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky`

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '재설정 메일 전송에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-mbaas-oid="fppg01" className="min-h-screen bg-surface font-body text-ink">
      <main data-mbaas-oid="fppg02" className="relative overflow-hidden py-[clamp(64px,10vw,120px)]">
        <div data-mbaas-oid="fppg03" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(0,212,255,0.14),transparent_55%)]" />
        <div data-mbaas-oid="fppg04" className="relative mx-auto max-w-md px-6">
          <div data-mbaas-oid="fppg05" className="text-center">
            <span data-mbaas-oid="fppg06" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              비밀번호 재설정
            </span>
            <h1 data-mbaas-oid="fppg07" className="mt-6 font-display text-3xl font-extrabold tracking-tight">
              비밀번호를 잊으셨나요?
            </h1>
            <p data-mbaas-oid="fppg08" className="mt-4 text-sm text-slate-400">
              가입한 이메일 주소를 입력하면 재설정 링크를 보내드려요.
            </p>
          </div>

          {sent ? (
            <div data-mbaas-oid="fppg09" className="mt-10 rounded-card border border-go/30 bg-go/10 p-6 text-center">
              <p data-mbaas-oid="fppg10" className="text-sm font-semibold text-go">재설정 메일을 보냈어요!</p>
              <p data-mbaas-oid="fppg11" className="mt-2 text-xs leading-relaxed text-slate-300">
                <span data-mbaas-oid="fppg12" className="font-mono-data text-ink">{email}</span> 의 받은편지함(또는 스팸함)을 확인하고,
                메일 속 링크를 눌러 새 비밀번호를 설정하세요. 메일이 안 오면 몇 분 뒤 다시 시도해 주세요.
              </p>
              <Link data-mbaas-oid="fppg13" to="/login" className="mt-4 inline-block text-sm font-semibold text-sky hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form data-mbaas-oid="fppg14" onSubmit={(e) => void handleSubmit(e)} className="mt-10 flex flex-col gap-4">
              <div data-mbaas-oid="fppg15" className="flex flex-col gap-1.5">
                <label data-mbaas-oid="fppg16" htmlFor="forgot-email" className="text-xs font-semibold text-slate-300">
                  이메일
                </label>
                <input
                  data-mbaas-oid="fppg17" id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="가입한 이메일을 입력하세요"
                  className={inputClass}
                />
              </div>
              {error && <p data-mbaas-oid="fppg18" className="text-xs text-rose-400">{error}</p>}
              <Button data-mbaas-oid="fppg19" type="submit" size="lg" className="mt-2 w-full" disabled={isLoading} loading={isLoading}>
                재설정 메일 보내기
              </Button>
              <p data-mbaas-oid="fppg20" className="text-center text-xs text-slate-400">
                <Link data-mbaas-oid="fppg21" to="/login" className="font-semibold text-sky hover:underline">
                  로그인으로 돌아가기
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
