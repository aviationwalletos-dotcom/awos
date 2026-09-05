import { ArrowLeft, Building2, Info, KeyRound, LogOut, MapPin, User, UserCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import React, { useEffect, useRef, useState } from 'react'

import { Button } from '../components/Button'
import { InfoTip } from '../components/InfoTip'
import { AccountSection } from '../components/account/AccountSection'
import { InstitutionSelect } from '../components/InstitutionSelect'
import { INDIVIDUAL_ROLE_LABEL } from '../lib/baas/types'
import { InstructorApprovalSection } from '../components/account/InstructorApprovalSection'
import { useAuth } from '../contexts/AuthContext'
import { baasFetch, getFreshDataClient, updateMyProfileFields } from '../lib/baas/supabaseTransport'
import { BAAS_BASE_URL } from '../lib/baas/config'
import { fetchAuthEmails, fetchLinkedProviders, linkEmailLoginWithPassword, registerIdentityEmailAsAccountEmail, startLinkProvider } from '../lib/supabase/oauth'
import type { OAuthProvider } from '../lib/supabase/oauth'
import { useChangePassword } from '../hooks/baas/useChangePassword'
import { useIndividualRoleOverride } from '../hooks/useIndividualRoleOverride'
import { usePilotTracks } from '../hooks/usePilotTracks'
import {
  ALL_PILOT_TRACKS,
  OPERATION_TYPE_DESCRIPTION,
  OPERATION_TYPE_LABEL,
  PILOT_TRACK_DESCRIPTION,
  PILOT_TRACK_LABEL,
} from '../lib/tracks'
import type { OperationType, PilotTrack } from '../lib/tracks'
import { useInstructorApprovalStatus } from '../hooks/baas/useInstructorApprovalStatus'
import { useOrganizationAffiliationOverride } from '../hooks/useOrganizationAffiliationOverride'

import type { IndividualRole } from '../lib/baas/types'


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
  )
}

