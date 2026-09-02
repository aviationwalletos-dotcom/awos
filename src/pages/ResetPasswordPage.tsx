import { LockKeyhole } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { parseRecoveryToken, updatePasswordWithToken } from '../lib/supabase/passwordReset'

const inputClass = `rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky`

export function ResetPasswordPage() {
  const [token] = useState<string | null>(() => parseRecoveryToken(window.location.hash))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 해요.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요. 다시 확인해 주세요.')
      return
    }
    if (!token) return
    setIsLoading(true)
    try {
      await updatePasswordWithToken(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-mbaas-oid="rppg01" className="min-h-screen bg-surface font-body text-ink">
      <main data-mbaas-oid="rppg02" className="relative overflow-hidden py-[clamp(64px,10vw,120px)]">
        <div data-mbaas-oid="rppg03" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(0,212,255,0.14),transparent_55%)]" />
        <div data-mbaas-oid="rppg04" className="relative mx-auto max-w-md px-6">
          <div data-mbaas-oid="rppg05" className="text-center">
            <span data-mbaas-oid="rppg06" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              새 비밀번호 설정
            </span>
          </div>

          {done ? (
            <div data-mbaas-oid="rppg07" className="mt-10 rounded-card border border-go/30 bg-go/10 p-6 text-center">
              <p data-mbaas-oid="rppg08" className="text-sm font-semibold text-go">비밀번호가 변경됐어요!</p>
              <Link data-mbaas-oid="rppg09" to="/login" className="mt-3 inline-block text-sm font-semibold text-sky hover:underline">
                새 비밀번호로 로그인하기 →
              </Link>
            </div>
          ) : !token ? (
            <div data-mbaas-oid="rppg10" className="mt-10 rounded-card border border-amber-400/30 bg-amber-400/10 p-6 text-center text-sm text-amber-200">
              재설정 링크가 유효하지 않거나 만료됐어요.{' '}
              <Link data-mbaas-oid="rppg11" to="/forgot-password" className="font-semibold text-sky hover:underline">
                재설정 메일 다시 받기
              </Link>
            </div>
          ) : (
            <form data-mbaas-oid="rppg12" onSubmit={(e) => void handleSubmit(e)} className="mt-10 flex flex-col gap-4">
              <div data-mbaas-oid="rppg13" className="flex flex-col gap-1.5">
                <label data-mbaas-oid="rppg14" htmlFor="reset-pw" className="text-xs font-semibold text-slate-300">
                  새 비밀번호
                </label>
                <input
                  data-mbaas-oid="rppg15" id="reset-pw"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상 입력하세요"
                  className={inputClass}
                />
              </div>
              <div data-mbaas-oid="rppg16" className="flex flex-col gap-1.5">
                <label data-mbaas-oid="rppg17" htmlFor="reset-pw2" className="text-xs font-semibold text-slate-300">
                  새 비밀번호 확인
                </label>
                <input
                  data-mbaas-oid="rppg18" id="reset-pw2"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className={inputClass}
                />
              </div>
              {error && <p data-mbaas-oid="rppg19" className="text-xs text-rose-400">{error}</p>}
              <Button data-mbaas-oid="rppg20" type="submit" size="lg" className="mt-2 w-full" disabled={isLoading} loading={isLoading}>
                비밀번호 변경하기
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
