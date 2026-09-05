import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react'

import { Button } from '../components/Button'
import { InstitutionSelect } from '../components/InstitutionSelect'
import { SocialLoginButtons } from '../components/SocialLoginButtons'
import { useSignup } from '../hooks/baas/useSignup'
import { resendSignupConfirmation } from '../lib/supabase/passwordReset'
import { PHONE_TAKEN_MESSAGE, checkContactExists, emailTakenMessageFor } from '../lib/baas/contactCheck'
import { formatPhone, validateEmail, validatePhone } from '../lib/baas/utils'
import type { IndividualRole, UserType } from '../lib/baas/types'
import { ALL_PILOT_TRACKS, PILOT_TRACK_LABEL, PILOT_TRACK_SHORT } from '../lib/tracks'
import type { PilotTrack } from '../lib/tracks'
import { SIGNUP_TRACKS_KEY_PREFIX } from '../lib/profileSettingsSync'
import { suggestEmailFix } from '../lib/emailTypo'

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
  // v1.1 — 자격 구분(항공기/경량항공기/초경량) 복수 선택. 기존 individual_role은 첫 구분에서 파생해 호환 유지.
  const [pilotTracks, setPilotTracks] = useState<PilotTrack[]>(['aircraft'])
  const individualRole: IndividualRole = pilotTracks.includes('aircraft') || pilotTracks.includes('lsa') ? 'pilot' : 'drone_pilot'
  function toggleTrack(t: PilotTrack) {
    setPilotTracks((prev) => (prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]))
  }
  const [organizationAffiliation, setOrganizationAffiliation] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isDone, setIsDone] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  // 이미 가입된 이메일이면 어떤 로그인 방법에 묶여 있는지 알려준다(카카오/구글/비밀번호)
  const [registeredProviders, setRegisteredProviders] = useState<string[]>([])
  useEffect(() => {
    if (!alreadyRegistered) return
    let alive = true
    void checkContactExists(email, null).then((r) => {
      if (alive && r) setRegisteredProviders(r.emailProviders)
    })
    return () => {
      alive = false
    }
  }, [alreadyRegistered, email])
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleResend() {
    if (!pendingEmail || resendState === 'sending') return
    setResendState('sending')
    try {
      await resendSignupConfirmation(pendingEmail)
      setResendState('sent')
    } catch {
      setResendState('idle')
    }
  }

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

    if (!agreedTerms || !agreedPrivacy) errors.agreement = '필수 약관에 모두 동의해주세요.'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) {
      // 실패한 항목이 화면 밖에 있으면 첫 번째 빨간 안내로 스크롤해 '무반응'처럼 보이지 않게 한다
      window.setTimeout(() => {
        document.querySelector('.text-rose-400')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 30)
      return
    }

    // 가입 전 중복 확인 — 이메일·전화번호 1개 = 계정 1개(schema13). 확인 함수가 없으면 건너뛴다.
    const taken = await checkContactExists(email, phone)
    if (taken?.emailTaken || taken?.phoneTaken) {
      setFieldErrors({
        ...(taken.emailTaken ? { email: emailTakenMessageFor(taken.emailProviders) } : {}),
        ...(taken.phoneTaken ? { phone: PHONE_TAKEN_MESSAGE } : {}),
      })
      window.setTimeout(() => {
        document.querySelector('.text-rose-400')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 30)
      return
    }

    try {
      const result = await signup(email.trim(), password, name.trim(), phone, {
        terms_agreed: agreedTerms,
        privacy_agreed: agreedPrivacy,
        data: {
          user_type: userType,
          individual_role: userType === 'individual' ? individualRole ?? undefined : undefined,
          pilot_tracks: userType === 'individual' ? pilotTracks : undefined,
          organization_affiliation: organizationAffiliation.trim() || undefined,
        },
      })
      // 프로필 컬럼(schema10) 유무와 무관하게 첫 로그인 때 자격 구분을 복원할 수 있도록 이 브라우저에 임시 보관
      if (userType === 'individual') {
        try {
          window.localStorage.setItem(`${SIGNUP_TRACKS_KEY_PREFIX}:${email.trim().toLowerCase()}`, JSON.stringify(pilotTracks))
        } catch {
          // 무시
        }
      }
      const r = result as { pending_verification?: boolean; already_registered?: boolean } | null
      if (r?.pending_verification) {
        setPendingEmail(email.trim())
        setAlreadyRegistered(Boolean(r.already_registered))
        return
      }
      setIsDone(true)
    } catch {
      // submitError 상태로 화면에 안내됨
    }
  }

  if (pendingEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-dark px-6 font-body text-white">
        <div className="w-full max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky/15 text-2xl">📮</span>
          <h1 className="mt-4 font-display text-xl font-extrabold">{alreadyRegistered ? '이미 가입된 이메일이에요' : '인증 메일을 보냈어요!'}</h1>
          {alreadyRegistered && registeredProviders.length > 0 && (
            <p className="mt-3 rounded-control border border-sky/30 bg-sky/10 px-3 py-2 text-xs text-sky">
              {emailTakenMessageFor(registeredProviders)}
            </p>
          )}
          {alreadyRegistered && (
            <p className="mt-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              이 이메일로 가입한 계정이 이미 있어서 새 인증 메일은 보내지 않았어요. 인증을 아직 안 했다면 아래 "인증 메일 다시 보내기"를, 이미 인증했다면 로그인하세요.
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            <span className="break-all font-semibold text-sky">{pendingEmail}</span> 의 받은편지함(또는 스팸함)에서
            <span className="font-semibold text-white"> [이메일 인증하기]</span> 버튼을 누르면 가입이 완료돼요.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" variant="outline" tone="neutral"
              onClick={() => void handleResend()}
              disabled={resendState === 'sending'}
            >
              {resendState === 'sent' ? '재발송 완료 — 메일함을 확인하세요' : resendState === 'sending' ? '보내는 중…' : '인증 메일 다시 보내기'}
            </Button>
            <Link to="/login" className="text-sm font-semibold text-sky hover:underline">
              인증을 마쳤어요 — 로그인하러 가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-dark px-6 font-body text-white">
        <div className="w-full max-w-md rounded-card border border-white/10 bg-white/5 p-cardpad text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-go" aria-hidden="true" />
          <h1 className="mt-4 font-display text-xl font-extrabold">
            회원가입이 완료되었습니다
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            이제 로그인하여 디지털 로그북을 이용해보세요.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={() => navigate('/login')}>
            로그인하러 가기
          </Button>
        </div>
      </div>
    )
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(0,212,255,0.14),transparent_55%)]" />
        <div className="relative mx-auto max-w-md px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              회원가입
            </span>
            <h1 className="mt-6 font-display font-extrabold"
              style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'balance' } as React.CSSProperties}
            >
              사용자 유형을 선택하고
              <br />
              가입하세요
            </h1>
            <p className="mt-4 text-sm text-slate-400" style={{ textWrap: 'pretty' } as React.CSSProperties}>
              가입 후 바로 비행기록을 시작할 수 있습니다.
            </p>
          </div>

          

          <div className="mt-8">
            <SocialLoginButtons />
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4 rounded-card border border-white/10 bg-white/5 p-cardpad">
            {submitError && (
              <p role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/100/10 px-3 py-2 text-xs font-medium text-rose-300">
                {submitError}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-name" className="text-xs font-semibold text-slate-300">
                이름
              </label>
              <input id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="실명을 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.name && <p className="text-xs text-rose-400">{fieldErrors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="text-xs font-semibold text-slate-300">
                이메일
              </label>
              <input id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {suggestEmailFix(email) && (
                <button type="button" onClick={() => setEmail(suggestEmailFix(email) as string)} className="text-left text-xs text-amber-300 underline">
                  혹시 {suggestEmailFix(email)} 아닌가요? (눌러서 고치기)
                </button>
              )}
              {fieldErrors.email && <p className="text-xs text-rose-400">{fieldErrors.email}</p>}
            </div>


            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-phone" className="text-xs font-semibold text-slate-300">
                전화번호
              </label>
              <input id="signup-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                maxLength={13}
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.phone && <p className="text-xs text-rose-400">{fieldErrors.phone}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-300">자격 구분 <span className="font-normal text-slate-500">(여러 개 선택 가능)</span></span>
              <div role="group" aria-label="자격 구분 선택" className="grid grid-cols-3 gap-2">
                {ALL_PILOT_TRACKS.map((value) => {
                  const on = pilotTracks.includes(value)
                  return (
                    <button key={value}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleTrack(value)}
                      className={`rounded-control border px-2 py-3 text-sm font-semibold transition-colors ${
                        on ? 'border-sky bg-sky/10 text-sky' : 'border-white/15 bg-navy text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {PILOT_TRACK_SHORT[value]}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500">
                {pilotTracks.map((t) => PILOT_TRACK_LABEL[t]).join(' · ')} — 나중에 계정정보에서 바꿀 수 있어요.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">소속 (선택)</label>
              <InstitutionSelect idPrefix="signup-affiliation" value={organizationAffiliation} onChange={setOrganizationAffiliation} />
              <p className="text-xs text-slate-500">비행교육원·대학 등 소속이 있으면 선택하세요. 관리자 인증·구성원 현황에 사용돼요.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="text-xs font-semibold text-slate-300">
                비밀번호
              </label>
              <input id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.password && <p className="text-xs text-rose-400">{fieldErrors.password}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password2" className="text-xs font-semibold text-slate-300">
                비밀번호 확인
              </label>
              <input id="signup-password2"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              />
              {fieldErrors.passwordConfirm && <p className="text-xs text-rose-400">{fieldErrors.passwordConfirm}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-2.5 rounded-control border border-white/10 bg-white/[0.03] p-4">
                <label className="flex items-start gap-2.5 text-sm text-slate-300">
                  <input type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-sky"
                  />
                  <span>
                    <span className="font-semibold text-sky">(필수)</span> 이용약관에 동의합니다{' '}
                    <a href="/terms.html" target="_blank" rel="noreferrer" className="text-slate-400 underline underline-offset-2 hover:text-sky">전문 보기</a>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-sm text-slate-300">
                  <input type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-sky"
                  />
                  <span>
                    <span className="font-semibold text-sky">(필수)</span> 개인정보 수집·이용에 동의합니다{' '}
                    <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-slate-400 underline underline-offset-2 hover:text-sky">전문 보기</a>
                  </span>
                </label>
              </div>
              {fieldErrors.agreement && <p className="text-xs text-rose-400">{fieldErrors.agreement}</p>}
              {Object.keys(fieldErrors).length > 0 && (
                <p className="text-center text-xs font-semibold text-rose-400">
                  {Object.values(fieldErrors)[0] ?? '입력값을 확인해 주세요.'}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading} loading={isLoading}>
              {userType === 'individual' ? '개인 사용자로 가입하기' : '기관 사용자로 가입하기'}
            </Button>

            <p className="text-center text-xs text-slate-400">
              이미 계정이 있으신가요?{' '}
              <Link to="/login"
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
