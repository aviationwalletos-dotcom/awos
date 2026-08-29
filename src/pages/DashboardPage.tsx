import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileCheck2, Gauge, Info, ShieldCheck, Users } from 'lucide-react'

import { Footer } from '../components/Footer'
import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { PersonnelFilterBar, type StatusFilter } from '../components/dashboard/PersonnelFilterBar'
import { PersonnelTable, buildPersonnelRow } from '../components/dashboard/PersonnelTable'
import { ExpiryAlertList } from '../components/dashboard/ExpiryAlertList'
import { FlightExperienceCertificateApprovalPanel } from '../components/dashboard/FlightExperienceCertificateApprovalPanel'
import { InstructorApprovalPanel } from '../components/dashboard/InstructorApprovalPanel'
import { MemberStatusOverview } from '../components/dashboard/MemberStatusOverview'
import { useAuth } from '../contexts/AuthContext'
import { useStatusSharePosts } from '../hooks/baas/useStatusSharePosts'
import { useOrganizationAffiliationOverride } from '../hooks/useOrganizationAffiliationOverride'
import { useDismissedPersonnelPosts } from '../hooks/useDismissedPersonnelPosts'
import { normalizeAffiliation, parseAffiliationFromStatusShareTitle } from '../lib/statusShare'
import { INDIVIDUAL_ROLE_LABEL } from '../lib/baas/types'

const KNOWN_ROLE_LABELS = Object.values(INDIVIDUAL_ROLE_LABEL)

type DashboardTabKey = 'goNoGo' | 'personnel' | 'instructorApproval' | 'certificateApproval'

