import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, Info, LayoutGrid, PlaneTakeoff, Radar as RadarIcon, Wrench } from 'lucide-react'

import { Footer } from '../components/Footer'
import { AwosSectionTabs } from '../components/AwosSectionTabs'
import { Reveal } from '../components/Reveal'
import { KpiCard } from '../components/dashboard/KpiCard'
import { FleetGrid, RadarView } from '../components/fleet/RadarView'
import { MaintenanceLog } from '../components/fleet/MaintenanceLog'
import { ScheduleTimeline } from '../components/fleet/ScheduleTimeline'
import { AircraftDetailPanel } from '../components/fleet/AircraftDetailPanel'
import { AIRCRAFT } from '../data/fleet'

type ViewMode = 'radar' | 'grid'
type SectionTab = 'maintenance' | 'schedule'

export function FleetPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('radar')
  const [sectionTab, setSectionTab] = useState<SectionTab>('maintenance')
  const [selectedTail, setSelectedTail] = useState<string | null>(null)

  const total = AIRCRAFT.length
  const flyingCount = useMemo(() => AIRCRAFT.filter((a) => a.status === '운항중').length, [])
  const maintenanceCount = useMemo(() => AIRCRAFT.filter((a) => a.status === '정비중').length, [])
  const standbyCount = total - flyingCount - maintenanceCount

  const selectedAircraft = selectedTail ? AIRCRAFT.find((a) => a.tailNumber === selectedTail) ?? null : null

  return (
    <div data-mbaas-oid="9oy3mf3" className="min-h-screen bg-surface font-body text-ink">
      <header data-mbaas-oid="ajujrpf" className="sticky top-0 z-40 border-b border-white/10 bg-navy/90 backdrop-blur">
        <div data-mbaas-oid="dmlsk2d" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            data-mbaas-oid="8jgv90t" to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p data-mbaas-oid="i83hiqm" className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span data-mbaas-oid="kq16rvp" className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <AwosSectionTabs />

      <main data-mbaas-oid="jqvshbn">
        <section data-mbaas-oid="p3vty3r" className="relative overflow-hidden bg-navy-dark py-[clamp(64px,8vw,120px)] text-white">
          <div data-mbaas-oid="t15f2hr" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.14),transparent_50%)]" />
          <div data-mbaas-oid="kl2pa5k" className="relative mx-auto max-w-7xl px-6">
            <Reveal>
              <span data-mbaas-oid="cwul10b" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
                <RadarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Flight Radar
              </span>
              <h1
                data-mbaas-oid="84vu3zm" className="mt-6 max-w-3xl font-display font-extrabold"
                style={{ fontSize: 'clamp(2.5rem, 1.8rem + 3.5vw, 4rem)', letterSpacing: '-0.03em', lineHeight: 0.98 }}
              >
                보유 항공기 현황,
                <br data-mbaas-oid="k9s5iqq" />
                한 화면에서 실시간처럼
              </h1>
              <p
                data-mbaas-oid="17dg9dm" className="mt-6 max-w-xl text-slate-300"
                style={{ fontSize: 'clamp(1rem, 0.94rem + 0.3vw, 1.125rem)', lineHeight: 1.6 }}
              >
                보유 항공기 {total}대의 상태, 정비 이력, 운항/정비 스케줄을 한 화면에서 확인합니다.
                아래 데이터는 예시(목업)이며, 실제 연동 전까지 구성 화면을 미리 확인하는 용도입니다.
              </p>
              <p data-mbaas-oid="ukgt239" className="mt-4 inline-flex max-w-xl items-start gap-2 rounded-control border border-white/15 bg-white/[0.05] p-3 text-xs text-slate-400">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky" aria-hidden="true" />
                실제 실시간 항공기 위치를 제공하는 외부 서비스(FlightRadar24 등) 연동은 이번 범위에 포함되지 않으며, 이후 별도 요청 시 진행될 예정입니다.
              </p>
            </Reveal>

            <Reveal className="mt-12">
              <div data-mbaas-oid="1mmbrwb" className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <KpiCard label="운항중" value={`${flyingCount}대`} hint="현재 비행 중인 항공기" tone="go" icon={PlaneTakeoff} />
                <KpiCard label="정비중" value={`${maintenanceCount}대`} hint="정비 작업이 진행 중인 항공기" icon={Wrench} />
                <KpiCard label="대기" value={`${standbyCount}대`} hint="계류장에서 대기 중인 항공기" icon={Clock3} />
              </div>
            </Reveal>
          </div>
        </section>

        <section data-mbaas-oid="ae0jrol" className="bg-navy py-[clamp(64px,8vw,120px)] text-white">
          <div data-mbaas-oid="0fkvuaf" className="mx-auto max-w-7xl px-6">
            <Reveal>
              <div data-mbaas-oid="4dytc3i" className="flex flex-wrap items-center justify-between gap-4">
                <div data-mbaas-oid="iwkfkt4">
                  <h2 data-mbaas-oid="lfnvoiy" className="font-display text-2xl font-extrabold text-white">항공기 위치 레이더</h2>
                  <p data-mbaas-oid="t7xqj5s" className="mt-2 text-sm text-slate-400">테일넘버를 클릭하면 정비 이력과 스케줄을 함께 확인할 수 있습니다.</p>
                </div>
                <div
                  data-mbaas-oid="j78mfot" role="group"
                  aria-label="레이더 보기 방식 선택"
                  className="flex items-center gap-1 rounded-control border border-white/15 bg-white/5 p-1"
                >
                  <button
                    data-mbaas-oid="fcmt6vd"
                    type="button"
                    data-state={viewMode === 'radar' ? 'active' : 'idle'}
                    onClick={() => setViewMode('radar')}
                    className={`inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-colors
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                      ${viewMode === 'radar' ? 'bg-sky text-navy' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  >
                    <RadarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    레이더
                  </button>
                  <button
                    data-mbaas-oid="gtx998v"
                    type="button"
                    data-state={viewMode === 'grid' ? 'active' : 'idle'}
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-colors
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                      ${viewMode === 'grid' ? 'bg-sky text-navy' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                    목록
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal className="mt-8">
              {viewMode === 'radar' ? (
                <div data-mbaas-oid="vyel880" className="mx-auto max-w-xl">
                  <RadarView aircraft={AIRCRAFT} selectedTail={selectedTail} onSelect={setSelectedTail} />
                </div>
              ) : (
                <FleetGrid aircraft={AIRCRAFT} selectedTail={selectedTail} onSelect={setSelectedTail} />
              )}
            </Reveal>
          </div>
        </section>

        <section data-mbaas-oid="z9glvmt" className="bg-panel py-[clamp(64px,8vw,120px)]">
          <div data-mbaas-oid="tyshlgv" className="mx-auto max-w-7xl px-6">
            <Reveal>
              <h2 data-mbaas-oid="pw1c118" className="font-display text-2xl font-extrabold text-ink">정비기록 · 스케줄링</h2>
              <p data-mbaas-oid="7vsau90" className="mt-2 text-sm text-slate-400">기종/상태별 정비 이력을 조회하거나, 전체 항공기의 운항·정비 스케줄을 확인하세요.</p>
            </Reveal>

            <Reveal className="mt-8">
              <div data-mbaas-oid="hlfii9l" role="tablist" aria-label="정비기록/스케줄링 탭" className="flex gap-2 border-b border-white/10">
                <button
                  data-mbaas-oid="j1ms31m"
                  type="button"
                  role="tab"
                  aria-selected={sectionTab === 'maintenance'}
                  data-state={sectionTab === 'maintenance' ? 'active' : 'idle'}
                  onClick={() => setSectionTab('maintenance')}
                  className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                    ${sectionTab === 'maintenance' ? 'border-sky text-ink' : 'border-transparent text-slate-400 hover:text-ink'}`}
                >
                  정비기록
                </button>
                <button
                  data-mbaas-oid="pmpgh0i"
                  type="button"
                  role="tab"
                  aria-selected={sectionTab === 'schedule'}
                  data-state={sectionTab === 'schedule' ? 'active' : 'idle'}
                  onClick={() => setSectionTab('schedule')}
                  className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                    ${sectionTab === 'schedule' ? 'border-sky text-ink' : 'border-transparent text-slate-400 hover:text-ink'}`}
                >
                  스케줄링
                </button>
              </div>
            </Reveal>

            <Reveal className="mt-8">
              <div data-mbaas-oid="uimo94y" className="rounded-card border border-white/10 bg-navy p-6">
                {sectionTab === 'maintenance' ? <MaintenanceLog /> : <ScheduleTimeline />}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />

      {selectedAircraft && <AircraftDetailPanel aircraft={selectedAircraft} onClose={() => setSelectedTail(null)} />}
    </div>
  )
}