export function AccountPage() {
  const navigate = useNavigate()
  const { account, isLoading, isAuthenticated, userType, logout, isLoggingOut, refetchAccount } = useAuth()
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'working'>('idle')
  // 한 번이라도 계정정보를 본 계정은 다음 소셜 로그인부터 환영 화면을 건너뛴다(AuthCallbackPage 참조)
  useEffect(() => {
    if (!account?.id) return
    try {
      window.localStorage.setItem(`awos_onboarded:${account.id}`, '1')
    } catch {
      // 무시
    }
  }, [account?.id])
  const justLinked = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('linked') === '1'
  const [linkedProviders, setLinkedProviders] = useState<string[] | null>(null)
  // 이메일 로그인 연결(소셜 계정에 비밀번호 설정)
  const [emailLinkOpen, setEmailLinkOpen] = useState(false)
  const [emailLinkPw, setEmailLinkPw] = useState('')
  const [emailLinkPw2, setEmailLinkPw2] = useState('')
  const [emailLinkState, setEmailLinkState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [emailLinkError, setEmailLinkError] = useState<string | null>(null)
  async function handleLinkEmailLogin() {
    if (emailLinkPw.length < 8) {
      setEmailLinkError('비밀번호는 8자 이상이어야 해요.')
      setEmailLinkState('error')
      return
    }
    if (emailLinkPw !== emailLinkPw2) {
      setEmailLinkError('비밀번호가 서로 달라요.')
      setEmailLinkState('error')
      return
    }
    setEmailLinkState('saving')
    setEmailLinkError(null)
    try {
      await linkEmailLoginWithPassword(emailLinkPw)
      setEmailLinkState('done')
      setEmailLinkPw('')
      setEmailLinkPw2('')
      // 서버 확인(schema11)이 오기 전에도 배지가 바로 '연결됨'으로 바뀌도록 먼저 반영한다
      setLinkedProviders((prev) => [...new Set([...(prev ?? []), 'email'])])
      void fetchLinkedProviders().then((next) => {
        // 서버가 email 을 못 돌려줘도(함수 미설치 등) 방금 설정한 사실은 유지한다
        setLinkedProviders([...new Set([...next, 'email'])])
      })
    } catch (err) {
      setEmailLinkState('error')
      setEmailLinkError(err instanceof Error ? err.message : '설정에 실패했어요.')
    }
  }
  // 카카오(비즈 앱 전환 전 가입)처럼 계정 이메일이 비어 있고 소셜 identity 에만 이메일이 있는 경우
  const [authEmails, setAuthEmails] = useState<{ accountEmail: string | null; identityEmail: string | null; identityProvider: string | null } | null>(null)
  const [emailRegisterState, setEmailRegisterState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailRegisterError, setEmailRegisterError] = useState<string | null>(null)
  useEffect(() => {
    if (!account?.id) return
    void fetchAuthEmails().then(setAuthEmails).catch(() => setAuthEmails(null))
  }, [account?.id])
  const needsEmailRegister = Boolean(authEmails && !authEmails.accountEmail && authEmails.identityEmail)
  async function handleRegisterIdentityEmail() {
    if (!authEmails?.identityEmail) return
    setEmailRegisterState('sending')
    setEmailRegisterError(null)
    try {
      await registerIdentityEmailAsAccountEmail(authEmails.identityEmail)
      setEmailRegisterState('sent')
    } catch (err) {
      setEmailRegisterState('error')
      setEmailRegisterError(err instanceof Error ? err.message : '등록에 실패했어요.')
    }
  }
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
      setLinkError(err instanceof Error ? err.message : '계정 연결에 실패했어요.')
    }
  }
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // 탈퇴 재확인 — 이메일 로그인이 있으면 비밀번호, 소셜 전용이면 확인 문구. 실수로 누르는 것을 막는다.
  const DELETE_PHRASE = '탈퇴해요'
  const hasPasswordLogin = Boolean(linkedProviders?.includes('email'))
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false)
  const canConfirmDelete = deleteAcknowledged && (hasPasswordLogin ? deletePassword.length > 0 : deletePhrase.trim() === DELETE_PHRASE)

  async function handleDeleteAccount() {
    setDeleteError(null)
    if (!deleteAcknowledged) {
      setDeleteError('데이터가 영구 삭제된다는 안내를 확인해 주세요.')
      return
    }
    setDeleteStep('working')
    try {
      // 1) 본인 재확인
      if (hasPasswordLogin) {
        const loginId = authEmails?.accountEmail ?? account?.user_id ?? ''
        const res = await baasFetch(`${BAAS_BASE_URL}/account/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: loginId, user_pw: deletePassword }),
        })
        if (!res.ok) throw new Error('비밀번호가 올바르지 않아요. 다시 확인해 주세요.')
      } else if (deletePhrase.trim() !== DELETE_PHRASE) {
        throw new Error(`확인 문구 "${DELETE_PHRASE}"를 정확히 입력해 주세요.`)
      }
      // 2) 삭제
      const client = await getFreshDataClient()
      if (!client) throw new Error('로그인 정보를 찾을 수 없어요. 다시 로그인 후 시도해 주세요.')
      const { error } = await client.rpc('delete_my_account')
      if (error) {
        throw new Error(
          error.message.includes('delete_my_account')
            ? '탈퇴 기능이 아직 서버에 설정되지 않았어요(schema7 SQL 실행 필요).'
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
      setDeleteError(err instanceof Error ? err.message : '탈퇴 처리에 실패했어요.')
      setDeleteStep('confirm')
    }
  }
  const { changePassword, isLoading: isChangingPassword, error: changeError, isSuccess, reset: resetChangePassword } = useChangePassword()
  const { override: roleOverride, setOverride: setRoleOverride } = useIndividualRoleOverride(account)
  const {
    tracks: pilotTracks,
    isDerivedFromLegacyRole,
    birthDate,
    operationType,
    nationality,
    setTracks: setPilotTracks,
    setBirthDate,
    setOperationType,
    setNationality,
  } = usePilotTracks(account)

  const hasSetupParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('setup') === '1'
  // "신규 가입"은 역할·자격 구분이 아직 저장되지 않은 계정만.
  const alreadySetUp = Boolean(account?.data?.individual_role) || !isDerivedFromLegacyRole
  // [BUGFIX] 이미 설정된 계정이 setup=1로 들어온 경우에만 로그북으로 보낸다 — "처음 들어왔을 때" 기준으로 한 번만 판정.
  // 예전엔 저장할 때마다 다시 판정해서, 자격 구분을 저장하는 순간 로그북으로 튕겼다(아래 항목을 더 고칠 수 없었다).
  const setupDecisionRef = useRef<'pending' | 'redirect' | 'stay'>('pending')
  if (setupDecisionRef.current === 'pending' && account?.id) {
    setupDecisionRef.current = hasSetupParam && alreadySetUp ? 'redirect' : 'stay'
  }
  const isSetupMode = hasSetupParam && setupDecisionRef.current === 'stay'
  useEffect(() => {
    if (setupDecisionRef.current === 'redirect') {
      window.location.replace('/logbook')
    }
    // account?.id 가 들어와 판정이 끝난 뒤 한 번만 실행되면 된다
  }, [account?.id])
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


  // v1.1 — 보유 트랙(복수) / 생년월일 / 운항형태
  const [selectedTracks, setSelectedTracks] = useState<PilotTrack[]>([])
  const [tracksSaved, setTracksSaved] = useState(false)
  const [birthInput, setBirthInput] = useState('')
  const [birthSaved, setBirthSaved] = useState(false)
  const [nationalityInput, setNationalityInput] = useState('')
  useEffect(() => {
    setNationalityInput(nationality ?? '대한민국')
  }, [nationality])
  // [BUGFIX] 저장 전에는 pilotTracks 가 기존 역할에서 매 렌더마다 새로 계산된 배열이라, 참조가 바뀔 때마다
  // 이 효과가 돌아 사용자가 방금 체크한 값을 되돌렸다(카카오 신규 계정에서 복수 선택 불가). 내용이 바뀔 때만 반영한다.
  const pilotTracksKey = pilotTracks.join(',')
  useEffect(() => {
    setSelectedTracks(pilotTracksKey ? (pilotTracksKey.split(',') as PilotTrack[]) : [])
  }, [pilotTracksKey])
  useEffect(() => {
    setBirthInput(birthDate ?? '')
  }, [birthDate])

  function toggleTrack(t: PilotTrack) {
    setTracksSaved(false)
    setSelectedTracks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }
  function handleSaveTracks(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedTracks.length === 0) return
    setPilotTracks(selectedTracks)
    setTracksSaved(true)
    // 기존 단일 역할도 첫 트랙에 맞춰 갱신해 옛 화면·기관 대시보드와 어긋나지 않게 한다.
    const legacy: IndividualRole = selectedTracks.includes('aircraft') ? 'pilot' : selectedTracks.includes('ultralight') ? 'drone_pilot' : 'pilot'
    setRoleOverride(legacy)
    void updateMyProfileFields({ individual_role: legacy }).then(() => refetchAccount()).catch(() => undefined)
  }
  function handleSaveBirth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBirthDate(birthInput || null)
    // 주소는 더 이상 받지 않는다(2026-09-05 결정). 기존 저장값은 그대로 두되 화면에서 지운다.
    setNationality(nationalityInput || null)
    setBirthSaved(true)
  }

  const [affiliationInput, setAffiliationInput] = useState('')
  const [affiliationSaved, setAffiliationSaved] = useState(false)

  useEffect(() => {
    setAffiliationInput(effectiveAffiliation ?? '')
  }, [effectiveAffiliation])

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
      setFormError('새 비밀번호는 8자 이상이어야 해요.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setFormError('새 비밀번호가 일치하지 않아요.')
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
      <div className="min-h-screen bg-navy-dark font-body text-white">
        <PageHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center text-slate-400">
          계정 정보를 불러오는 중이에요...
        </main>
      </div>
    )
  }

  if (!isAuthenticated || !account) {
    return (
      <div className="min-h-screen bg-navy-dark font-body text-white">
        <PageHeader />
        <main className="mx-auto max-w-md px-6 py-24 text-center">
          <UserCircle2 className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h1 className="mt-4 font-display text-xl font-extrabold">
            로그인이 필요해요
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            계정정보를 확인하려면 먼저 로그인해주세요.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={() => navigate('/login')}>
            로그인하러 가기
          </Button>
        </main>
      </div>
    )
  }

  const TypeIcon = userType === 'organization' ? Building2 : User
  const individualRoleLabel = effectiveIndividualRole ? INDIVIDUAL_ROLE_LABEL[effectiveIndividualRole] : '미설정'

  return (
    <div className="min-h-screen bg-navy-dark font-body text-white">
      <PageHeader />

      <main className="relative overflow-hidden py-[clamp(64px,8vw,120px)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(0,212,255,0.14),transparent_55%)]" />
        <div className="relative mx-auto max-w-2xl px-6">
          <span className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
            <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            계정정보
          </span>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display font-extrabold" style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.03em' }}>
              내 계정
            </h1>
            <Link to="/logbook"
              className="inline-flex items-center gap-2 rounded-control bg-sky px-5 py-2.5 text-sm font-bold text-navy transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              AWOS 시작하기 →
            </Link>
          </div>
          {isSetupMode && (
            <div className="mt-5 rounded-card border border-sky/30 bg-sky/10 p-4 text-sm leading-relaxed text-slate-200">
              👋 환영해요! 소셜 계정으로 가입이 완료됐어요. 아래에서 <span className="font-semibold text-sky">역할</span>과{' '}
              <span className="font-semibold text-sky">소속 기관</span>을 설정하면 로그북 준비 끝 — 설정 후 위의 "AWOS 시작하기"를 눌러주세요.
              <p className="mt-2 text-xs text-slate-400">
                이미 이메일로 가입한 적이 있다면? 이 계정 대신 <span className="font-semibold text-slate-200">기존 계정으로 로그인한 뒤</span> 아래 "로그인 방법 연결"에서 소셜 계정을 붙이면 기록이 한 계정에 모여요.
              </p>
            </div>
          )}

          <div className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky/10 text-sky">
                <TypeIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-white">
                  {account.name}
                </p>
                <p className="text-xs text-slate-400">
                  {userType === 'organization' ? '기관 사용자' : '개인 사용자'}
                  {userType === 'individual' && (
                    <>
                      {' · '}
                      <span
                        className={effectiveIndividualRole ? 'font-semibold text-sky' : 'text-slate-400'}
                      >
                        {individualRoleLabel}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-slate-400">이메일(아이디)</dt>
                <dd className="mt-1 text-sm text-white">
                  {account.user_id || authEmails?.identityEmail || '—'}
                  {needsEmailRegister && (
                    <span className="ml-1.5 text-[11px] text-slate-500">({authEmails?.identityProvider === 'kakao' ? '카카오' : authEmails?.identityProvider} 제공)</span>
                  )}
                </dd>
                {needsEmailRegister && (
                  <div className="mt-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                    {emailRegisterState === 'sent' ? (
                      <>확인 메일을 <span className="font-semibold">{authEmails?.identityEmail}</span>로 보냈어요. 메일의 링크를 누르면 이 주소가 계정 이메일로 등록돼요.</>
                    ) : (
                      <>
                        이 계정은 이메일 없이 가입되어 소셜 로그인이 준 이메일이 아직 계정에 등록되지 않았어요. 등록하면 이메일 로그인 연결·안내 메일 수신이 가능해요.
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleRegisterIdentityEmail()}
                            disabled={emailRegisterState === 'sending'}
                            className="rounded-control bg-sky px-3 py-1.5 text-xs font-semibold text-navy hover:opacity-90 disabled:opacity-50"
                          >
                            {emailRegisterState === 'sending' ? '보내는 중…' : `${authEmails?.identityEmail} 를 계정 이메일로 등록`}
                          </button>
                          {emailRegisterState === 'error' && <span className="text-rose-300">{emailRegisterError}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-400">전화번호</dt>
                <dd className="mt-1 text-sm text-white">{account.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-400">가입일</dt>
                <dd className="mt-1 text-sm text-white">{formatDateTime(account.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-400">최근 로그인</dt>
                <dd className="mt-1 text-sm text-white">{formatDateTime(account.last_logged_at)}</dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-white/10 pt-6">
              <Button variant="outline" tone="neutral" size="sm"
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

          <div className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
              <MapPin className="h-4 w-4 text-sky" aria-hidden="true" />
              소속 기관
              <InfoTip label="설명 보기">교관 승인 신청과 서명 요청에서 같은 소속끼리 먼저 보이게 하는 데 쓰여요.</InfoTip>
            </h2>

            <form onSubmit={handleSaveAffiliation} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
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
              <Button type="submit" size="md" tone="brand" disabled={!affiliationInput.trim()}>
                저장
              </Button>
            </form>

            {affiliationSaved && (
              <p role="status" className="mt-3 rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                소속 기관이 저장됐어요. ({effectiveAffiliation})
              </p>
            )}

            <p className="mt-3 text-xs text-slate-400">
              현재 소속: <span className={effectiveAffiliation ? 'font-semibold text-slate-300' : ''}>{effectiveAffiliation || '미설정'}</span>
            </p>
          </div>

          {userType === 'individual' && (
            <>
            <div className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
                <User className="h-4 w-4 text-sky" aria-hidden="true" />
                보유 자격 구분
                <InfoTip label="설명 보기">여러 개 고를 수 있어요. 비행기록·자격증·커런시는 구분별로 따로 계산되어 섞이지 않아요.</InfoTip>
              </h2>
              {isDerivedFromLegacyRole && (
                <p className="mt-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  아직 직접 고르지 않아 기존 역할({individualRoleLabel})에서 가져온 값이에요. 한 번 저장해 두면 이 안내가 사라집니다.
                </p>
              )}

              <form onSubmit={handleSaveTracks} className="mt-5 flex flex-col gap-4">
                <div role="group" aria-label="보유 자격 구분 선택" className="grid grid-cols-1 gap-2">
                  {ALL_PILOT_TRACKS.map((t) => {
                    const isChecked = selectedTracks.includes(t)
                    return (
                      <label key={t}
                        className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border px-4 py-3 text-sm font-medium transition-colors
                          ${isChecked ? 'border-sky bg-sky/10 text-sky' : 'border-white/15 bg-navy text-slate-300 hover:border-white/30'}`}
                      >
                        <input type="checkbox"
                          name="pilot-track"
                          value={t}
                          checked={isChecked}
                          onChange={() => toggleTrack(t)}
                          className="mt-0.5 h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                        />
                        <span className="flex flex-col">
                          <span>{PILOT_TRACK_LABEL[t]}</span>
                          <span className="mt-0.5 text-[11px] font-normal text-slate-500">{PILOT_TRACK_DESCRIPTION[t]}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>

                {tracksSaved && (
                  <p role="status" className="rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                    자격 구분이 저장됐어요. ({selectedTracks.map((t) => PILOT_TRACK_LABEL[t]).join(' · ')})
                  </p>
                )}

                <Button type="submit" size="md" tone="brand" disabled={selectedTracks.length === 0} className="self-start">
                  자격 구분 저장
                </Button>
              </form>
            </div>

            <AccountSection id="account-birth" title="생년월일 · 국적 · 운항형태" icon={User} status={birthDate ? `${birthDate}${operationType ? " · " + operationType : ""}` : "미설정"}>
              <p className="text-xs text-slate-400">
                항공신체검사 유효기간은 연령으로 갈려요(별표 8). 운항형태는 커런시 기준(180일 / 90일+야간)과 1종 신체검사 6개월 예외를 가려요.
              </p>
              <form onSubmit={handleSaveBirth} className="mt-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nationality" className="mb-1.5 block text-sm font-medium text-ink">국적 <span className="text-slate-500">(자격증 VI 항목)</span></label>
                    <input id="nationality"
                      type="text"
                      value={nationalityInput}
                      onChange={(e) => { setNationalityInput(e.target.value); setBirthSaved(false) }}
                      className="w-full rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    />
                  </div>
                  <div>
                    <label htmlFor="birth-date" className="mb-1.5 block text-sm font-medium text-ink">생년월일</label>
                    <input id="birth-date"
                      type="date"
                      value={birthInput}
                      onChange={(e) => { setBirthInput(e.target.value); setBirthSaved(false) }}
                      className="w-full rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-ink">운항형태</span>
                    <div role="radiogroup" aria-label="운항형태" className="flex flex-col gap-2">
                      {(['general', 'commercial'] as OperationType[]).map((o) => (
                        <label key={o}
                          className={`flex cursor-pointer items-start gap-2 rounded-control border px-3 py-2 text-xs transition-colors ${
                            operationType === o ? 'border-sky bg-sky/10 text-sky' : 'border-white/15 text-slate-300 hover:border-white/30'
                          }`}
                        >
                          <input type="radio"
                            name="operation-type"
                            value={o}
                            checked={operationType === o}
                            onChange={() => setOperationType(o)}
                            className="mt-0.5 h-3.5 w-3.5 accent-sky"
                          />
                          <span className="flex flex-col">
                            <span className="font-semibold">{OPERATION_TYPE_LABEL[o]}</span>
                            <span className="text-[11px] text-slate-500">{OPERATION_TYPE_DESCRIPTION[o]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {birthSaved && (
                  <p role="status" className="rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                    저장됐어요.
                  </p>
                )}
                <Button type="submit" size="md" tone="brand" className="self-start">
                  저장
                </Button>
              </form>
            </AccountSection>
            </>
          )}

          {userType === 'individual' && <InstructorApprovalSection account={account} affiliation={effectiveAffiliation} pilotTracks={pilotTracks} />}

          {userType === 'individual' && !isApprovalStatusLoading && (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Info className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
              {isApprovedInstructor ? (
                <>
                  교관 승인이 완료됐어요. 서명 요청함은{' '}
                  <Link to="/logbook" className="font-semibold text-sky underline-offset-2 hover:underline">
                    AWOS &gt; 서명 요청함
                  </Link>{' '}
                  탭에서 확인할 수 있어요.
                </>
              ) : (
                '승인이 완료되면 AWOS 페이지에 서명 요청함 탭이 나타나요.'
              )}
            </p>
          )}

          <AccountSection id="account-password" title="비밀번호 변경" icon={KeyRound} status={hasPasswordLogin ? undefined : "이메일 로그인 연결 후 사용"}>
            <p className="mt-1 text-xs text-slate-400">
              소셜(구글·카카오)로만 로그인하는 계정은 아래 "로그인 방법 연결"에서 이메일 로그인을 먼저 연결하세요.
            </p>

            <form onSubmit={handleChangePassword} noValidate className="mt-5 flex flex-col gap-4">
              {(formError || changeError) && (
                <p role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/100/10 px-3 py-2 text-xs font-medium text-rose-300">
                  {formError || changeError}
                </p>
              )}
              {isSuccess && !formError && !changeError && (
                <p role="status" className="rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                  비밀번호가 변경됐어요.
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="current-password" className="text-xs font-semibold text-slate-300">
                  현재 비밀번호
                </label>
                <input id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-password" className="text-xs font-semibold text-slate-300">
                  새 비밀번호
                </label>
                <input id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상 입력하세요"
                  className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-password-confirm" className="text-xs font-semibold text-slate-300">
                  새 비밀번호 확인
                </label>
                <input id="new-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                />
              </div>

              <Button type="submit" size="md" className="mt-2" disabled={isChangingPassword} loading={isChangingPassword}>
                비밀번호 변경
              </Button>
            </form>
          </AccountSection>
        </div>

        <section className="mx-auto mt-6 max-w-3xl px-6">
          <AccountSection id="account-links" title="로그인 방법 연결" icon={KeyRound} className="!mt-0" status={linkedProviders ? `연결됨 ${linkedProviders.length}개` : undefined}>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              이 계정에 구글·카카오 로그인을 연결해두면, 어떤 방법으로 로그인해도 <span className="font-semibold text-slate-200">같은 계정·같은 기록</span>으로 들어와요.
            </p>
            {justLinked && (
              <p className="mt-3 rounded-control border border-go/30 bg-go/10 px-3 py-2 text-sm font-semibold text-go">연결이 완료됐어요!</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {(['email', 'google', 'kakao'] as const).map((prov) => {
                const label = prov === 'email' ? '이메일' : prov === 'google' ? '구글' : '카카오'
                const linked = linkedProviders?.includes(prov) ?? false
                return (
                  <span key={prov}
                    className={`rounded-control border px-3 py-1.5 text-xs font-semibold ${linked ? 'border-go/40 bg-go/10 text-go' : 'border-white/10 bg-navy text-slate-500'}`}
                  >
                    {label} {linked ? '연결됨' : '미연결'}
                  </span>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!(linkedProviders?.includes('email')) && (
                <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setEmailLinkOpen((o) => !o)}>
                  이메일 로그인 연결하기
                </Button>
              )}
              {!(linkedProviders?.includes('google')) && (
                <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setLinkTarget('google')}>구글 연결하기</Button>
              )}
              {!(linkedProviders?.includes('kakao')) && (
                <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setLinkTarget('kakao')}>카카오 연결하기</Button>
              )}
            </div>
            {linkError && <p className="mt-3 text-xs text-rose-300">{linkError}</p>}
            {emailLinkOpen && !(linkedProviders?.includes('email')) && (
              <div className="mt-4 rounded-control border border-white/10 bg-navy p-4">
                <p className="text-sm font-semibold text-ink">이메일 로그인 연결</p>
                <p className="mt-1 text-xs text-slate-400">
                  이 계정의 이메일({account.user_id || authEmails?.identityEmail || '—'})과 아래 비밀번호로도 로그인할 수 있게 돼요. 구글·카카오 로그인은 그대로 유지돼요.
                  {needsEmailRegister && ' (카카오로만 가입한 계정은 위의 "계정 이메일로 등록"을 먼저 마쳐야 해요.)'}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input type="password" autoComplete="new-password" placeholder="새 비밀번호 (8자 이상)" value={emailLinkPw} onChange={(e) => setEmailLinkPw(e.target.value)} className="rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink" />
                  <input type="password" autoComplete="new-password" placeholder="비밀번호 확인" value={emailLinkPw2} onChange={(e) => setEmailLinkPw2(e.target.value)} className="rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" onClick={() => void handleLinkEmailLogin()} disabled={emailLinkState === 'saving' || needsEmailRegister}>
                    {emailLinkState === 'saving' ? '설정 중…' : '비밀번호 설정하고 연결'}
                  </Button>
                  {emailLinkState === 'done' && <span className="text-xs text-go">연결됐어요. 이제 이메일+비밀번호로도 로그인돼요.</span>}
                  {emailLinkState === 'error' && emailLinkError && <span className="text-xs text-rose-300">{emailLinkError}</span>}
                </div>
              </div>
            )}
          </AccountSection>
        </section>

        {linkTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setLinkTarget(null)}>
            <div className="w-full max-w-md rounded-card border border-white/10 bg-navy p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-lg font-extrabold text-ink">
                {linkTarget === 'google' ? '구글' : '카카오'} 계정을 연결할까요?
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                <li>· 연결 후 {linkTarget === 'google' ? '구글' : '카카오'}로 로그인하면 <span className="font-semibold text-ink">지금 이 계정</span>으로 들어와요.</li>
                <li>· 기록·자격증은 이 계정의 것이 그대로 유지돼요.</li>
                <li>· 그 소셜 계정으로 이미 따로 가입돼 있었다면 연결이 거부될 수 있어요 — 그 경우 그쪽 계정을 먼저 탈퇴해 주세요.</li>
              </ul>
              {linkError && <p className="mt-3 text-xs text-rose-300">{linkError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setLinkTarget(null)}>취소</Button>
                <Button type="button" size="sm" onClick={() => void handleConfirmLink()}>연결 진행</Button>
              </div>
            </div>
          </div>
        )}

        <section className="mx-auto mt-6 max-w-3xl px-6 pb-16">
          <AccountSection id="account-delete" title="회원 탈퇴" tone="danger" className="!mt-0">
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              탈퇴하면 계정과 함께 비행기록·자격증·서명 요청 등 모든 데이터가 <span className="font-semibold text-rose-300">즉시 영구 삭제</span>되며 복구할 수 없어요.
              필요한 기록은 탈퇴 전에 백업해 주세요.
            </p>
            {deleteStep === 'idle' && (
              <button type="button"
                onClick={() => setDeleteStep('confirm')}
                className="mt-4 rounded-control border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
              >
                회원 탈퇴 진행하기
              </button>
            )}
            {(deleteStep === 'confirm' || deleteStep === 'working') && (
              <div className="mt-4 rounded-control border border-rose-400/30 bg-navy p-4">
                <p className="text-sm font-semibold text-ink">정말 탈퇴하시겠어요?</p>
                <p className="mt-1 text-xs text-slate-400">이 작업은 되돌릴 수 없어요. 본인 확인 후 진행돼요.</p>

                <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-slate-300">
                  <input type="checkbox"
                    checked={deleteAcknowledged}
                    onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-rose-400"
                  />
                  <span>비행기록·자격증·서명 요청 등 모든 데이터가 즉시 영구 삭제되고 복구할 수 없다는 것을 이해했어요.</span>
                </label>

                {hasPasswordLogin ? (
                  <div className="mt-3">
                    <label htmlFor="delete-password" className="mb-1 block text-xs font-semibold text-slate-300">비밀번호 재확인</label>
                    <input id="delete-password"
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="현재 비밀번호"
                      className="w-full max-w-sm rounded-control border border-white/15 bg-panel px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <label htmlFor="delete-phrase" className="mb-1 block text-xs font-semibold text-slate-300">
                      확인 문구 입력 — 아래 칸에 <span className="font-mono-data text-rose-300">{DELETE_PHRASE}</span> 라고 적어 주세요
                    </label>
                    <input id="delete-phrase"
                      type="text"
                      autoComplete="off"
                      value={deletePhrase}
                      onChange={(e) => setDeletePhrase(e.target.value)}
                      placeholder={DELETE_PHRASE}
                      className="w-full max-w-sm rounded-control border border-white/15 bg-panel px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">소셜 로그인만 연결된 계정이라 비밀번호 대신 문구로 확인해요.</p>
                  </div>
                )}

                {deleteError && <p className="mt-2 text-xs text-rose-300">{deleteError}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleteStep === 'working' || !canConfirmDelete}
                    className="rounded-control bg-rose-500/90 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-60"
                  >
                    {deleteStep === 'working' ? '삭제 중…' : '네, 영구 삭제해요'}
                  </button>
                  <button type="button"
                    onClick={() => { setDeleteStep('idle'); setDeleteError(null) }}
                    disabled={deleteStep === 'working'}
                    className="rounded-control border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </AccountSection>
        </section>
      </main>
    </div>
  )
}