type DashboardTabDef = {
  key: DashboardTabKey
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

const DASHBOARD_TABS: DashboardTabDef[] = [
  { key: 'goNoGo', label: 'GO/NO-GO 현황', icon: Gauge },
  { key: 'personnel', label: '구성원 현황', icon: Users },
  { key: 'instructorApproval', label: '교관 승인 관리', icon: ShieldCheck },
  { key: 'certificateApproval', label: '비행경력증명서 승인', icon: FileCheck2 },
]

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('goNoGo')
  const [role, setRole] = useState<string>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const { data: statusShareData, isLoading, error, refetch } = useStatusSharePosts({ limit: 100 })
  const [showAllAffiliations, setShowAllAffiliations] = useState(false)
  const [showDismissed, setShowDismissed] = useState(false)
  const { dismissedIds, dismiss, restore } = useDismissedPersonnelPosts(account?.id)

  useEffect(() => {
    if (activeTab === 'personnel') {
      void refetch()
    }
  }, [activeTab, refetch])

  const statusShareItems = statusShareData?.items ?? []
  const isScopedToMyAffiliation = Boolean(myAffiliation) && !showAllAffiliations

  const members = useMemo(() => {
    const normalizedMyAffiliation = normalizeAffiliation(myAffiliation)
    const scoped = isScopedToMyAffiliation
      ? statusShareItems.filter(
          (item) => normalizeAffiliation(parseAffiliationFromStatusShareTitle(item.title)) === normalizedMyAffiliation,
        )
      : statusShareItems
    // 관리자가 "목록에서 제외"한 게시글(예: 탈퇴 회원)은 기본적으로 걸러내고, "숨긴 항목 보기"를
    // 켰을 때만 다시 포함한다. 실제 게시글 삭제가 아니라 이 기관 계정 화면에서만 적용되는 처리다.
    const visible = showDismissed ? scoped : scoped.filter((item) => !dismissedIds.has(item.id))
    return visible.map((item) => ({ ...buildPersonnelRow(item), isDismissed: dismissedIds.has(item.id) }))
  }, [statusShareItems, isScopedToMyAffiliation, myAffiliation, showDismissed, dismissedIds])

  const totalCount = members.length

  const roleOptions = useMemo(() => {
    const extraLabels = Array.from(new Set(members.map((m) => m.roleLabel))).filter(
      (label) => !KNOWN_ROLE_LABELS.includes(label),
    )
    return [...KNOWN_ROLE_LABELS, ...extraLabels.sort()]
  }, [members])

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (role !== 'all' && m.roleLabel !== role) return false
      if (status === 'GO' && m.overallGo !== true) return false
      if (status === 'RISK' && m.overallGo !== false) return false
      return true
    })
  }, [members, role, status])

  return (
    <div data-mbaas-oid="1s3qk1u" className="min-h-screen bg-surface font-body text-ink">
      <header data-mbaas-oid="kh64ok5" className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur">
        <div data-mbaas-oid="800ewhj" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            data-mbaas-oid="yivs8m4" to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p data-mbaas-oid="o9cqsn5" className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span data-mbaas-oid="pp3v6ab" className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <main data-mbaas-oid="um7limy">
        <section data-mbaas-oid="74h26xy" className="relative overflow-hidden bg-navy-dark py-[clamp(24px,3vw,40px)] text-white">
          <div data-mbaas-oid="9diwe1c" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.14),transparent_50%)]" />
          <div data-mbaas-oid="p3vkttb" className="relative mx-auto max-w-7xl px-6">
            <Reveal>
              <span data-mbaas-oid="ny8obyn" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
                <span data-mbaas-oid="r37dgwe" className="pulse-live h-2 w-2 rounded-full bg-go" aria-hidden="true" />
                기관 관제 대시보드
              </span>
            </Reveal>
          </div>
        </section>

        <section data-mbaas-oid="m7owuca" className="sticky top-[121px] z-30 border-b border-white/10 bg-navy/95 backdrop-blur">
          <div data-mbaas-oid="y554ky0" className="mx-auto max-w-7xl px-6">
            <div data-mbaas-oid="pe86nli" role="tablist" aria-label="기관 대시보드 화면 선택" className="flex flex-wrap gap-2 py-4">
              {DASHBOARD_TABS.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key
                return (
                  <button
 data-mbaas-oid="nwhuhzi" key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-state={isActive ? 'active' : 'idle'}
                    onClick={() => setActiveTab(key)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition-colors
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                      ${isActive ? 'border-sky bg-sky/10 text-[#22D3EE]' : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden={true} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {activeTab === 'goNoGo' && (
          <section data-mbaas-oid="msovsec" className="bg-panel py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="msovsc2" className="mx-auto max-w-7xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="msovsc3" className="font-display text-2xl font-extrabold text-ink">
                  소속 회원 GO/NO-GO 현황
                </h2>
                <p data-mbaas-oid="msovsc4" className="mt-2 text-sm text-slate-400">
                  회원이 AWOS에서 직접 공유한 실제 비행 적합성 상태를 소속 기준으로 모아 보여줍니다.
                </p>
              </Reveal>

              <Reveal className="mt-8">
                <MemberStatusOverview />
              </Reveal>
            </div>
          </section>
        )}

        {activeTab === 'personnel' && (
          <>
            {(!myAffiliation || isLoading || error) && (
              <section data-mbaas-oid="hl7g24g" className="bg-panel py-6">
                <div data-mbaas-oid="cdqcsv3" className="mx-auto max-w-7xl px-6">
                  {!myAffiliation && (
                    <div data-mbaas-oid="xv21gyb" className="flex items-start gap-2 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                      <p data-mbaas-oid="1ow1eos" className="text-xs font-medium text-amber-300">
                        계정정보에서 소속 기관을 먼저 설정해주세요. 소속 기관이 없으면 전체 회원 상태가 표시됩니다.{' '}
                        <Link
                          data-mbaas-oid="1f4ha41" to="/account"
                          className="font-semibold underline underline-offset-2 hover:text-amber-300
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
                        >
                          계정정보로 이동
                        </Link>
                      </p>
                    </div>
                  )}

                  {isLoading ? (
                    <p data-mbaas-oid="4yl3mx5" className="mt-4 text-sm text-slate-400">구성원 현황을 불러오는 중입니다...</p>
                  ) : error ? (
                    <div data-mbaas-oid="fjtp1c8" role="alert" className="mt-4 rounded-control border border-rose-400/40 bg-rose-500/10 px-4 py-3">
                      <p data-mbaas-oid="vqtk9ma" className="text-xs font-medium text-rose-300">{error}</p>
                      <Button
                        data-mbaas-oid="r1o1v6l" type="button" variant="outline" tone="neutral" size="sm"
                        className="mt-3 border-white/15 text-slate-200 hover:bg-white/[0.06]"
                        onClick={() => void refetch()}
                      >
                        다시 시도
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
            )}

            {!isLoading && !error && (
              <>
                <section data-mbaas-oid="6knzpxv" className="bg-panel py-[clamp(64px,8vw,120px)]">
                  <div data-mbaas-oid="32nk874" className="mx-auto max-w-7xl px-6">
                    <Reveal>
                      <h2 data-mbaas-oid="c6t9grv" className="font-display text-2xl font-extrabold text-ink">
                        인력별 비행시간 · 자격 현황
                      </h2>
                      <p data-mbaas-oid="98igx32" className="mt-2 text-sm text-slate-400">
                        역할, 상태별로 필터링해 소속 인력의 자격 현황을 확인할 수 있습니다.
                      </p>
                    </Reveal>

                    <div data-mbaas-oid="09w4thj" className="mt-8 rounded-card border border-white/10 bg-navy p-6">
                      <Reveal>
                        <PersonnelFilterBar
                          role={role}
                          status={status}
                          roleOptions={roleOptions}
                          onRoleChange={setRole}
                          onStatusChange={setStatus}
                          myAffiliation={myAffiliation}
                          showAllAffiliations={showAllAffiliations}
                          onShowAllAffiliationsChange={setShowAllAffiliations}
                          showDismissed={showDismissed}
                          onShowDismissedChange={setShowDismissed}
                        />
                      </Reveal>
                      <Reveal className="mt-6">
                        <PersonnelTable
                          personnel={filtered}
                          totalCount={totalCount}
                          onDismiss={dismiss}
                          onRestore={restore}
                        />
                      </Reveal>
                    </div>
                  </div>
                </section>

                <section data-mbaas-oid="ilby7tr" className="relative overflow-hidden bg-navy-dark py-[clamp(64px,8vw,120px)] text-white">
                  <div data-mbaas-oid="bpd9ye4" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(244,63,94,0.10),transparent_50%)]" />
                  <div data-mbaas-oid="ka12zo3" className="relative mx-auto max-w-4xl px-6">
                    <Reveal>
                      <h2
                        data-mbaas-oid="hmhkhzv" className="max-w-2xl font-display font-extrabold"
                        style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
                      >
                        자격/면장 만료 임박 경고
                      </h2>
                      <p data-mbaas-oid="wvvd922" className="mt-3 max-w-xl text-slate-300">
                        아래 인력은 자격 재검증 또는 갱신이 필요합니다. 배정 전 반드시 확인하세요.
                      </p>
                    </Reveal>

                    <Reveal className="mt-8">
                      <ExpiryAlertList personnel={members} />
                    </Reveal>

                    <Reveal className="mt-8">
                      <Button data-mbaas-oid="1wezicg" variant="outline" tone="neutral" size="sm" className="border-white/25 text-white hover:bg-white/10">
                        <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                        감사 리포트 자동 생성
                      </Button>
                    </Reveal>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'instructorApproval' && (
          <section data-mbaas-oid="ee1cmtd" className="bg-panel py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="5lfshoa" className="mx-auto max-w-7xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="wo222xw" className="font-display text-2xl font-extrabold text-ink">
                  교관 승인 관리
                </h2>
                <p data-mbaas-oid="jc49iat" className="mt-2 text-sm text-slate-400">
                  비행 기록에 교관 전자서명을 하려는 신청자를 검토하고 승인/대기 상태를 관리합니다.
                </p>
              </Reveal>

              <Reveal className="mt-8">
                <InstructorApprovalPanel />
              </Reveal>
            </div>
          </section>
        )}

        {activeTab === 'certificateApproval' && (
          <section data-mbaas-oid="fvq8yj5" className="bg-panel py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="5iqjyz8" className="mx-auto max-w-7xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="5ckg1cn" className="font-display text-2xl font-extrabold text-ink">
                  비행경력증명서 승인
                </h2>
                <p data-mbaas-oid="td0dyp4" className="mt-2 text-sm text-slate-400">
                  엑셀 파일이 없는 회원이 제출한 비행경력증명서 인증 요청(첨부 사진 포함)을 검토하고 승인/반려합니다.
                </p>
              </Reveal>

              <Reveal className="mt-8">
                <FlightExperienceCertificateApprovalPanel />
              </Reveal>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
