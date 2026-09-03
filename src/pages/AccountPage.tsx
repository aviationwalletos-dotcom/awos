import { ArrowLeft, Building2, Info, KeyRound, LogOut, MapPin, User, UserCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react'

import { Button } from '../components/Button'
import { InstitutionSelect } from '../components/InstitutionSelect'
import { INDIVIDUAL_ROLE_LABEL } from '../lib/baas/types'
import { InstructorApprovalSection } from '../components/account/InstructorApprovalSection'
import { useAuth } from '../contexts/AuthContext'
import { getAuthedDataClient, updateMyProfileFields } from '../lib/baas/supabaseTransport'
import { fetchLinkedProviders, startLinkProvider } from '../lib/supabase/oauth'
import type { OAuthProvider } from '../lib/supabase/oauth'
import { useChangePassword } from '../hooks/baas/useChangePassword'
import { useIndividualRoleOverride } from '../hooks/useIndividualRoleOverride'
import { useInstructorApprovalStatus } from '../hooks/baas/useInstructorApprovalStatus'
import { useOrganizationAffiliationOverride } from '../hooks/useOrganizationAffiliationOverride'

import type { IndividualRole } from '../lib/baas/types'

const INDIVIDUAL_ROLE_OPTIONS: IndividualRole[] = ['pilot', 'drone_pilot'] // 우선 조종사·드론 조종사만 오픈

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

function PageHeader() {
  return (
    <header data-mbaas-oid="5ggnket" className="border-b border-white/10">
      <div data-mbaas-oid="tv2imbz" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          data-mbaas-oid="w28a72m" to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          홈으로
        </Link>
        <p data-mbaas-oid="vkxjkyn" className="font-display text-base font-extrabold tracking-tight text-white">
          Aviation Wallet <span data-mbaas-oid="343vg6v" className="text-sky">OS</span>
        </p>
      </div>
    </header>
  )
}

export function AccountPage() {
  const navigate = useNavigate()
  const { account, isLoading, isAuthenticated, userType, logout, isLoggingOut, refetchAccount } = useAuth()
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'working'>('idle')
  const isSetupMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('setup') === '1'
  const justLinked = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('linked') === '1'
  const [linkedProviders, setLinkedProviders] = useState<string[] | null>(null)
  const [linkTarget, setLinkTarget] = useState<OAuthProvider | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    void fetchLinkedProviders().then(setLinkedProviders).catch(() => setLinkedProviders([]))
  }, [isAuthenticated])

  async function handleConfirmLink() {
    if (!linkTarget) return
    setLinkError(null)
    try {
      await startLinkProvider(linkTarget)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : '계정 연결에 실패했습니다.')
    }
  }
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleteStep('working')
    try {
      const client = getAuthedDataClient()
      if (!client) throw new Error('로그인 정보를 찾을 수 없습니다. 다시 로그인 후 시도해 주세요.')
      const { error } = await client.rpc('delete_my_account')
      if (error) {
        throw new Error(
          error.message.includes('delete_my_account')
            ? '탈퇴 기능이 아직 서버에 설정되지 않았습니다(schema7 SQL 실행 필요).'
            : error.message,
        )
      }
      // 이 기기에 남은 캐시(비행기록·자격증 등) 제거
      try {
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith('awos'))
          .forEach((key) => window.localStorage.removeItem(key))
      } catch {
        // 캐시 정리 실패는 무시
      }
      await logout()
      window.location.href = '/'
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '탈퇴 처리에 실패했습니다.')
      setDeleteStep('confirm')
    }
  }
  const { changePassword, isLoading: isChangingPassword, error: changeError, isSuccess, reset: resetChangePassword } = useChangePassword()
  const { override: roleOverride, setOverride: setRoleOverride } = useIndividualRoleOverride(account)
  const { override: affiliationOverride, setOverride: setAffiliationOverride } = useOrganizationAffiliationOverride(account)
  const { isApproved: isApprovedInstructor, isLoading: isApprovalStatusLoading } = useInstructorApprovalStatus(
    userType === 'individual' ? account : null,
  )

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const accountIndividualRole = account?.data?.individual_role as IndividualRole | undefined
  const effectiveIndividualRole: IndividualRole | undefined = roleOverride ?? accountIndividualRole

  const accountAffiliation = account?.data?.organization_affiliation
  const effectiveAffiliation: string | undefined = affiliationOverride ?? accountAffiliation ?? undefined

  const [selectedRole, setSelectedRole] = useState<IndividualRole | ''>('')
  const [roleSaved, setRoleSaved] = useState(false)

  const [affiliationInput, setAffiliationInput] = useState('')
  const [affiliationSaved, setAffiliationSaved] = useState(false)

  useEffect(() => {
    setSelectedRole(effectiveIndividualRole ?? '')
  }, [effectiveIndividualRole])

  useEffect(() => {
    setAffiliationInput(effectiveAffiliation ?? '')
  }, [effectiveAffiliation])

  function handleSaveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRole) return
    setRoleOverride(selectedRole)
    setRoleSaved(true)
    void updateMyProfileFields({ individual_role: selectedRole }).then(() => refetchAccount()).catch(() => undefined)
  }

  function handleSaveAffiliation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!affiliationInput.trim()) return
    setAffiliationOverride(affiliationInput.trim())
    setAffiliationSaved(true)
    void updateMyProfileFields({ institution: affiliationInput.trim() }).then(() => refetchAccount()).catch(() => undefined)
  }

  async function handleLogout() {
    try {
      await logout()
      navigate('/')
    } catch {
      // error 상태는 로그아웃 버튼 쪽에서 재시도 가능
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    resetChangePassword()

    if (!currentPassword || !newPassword) {
      setFormError('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.')
      return
    }
    if (newPassword.length < 8) {
      setFormError('새 비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setFormError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch {
      // changeError 상태로 화면에 안내됨
    }
  }

  if (isLoading) {
    return (
      <div data-mbaas-oid="o007chv" className="min-h-screen bg-navy-dark font-body text-white">
        <PageHeader />
        <main data-mbaas-oid="1tcipp9" className="mx-auto max-w-2xl px-6 py-24 text-center text-slate-400">
          계정 정보를 불러오는 중입니다...
        </main>
      </div>
    )
  }

  if (!isAuthenticated || !account) {
    return (
      <div data-mbaas-oid="qfrkwnk" className="min-h-screen bg-navy-dark font-body text-white">
        <PageHeader />
        <main data-mbaas-oid="95a8tz4" className="mx-auto max-w-md px-6 py-24 text-center">
          <UserCircle2 className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h1 data-mbaas-oid="9bqprhy" className="mt-4 font-display text-xl font-extrabold">
            로그인이 필요합니다
          </h1>
          <p data-mbaas-oid="0gr4rtz" className="mt-2 text-sm text-slate-400">
            계정정보를 확인하려면 먼저 로그인해주세요.
          </p>
          <Button data-mbaas-oid="seses49" size="lg" className="mt-6 w-full" onClick={() => navigate('/login')}>
            로그인하러 가기
          </Button>
        </main>
      </div>
    )
  }

  const TypeIcon = userType === 'organization' ? Building2 : User
  const individualRoleLabel = effectiveIndividualRole ? INDIVIDUAL_ROLE_LABEL[effectiveIndividualRole] : '미설정'

  return (
    <div data-mbaas-oid="kym8n8p" className="min-h-screen bg-navy-dark font-body text-white">
      <PageHeader />

      <main data-mbaas-oid="pmhr8v8" className="relative overflow-hidden py-[clamp(64px,8vw,120px)]">
        <div data-mbaas-oid="s1w9ydd" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(0,212,255,0.14),transparent_55%)]" />
        <div data-mbaas-oid="ci6ukcu" className="relative mx-auto max-w-2xl px-6">
          <span data-mbaas-oid="pn272mq" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
            <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            계정정보
          </span>
          <div data-mbaas-oid="acchdr" className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <h1 data-mbaas-oid="c04m324" className="font-display font-extrabold" style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.03em' }}>
              내 계정
            </h1>
            <Link
              data-mbaas-oid="accstart" to="/logbook"
              className="inline-flex items-center gap-2 rounded-control bg-sky px-5 py-2.5 text-sm font-bold text-navy transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              AWOS 시작하기 →
            </Link>
          </div>
          {isSetupMode && (
            <div data-mbaas-oid="accwelc" className="mt-5 rounded-card border border-sky/30 bg-sky/10 p-4 text-sm leading-relaxed text-slate-200">
              👋 환영해요! 소셜 계정으로 가입이 완료됐어요. 아래에서 <span data-mbaas-oid="accwelc2" className="font-semibold text-sky">역할</span>과{' '}
              <span data-mbaas-oid="accwelc3" className="font-semibold text-sky">소속 기관</span>을 설정하면 로그북 준비 끝 — 설정 후 위의 "AWOS 시작하기"를 눌러주세요.
              <p data-mbaas-oid="accwelc4" className="mt-2 text-xs text-slate-400">
                이미 이메일로 가입한 적이 있다면? 이 계정 대신 <span data-mbaas-oid="accwelc5" className="font-semibold text-slate-200">기존 계정으로 로그인한 뒤</span> 아래 "로그인 방법 연결"에서 소셜 계정을 붙이면 기록이 한 계정에 모여요. (이 계정은 회원 탈퇴로 정리)
              </p>
            </div>
          )}

          <div data-mbaas-oid="5703erz" className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
            <div data-mbaas-oid="qqupcvj" className="flex items-center gap-3">
              <span data-mbaas-oid="2upkmik" className="flex h-11 w-11 items-center justify-center rounded-full bg-sky/10 text-sky">
                <TypeIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div data-mbaas-oid="nsx62wi">
                <p data-mbaas-oid="pmawe5u" data-mbaas-dynamic="true" className="text-base font-semibold text-white">
                  {account.name}
                </p>
                <p data-mbaas-dynamic="true" data-mbaas-oid="8sw4ghn" className="text-xs text-slate-400">
                  {userType === 'organization' ? '기관 사용자' : '개인 사용자'}
                  {userType === 'individual' && (
                    <>
                      {' · '}
                      <span
                        data-mbaas-oid="8sw4ghp"
                        className={effectiveIndividualRole ? 'font-semibold text-sky' : 'text-slate-400'}
                      >
                        {individualRoleLabel}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <dl data-mbaas-oid="c6ctrzx" className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <div data-mbaas-oid="sfsjqz6">
                <dt data-mbaas-oid="gi9m403" className="text-xs font-semibold text-slate-400">이메일(아이디)</dt>
                <dd data-mbaas-oid="5y03z7c" data-mbaas-dynamic="true" className="mt-1 text-sm text-white">{account.user_id}</dd>
              </div>
              <div data-mbaas-oid="fibvish">
                <dt data-mbaas-oid="j5tyygq" className="text-xs font-semibold text-slate-400">전화번호</dt>
                <dd data-mbaas-oid="eu829xb" data-mbaas-dynamic="true" className="mt-1 text-sm text-white">{account.phone}</dd>
              </div>
              <div data-mbaas-oid="46vhs73">
                <dt data-mbaas-oid="cvglcqv" className="text-xs font-semibold text-slate-400">가입일</dt>
                <dd data-mbaas-oid="wzmcj2d" data-mbaas-dynamic="true" className="mt-1 text-sm text-white">{formatDateTime(account.created_at)}</dd>
              </div>
              <div data-mbaas-oid="2a9mo7y">
                <dt data-mbaas-oid="ojvuqu2" className="text-xs font-semibold text-slate-400">최근 로그인</dt>
                <dd data-mbaas-oid="8w8rttv" data-mbaas-dynamic="true" className="mt-1 text-sm text-white">{formatDateTime(account.last_logged_at)}</dd>
              </div>
            </dl>

            <div data-mbaas-oid="0nk5r6e" className="mt-6 border-t border-white/10 pt-6">
              <Button
                data-mbaas-oid="n4k87nc" variant="outline" tone="neutral" size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                loading={isLoggingOut}
                className="border-white/20 text-slate-200 hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                로그아웃
              </Button>
            </div>
          </div>

          <div data-mbaas-oid="xk2vr1f" className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
            <h2 data-mbaas-oid="dbirqmq" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
              <MapPin className="h-4 w-4 text-sky" aria-hidden="true" />
              소속 기관
            </h2>
            <p data-mbaas-oid="09rvkqu" className="mt-1 flex items-start gap-2 text-xs text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
              이 설정은 이 브라우저에 즉시 저장되며, "개인설정" 게시판을 통해 서버에도 자동으로 동기화되어 다른 기기에서도 확인할 수 있습니다(서버 동기화 실패 시에도 이 브라우저의 값은 그대로 유지됩니다). 교관 승인 신청 및 서명 요청 시 소속 기관 필터에 사용됩니다.
            </p>

            <form data-mbaas-oid="stl3cxh" onSubmit={handleSaveAffiliation} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div data-mbaas-oid="uxeyext" className="flex-1">
                <InstitutionSelect
                  idPrefix="organization-affiliation"
                  label="소속 기관명"
                  value={affiliationInput}
                  onChange={(next) => {
                    setAffiliationInput(next)
                    setAffiliationSaved(false)
                  }}
                />
              </div>
              <Button data-mbaas-oid="j98bpf0" type="submit" size="md" tone="brand" disabled={!affiliationInput.trim()}>
                저장
              </Button>
            </form>

            {affiliationSaved && (
              <p data-mbaas-oid="vfzi6xz" role="status" className="mt-3 rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                소속 기관이 저장되었습니다. ({effectiveAffiliation})
              </p>
            )}

            <p data-mbaas-oid="8tbbs0n" className="mt-3 text-xs text-slate-400">
              현재 소속: <span data-mbaas-oid="5wf84ek" className={effectiveAffiliation ? 'font-semibold text-slate-300' : ''}>{effectiveAffiliation || '미설정'}</span>
            </p>
          </div>

          {userType === 'individual' && (
            <div data-mbaas-oid="xoayoig" className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
              <h2 data-mbaas-oid="f2ir82j" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
                <User className="h-4 w-4 text-sky" aria-hidden="true" />
                역할 설정
              </h2>
              <p data-mbaas-oid="le1951t" className="mt-1 flex items-start gap-2 text-xs text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
                이 설정은 이 브라우저에 즉시 저장되며, "개인설정" 게시판을 통해 서버에도 자동으로 동기화되어 다른 기기에서도 확인할 수 있습니다(서버 동기화 실패 시에도 이 브라우저의 값은 그대로 유지됩니다).
              </p>

              <form data-mbaas-oid="yta84vp" onSubmit={handleSaveRole} className="mt-5 flex flex-col gap-4">
                <div
                  data-mbaas-oid="701ds1i" role="radiogroup"
                  aria-label="개인 역할 선택"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {INDIVIDUAL_ROLE_OPTIONS.map((role) => {
                    const isChecked = selectedRole === role
                    return (
                      <label
                        data-mbaas-oid="9kqk7vs" key={role}
                        className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border px-4 py-2.5 text-sm font-medium transition-colors
                          ${isChecked ? 'border-sky bg-sky/10 text-sky' : 'border-white/15 bg-navy text-slate-300 hover:border-white/30'}`}
                      >
                        <input
                          data-mbaas-oid="r2nubxn" type="radio"
                          name="individual-role"
                          value={role}
                          checked={isChecked}
                          onChange={() => {
                            setSelectedRole(role)
                            setRoleSaved(false)
                          }}
                          className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                        />
                        {INDIVIDUAL_ROLE_LABEL[role]}
                      </label>
                    )
                  })}
                </div>

                {roleSaved && (
                  <p data-mbaas-oid="x1byfxi" role="status" className="rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                    역할이 저장되었습니다. ({individualRoleLabel})
                  </p>
                )}

                <Button data-mbaas-oid="71ty616" type="submit" size="md" tone="brand" disabled={!selectedRole} className="self-start">
                  역할 저장
                </Button>
              </form>
            </div>
          )}

          {userType === 'individual' && <InstructorApprovalSection account={account} affiliation={effectiveAffiliation} />}

          {userType === 'individual' && !isApprovalStatusLoading && (
            <p data-mbaas-oid="ibxhint" className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Info className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
              {isApprovedInstructor ? (
                <>
                  교관 승인이 완료되었습니다. 서명 요청함은{' '}
                  <Link data-mbaas-oid="wav606q" to="/logbook" className="font-semibold text-sky underline-offset-2 hover:underline">
                    AWOS &gt; 서명 요청함
                  </Link>{' '}
                  탭에서 확인할 수 있습니다.
                </>
              ) : (
                '승인이 완료되면 AWOS 페이지에 서명 요청함 탭이 나타납니다.'
              )}
            </p>
          )}

          <div data-mbaas-oid="rc5t6ys" className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
            <h2 data-mbaas-oid="58vog99" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
              <KeyRound className="h-4 w-4 text-sky" aria-hidden="true" />
              비밀번호 변경
            </h2>
            <p data-mbaas-oid="ih007jd" className="mt-1 text-xs text-slate-400">
              SNS 로그인 계정은 비밀번호 변경이 지원되지 않습니다.
            </p>

            <form data-mbaas-oid="2p1n958" onSubmit={handleChangePassword} noValidate className="mt-5 flex flex-col gap-4">
              {(formError || changeError) && (
                <p data-mbaas-oid="4dayk68" role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/100/10 px-3 py-2 text-xs font-medium text-rose-300">
                  {formError || changeError}
                </p>
              )}
              {isSuccess && !formError && !changeError && (
                <p data-mbaas-oid="udhqxv7" role="status" className="rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                  비밀번호가 변경되었습니다.
                </p>
              )}

              <div data-mbaas-oid="5we6oib" className="flex flex-col gap-1.5">
                <label data-mbaas-oid="b3nlzlx" htmlFor="current-password" className="text-xs font-semibold text-slate-300">
                  현재 비밀번호
                </label>
                <input
                  data-mbaas-oid="yowl8yg" id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
              </div>

              <div data-mbaas-oid="qinvydj" className="flex flex-col gap-1.5">
                <label data-mbaas-oid="m6pzt43" htmlFor="new-password" className="text-xs font-semibold text-slate-300">
                  새 비밀번호
                </label>
                <input
                  data-mbaas-oid="io0xpna" id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상 입력하세요"
                  className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
              </div>

              <div data-mbaas-oid="q29aubg" className="flex flex-col gap-1.5">
                <label data-mbaas-oid="v2ep3hv" htmlFor="new-password-confirm" className="text-xs font-semibold text-slate-300">
                  새 비밀번호 확인
                </label>
                <input
                  data-mbaas-oid="7c21psm" id="new-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
              </div>

              <Button data-mbaas-oid="65q8wfy" type="submit" size="md" className="mt-2" disabled={isChangingPassword} loading={isChangingPassword}>
                비밀번호 변경
              </Button>
            </form>
          </div>
        </div>

        <section data-mbaas-oid="lnk00" className="mx-auto mt-12 max-w-3xl px-6">
          <div data-mbaas-oid="lnk01" className="rounded-card border border-white/10 bg-white/5 p-6">
            <h2 data-mbaas-oid="lnk02" className="font-display text-lg font-extrabold text-ink">로그인 방법 연결</h2>
            <p data-mbaas-oid="lnk03" className="mt-2 text-sm leading-relaxed text-slate-400">
              이 계정에 구글·카카오 로그인을 연결해두면, 어떤 방법으로 로그인해도 <span data-mbaas-oid="lnk04" className="font-semibold text-slate-200">같은 계정·같은 기록</span>으로 들어옵니다.
            </p>
            {justLinked && (
              <p data-mbaas-oid="lnk05" className="mt-3 rounded-control border border-go/30 bg-go/10 px-3 py-2 text-sm font-semibold text-go">연결이 완료됐어요!</p>
            )}
            <div data-mbaas-oid="lnk06" className="mt-4 flex flex-wrap gap-2">
              {(['email', 'google', 'kakao'] as const).map((prov) => {
                const label = prov === 'email' ? '이메일' : prov === 'google' ? '구글' : '카카오'
                const linked = linkedProviders?.includes(prov) ?? false
                return (
                  <span
                    data-mbaas-oid="lnk07" key={prov}
                    className={`rounded-control border px-3 py-1.5 text-xs font-semibold ${linked ? 'border-go/40 bg-go/10 text-go' : 'border-white/10 bg-navy text-slate-500'}`}
                  >
                    {label} {linked ? '연결됨' : '미연결'}
                  </span>
                )
              })}
            </div>
            <div data-mbaas-oid="lnk08" className="mt-4 flex flex-wrap gap-2">
              {!(linkedProviders?.includes('google')) && (
                <Button data-mbaas-oid="lnk09" type="button" size="sm" variant="outline" tone="neutral" onClick={() => setLinkTarget('google')}>구글 연결하기</Button>
              )}
              {!(linkedProviders?.includes('kakao')) && (
                <Button data-mbaas-oid="lnk10" type="button" size="sm" variant="outline" tone="neutral" onClick={() => setLinkTarget('kakao')}>카카오 연결하기</Button>
              )}
            </div>
            {linkError && <p data-mbaas-oid="lnk11" className="mt-3 text-xs text-rose-300">{linkError}</p>}
          </div>
        </section>

        {linkTarget && (
          <div data-mbaas-oid="lnkmodal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setLinkTarget(null)}>
            <div data-mbaas-oid="lnkmodal1" className="w-full max-w-md rounded-card border border-white/10 bg-navy p-6" onClick={(e) => e.stopPropagation()}>
              <h3 data-mbaas-oid="lnkmodal2" className="font-display text-lg font-extrabold text-ink">
                {linkTarget === 'google' ? '구글' : '카카오'} 계정을 연결할까요?
              </h3>
              <ul data-mbaas-oid="lnkmodal3" className="mt-3 space-y-1.5 text-sm text-slate-300">
                <li data-mbaas-oid="lnkmodal4">· 연결 후 {linkTarget === 'google' ? '구글' : '카카오'}로 로그인하면 <span data-mbaas-oid="lnkmodal5" className="font-semibold text-ink">지금 이 계정</span>으로 들어옵니다.</li>
                <li data-mbaas-oid="lnkmodal6">· 기록·자격증은 이 계정의 것이 그대로 유지돼요.</li>
                <li data-mbaas-oid="lnkmodal7">· 그 소셜 계정으로 이미 따로 가입돼 있었다면 연결이 거부될 수 있어요 — 그 경우 그쪽 계정을 먼저 탈퇴해 주세요.</li>
              </ul>
              {linkError && <p data-mbaas-oid="lnkmodal8" className="mt-3 text-xs text-rose-300">{linkError}</p>}
              <div data-mbaas-oid="lnkmodal9" className="mt-5 flex justify-end gap-2">
                <Button data-mbaas-oid="lnkmodalA" type="button" size="sm" variant="outline" tone="neutral" onClick={() => setLinkTarget(null)}>취소</Button>
                <Button data-mbaas-oid="lnkmodalB" type="button" size="sm" onClick={() => void handleConfirmLink()}>연결 진행</Button>
              </div>
            </div>
          </div>
        )}

        <section data-mbaas-oid="delacc0" className="mx-auto mt-12 max-w-3xl px-6 pb-16">
          <div data-mbaas-oid="delacc1" className="rounded-card border border-rose-500/25 bg-rose-500/5 p-6">
            <h2 data-mbaas-oid="delacc2" className="font-display text-lg font-extrabold text-rose-300">회원 탈퇴</h2>
            <p data-mbaas-oid="delacc3" className="mt-2 text-sm leading-relaxed text-slate-400">
              탈퇴하면 계정과 함께 비행기록·자격증·서명 요청 등 모든 데이터가 <span data-mbaas-oid="delacc4" className="font-semibold text-rose-300">즉시 영구 삭제</span>되며 복구할 수 없습니다.
              필요한 기록은 탈퇴 전에 백업해 주세요.
            </p>
            {deleteStep === 'idle' && (
              <button
                data-mbaas-oid="delacc5" type="button"
                onClick={() => setDeleteStep('confirm')}
                className="mt-4 rounded-control border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
              >
                회원 탈퇴 진행하기
              </button>
            )}
            {(deleteStep === 'confirm' || deleteStep === 'working') && (
              <div data-mbaas-oid="delacc6" className="mt-4 rounded-control border border-rose-400/30 bg-navy p-4">
                <p data-mbaas-oid="delacc7" className="text-sm font-semibold text-ink">정말 탈퇴하시겠어요?</p>
                <p data-mbaas-oid="delacc8" className="mt-1 text-xs text-slate-400">이 작업은 되돌릴 수 없습니다.</p>
                {deleteError && <p data-mbaas-oid="delacc9" className="mt-2 text-xs text-rose-300">{deleteError}</p>}
                <div data-mbaas-oid="delaccA" className="mt-3 flex flex-wrap gap-2">
                  <button
                    data-mbaas-oid="delaccB" type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleteStep === 'working'}
                    className="rounded-control bg-rose-500/90 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-60"
                  >
                    {deleteStep === 'working' ? '삭제 중…' : '네, 영구 삭제합니다'}
                  </button>
                  <button
                    data-mbaas-oid="delaccC" type="button"
                    onClick={() => { setDeleteStep('idle'); setDeleteError(null) }}
                    disabled={deleteStep === 'working'}
                    className="rounded-control border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
