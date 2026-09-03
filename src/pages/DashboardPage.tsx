import React, { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileCheck2, Inbox, ShieldCheck, Users } from 'lucide-react'

import { Footer } from '../components/Footer'
import { Reveal } from '../components/Reveal'
import { CertificateApprovalRequestsPanel } from '../components/dashboard/CertificateApprovalRequestsPanel'
import { FlightExperienceCertificateApprovalPanel } from '../components/dashboard/FlightExperienceCertificateApprovalPanel'
import { InquiryAdminPanel } from '../components/dashboard/InquiryAdminPanel'
import { InstructorApprovalPanel } from '../components/dashboard/InstructorApprovalPanel'
import { MemberDirectoryPanel } from '../components/dashboard/MemberDirectoryPanel'

type DashboardTabKey = 'goNoGo' | 'personnel' | 'instructorApproval' | 'certificateApproval' | 'certApprovals' | 'inquiries'

type DashboardTabDef = {
  key: DashboardTabKey
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

const DASHBOARD_TABS: DashboardTabDef[] = [
  { key: 'personnel', label: '구성원 현황', icon: Users },
  { key: 'instructorApproval', label: '교관 승인 관리', icon: ShieldCheck },
  { key: 'certificateApproval', label: '비행경력증명서 승인', icon: FileCheck2 },  { key: 'certApprovals', label: '자격증·신체검사 요청함', icon: ShieldCheck },
  { key: 'inquiries', label: '문의함', icon: Inbox },
]

export function DashboardPage() {
  // 탭바를 헤더 바로 아래에 고정(LogbookPage와 동일한 실측 방식)
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(57)
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('personnel')
  const [certApprovalCategory, setCertApprovalCategory] = useState<'all' | 'license' | 'medical'>('all')


  return (
    <div data-mbaas-oid="1s3qk1u" className="min-h-screen bg-surface font-body text-ink">
      <header ref={headerRef} data-mbaas-oid="kh64ok5" className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur">
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
          <div data-mbaas-oid="9diwe1c" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(0,212,255,0.14),transparent_50%)]" />
          <div data-mbaas-oid="p3vkttb" className="relative mx-auto max-w-7xl px-6">
            <Reveal>
              <span data-mbaas-oid="ny8obyn" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
                <span data-mbaas-oid="r37dgwe" className="pulse-live h-2 w-2 rounded-full bg-go" aria-hidden="true" />
                관리자 페이지
              </span>
            </Reveal>
          </div>
        </section>

        <section data-mbaas-oid="m7owuca" style={{ top: headerHeight }} className="sticky z-30 border-b border-white/10 bg-navy/95 backdrop-blur">
          <div data-mbaas-oid="y554ky0" className="mx-auto max-w-7xl px-6">
            <div data-mbaas-oid="pe86nli" role="tablist" aria-label="기관 대시보드 화면 선택" className="-mx-6 flex gap-2 overflow-x-auto px-6 py-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
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
                      ${isActive ? 'border-sky bg-sky/10 text-[#00D4FF]' : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden={true} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {activeTab === 'personnel' && (
          <section data-mbaas-oid="msovsec" className="bg-panel py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="msovwrp" className="mx-auto max-w-7xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="msovsc3" className="font-display text-2xl font-extrabold text-ink">구성원 현황</h2>
                <p data-mbaas-oid="msovsc4" className="mt-2 text-sm text-slate-400">
                  가입한 전체 회원이 상태 공유 절차 없이 바로 표시됩니다.
                </p>
              </Reveal>
              <div data-mbaas-oid="msovsc5" className="mt-8 rounded-card border border-white/10 bg-navy p-6">
                <MemberDirectoryPanel />
              </div>
            </div>
          </section>
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

        {activeTab === 'certApprovals' && (
          <section data-mbaas-oid="crtapsec" className="bg-panel py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="crtapwrp" className="mx-auto max-w-7xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="crtaph2" className="font-display text-2xl font-extrabold text-ink">자격증 · 항공신체검사 요청함</h2>
                <p data-mbaas-oid="crtappd" className="mt-2 text-sm text-slate-400">
                  회원이 사진과 함께 보낸 자격증·항공신체검사 인증 요청을 확인하고 승인/반려합니다.
                </p>
                <div data-mbaas-oid="crtapchp" className="mt-4 flex flex-wrap gap-2">
                  {([['all', '전체'], ['license', '자격증'], ['medical', '항공신체검사']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCertApprovalCategory(value)}
                      className={`rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        certApprovalCategory === value ? 'border-sky bg-sky/10 text-sky' : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Reveal>
              <div data-mbaas-oid="crtappnl" className="mt-8">
                <CertificateApprovalRequestsPanel categoryFilter={certApprovalCategory} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'inquiries' && (
          <section data-mbaas-oid="inqsec0" className="bg-panel py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="inqsec1" className="mx-auto max-w-4xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="inqsec2" className="font-display text-2xl font-extrabold text-ink">문의함</h2>
                <p data-mbaas-oid="inqsec3" className="mt-2 text-sm text-slate-400">
                  회원이 남긴 문의를 확인하고 답변을 등록하세요. 답변은 해당 회원의 문의하기 페이지에 표시됩니다.
                </p>
              </Reveal>
              <div data-mbaas-oid="inqsec4" className="mt-8">
                <InquiryAdminPanel />
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
