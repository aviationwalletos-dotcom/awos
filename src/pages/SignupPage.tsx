import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react'

import { Button } from '../components/Button'
import { InstitutionSelect } from '../components/InstitutionSelect'
import { useSignup } from '../hooks/baas/useSignup'
import { formatPhone, validateEmail, validatePhone } from '../lib/baas/utils'
import type { IndividualRole, UserType } from '../lib/baas/types'

interface FieldErrors {
  name?: string
  email?: string
  phone?: string
  password?: string
  passwordConfirm?: string
  agreement?: string
  individualRole?: string
}

export function SignupPage() {
  const navigate = useNavigate()
  const { signup, isLoading, error: submitError } = useSignup()

  const userType: UserType = 'individual' // 조종사 전용 단순화 — 기관 가입은 별도 채널로 이관
  const individualRole: IndividualRole = 'pilot' // 조종사 고정(타 직군 가입은 다음 단계에 오픈)
  const [organizationAffiliation, setOrganizationAffiliation] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isDone, setIsDone] = useState(false)

  function validate(): boolean {
    const errors: FieldErrors = {}

    if (!name.trim()) errors.name = '이름을 입력해주세요.'
    if (!email.trim()) errors.email = '이메일을 입력해주세요.'
    else if (!validateEmail(email)) errors.email = '올바른 이메일 형식이 아닙니다.'

    if (!phone.trim()) errors.phone = '전화번호를 입력해주세요.'
    else if (!validatePhone(phone)) errors.phone = '010-1234-5678 형식으로 입력해주세요.'

    if (!password) errors.password = '비밀번호를 입력해주세요.'
    else if (password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다.'

    if (password !== passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'

    if (!agreed) errors.agreement = '이용약관 및 개인정보 처리방침에 동의해주세요.'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    try {
      await signup(email.trim(), password, name.trim(), phone, {
        terms_agreed: agreed,
        privacy_agreed: agreed,
        data: {
          user_type: userType,
          individual_role: userType === 'individual' ? individualRole ?? undefined : undefined,
          organization_affiliation: organizationAffiliation.trim() || undefined,
        },
      })
      setIsDone(true)
    } catch {
      // submitError 상태로 화면에 안내됨
    }
  }

  if (isDone) {
    return (
      <div data-mbaas-oid="5xty0xe" className="flex min-h-screen items-center justify-center bg-navy-dark px-6 font-body text-white">
        <div data-mbaas-oid="8u5mg48" className="w-full max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-go" aria-hidden="true" />
          <h1 data-mbaas-oid="cd771et" className="mt-4 font-display text-xl font-extrabold">
            회원가입이 완료되었습니다
          </h1>
          <p data-mbaas-oid="z2v2hbp" className="mt-2 text-sm text-slate-400">
            이제 로그인하여 디지털 로그북을 이용해보세요.
          </p>
          <Button data-mbaas-oid="jny4ckb" size="lg" className="mt-6 w-full" onClick={() => navigate('/login')}>
            로그인하러 가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-mbaas-oid="sgnpg01" className="min-h-screen bg-navy-dark font-body text-white">
      <header data-mbaas-oid="sgnpg02" className="border-b border-white/10">
        <div data-mbaas-oid="sgnpg03" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            data-mbaas-oid="sgnpg04" to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p data-mbaas-oid="sgnpg05" className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span data-mbaas-oid="sgnpg06" className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <main data-mbaas-oid="sgnpg07" className="relative overflow-hidden py-[clamp(64px,10vw,120px)]">
        <div data-mbaas-oid="sgnpg08" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.14),transparent_55%)]" />
        <div data-mbaas-oid="sgnpg09" className="relative mx-auto max-w-md px-6">
          <div data-mbaas-oid="sgnpg10" className="text-center">
            <span data-mbaas-oid="sgnpg11" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              회원가입
            </span>
            <h1
              data-mbaas-oid="sgnpg12" className="mt-6 font-display font-extrabold"
              style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}
            >
              사용자 유형을 선택하고
              <br data-mbaas-oid="sgnpg13" />
              가입하세요
            </h1>
            <p data-mbaas-oid="sgnpg14" className="mt-4 text-sm text-slate-400" style={{ textWrap: 'pretty' } as React.CSSProperties}>
              가입 후 바로 비행기록을 시작할 수 있습니다.
            </p>
          </div>

          

          <form data-mbaas-oid="sgnpg19" onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4 rounded-card border border-white/10 bg-white/5 p-cardpad">
            {submitError && (
              <p data-mbaas-oid="jwfa8ld" role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/100/10 px-3 py-2 text-xs font-medium text-rose-300">
                {submitError}
              </p>
            )}

            <div data-mbaas-oid="sgnpg20" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="sgnpg21" htmlFor="signup-name" className="text-xs font-semibold text-slate-300">
                이름
              </label>
              <input
                data-mbaas-oid="sgnpg22" id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.name && <p data-mbaas-oid="sg9qurs" className="text-xs text-rose-400">{fieldErrors.name}</p>}
            </div>

            <div data-mbaas-oid="sgnpg23" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="sgnpg24" htmlFor="signup-email" className="text-xs font-semibold text-slate-300">
                이메일
              </label>
              <input
                data-mbaas-oid="sgnpg25" id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.email && <p data-mbaas-oid="iijf9jc" className="text-xs text-rose-400">{fieldErrors.email}</p>}
            </div>

            <div data-mbaas-oid="sgnpg26" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="sgnpg27" htmlFor="signup-phone" className="text-xs font-semibold text-slate-300">
                전화번호
              </label>
              <input
                data-mbaas-oid="sgnpg28" id="signup-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                maxLength={13}
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.phone && <p data-mbaas-oid="9p15xto" className="text-xs text-rose-400">{fieldErrors.phone}</p>}
            </div>

            <InstitutionSelect
              idPrefix="signup-affiliation"
              value={organizationAffiliation}
              onChange={setOrganizationAffiliation}
              helperText="선택 사항입니다. 교관 서명 요청 시 소속 확인에 사용됩니다. (예: 한국항공대학교 울진비행훈련원)"
            />

            <div data-mbaas-oid="sgnpg29" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="sgnpg30" htmlFor="signup-password" className="text-xs font-semibold text-slate-300">
                비밀번호
              </label>
              <input
                data-mbaas-oid="sgnpg31" id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.password && <p data-mbaas-oid="4map06y" className="text-xs text-rose-400">{fieldErrors.password}</p>}
            </div>

            <div data-mbaas-oid="sgnpg32" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="sgnpg33" htmlFor="signup-password-confirm" className="text-xs font-semibold text-slate-300">
                비밀번호 확인
              </label>
              <input
                data-mbaas-oid="sgnpg34" id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.passwordConfirm && (
                <p data-mbaas-oid="9krcaxw" className="text-xs text-rose-400">{fieldErrors.passwordConfirm}</p>
              )}
            </div>

            <div data-mbaas-oid="sgnpg35" className="flex flex-col gap-1.5">
              <label data-mbaas-oid="sgnpg36" className="flex items-start gap-2 text-xs text-slate-300">
                <input
                  data-mbaas-oid="sgnpg37" type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-navy text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
                <span data-mbaas-oid="sgnpg38">이용약관 및 개인정보 처리방침에 동의합니다.</span>
              </label>
              {fieldErrors.agreement && <p data-mbaas-oid="gkc0qoy" className="text-xs text-rose-400">{fieldErrors.agreement}</p>}
            </div>

            <Button data-mbaas-oid="sgnpg39" type="submit" size="lg" className="mt-2 w-full" disabled={isLoading} loading={isLoading}>
              {userType === 'individual' ? '개인 사용자로 가입하기' : '기관 사용자로 가입하기'}
            </Button>

            <p data-mbaas-oid="sgnpg40" className="text-center text-xs text-slate-400">
              이미 계정이 있으신가요?{' '}
              <Link
                data-mbaas-oid="sgnpg41" to="/login"
                className="font-semibold text-sky hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
              >
                로그인하기
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
