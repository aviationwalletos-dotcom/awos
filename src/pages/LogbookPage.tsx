import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardList,
  Gauge,
  Inbox,
  ListChecks,
  NotebookPen,
  PlaneTakeoff,
  Radar,
  Radio,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import { Footer } from '../components/Footer'
import { Button } from '../components/Button'
import { AwosSectionTabs } from '../components/AwosSectionTabs'
import { Reveal } from '../components/Reveal'
import { EntryForm } from '../components/logbook/EntryForm'
import { QuickEntryForm } from '../components/logbook/QuickEntryForm'
import { EntryFilterBar, matchesFilter } from '../components/logbook/EntryFilterBar'
import { EntryList } from '../components/logbook/EntryList'
import { EntryDetailDialog } from '../components/logbook/EntryDetailDialog'
import { AutoSyncEntryDecisions } from '../components/logbook/AutoSyncEntryDecisions'
import { LogbookTotalsSummary } from '../components/logbook/LogbookTotalsSummary'
import { LegacyImportSection } from '../components/logbook/LegacyImportSection'
import { CertificateForm } from '../components/certificates/CertificateForm'
import { TsIntegrationCard } from '../components/certificates/TsIntegrationCard'
import { CertificateList } from '../components/certificates/CertificateList'
import { CertificateDetailDialog } from '../components/certificates/CertificateDetailDialog'
import { CurrencyDashboard } from '../components/currency/CurrencyDashboard'
import { FlightReadinessPanel } from '../components/logbook/FlightReadinessPanel'
import { MyCertificateStatusCard } from '../components/logbook/MyCertificateStatusCard'
import { DutyTimeLimitCard } from '../components/logbook/DutyTimeLimitCard'
import { InstructorSignatureInboxSection } from '../components/account/InstructorSignatureInboxSection'
import { WorkLogForm } from '../components/worklog/WorkLogForm'
import { WorkLogList } from '../components/worklog/WorkLogList'
import { WorkLogDetailDialog } from '../components/worklog/WorkLogDetailDialog'
import { ComplianceSection } from '../components/compliance/ComplianceSection'
import {
  computeAtcCompliance,
  computeDispatcherCompliance,
  computeDroneCompliance,
  computeMechanicCompliance,
} from '../lib/roleCompliance'
import { downloadLogbookCsv } from '../lib/logbookCsv'
import { printLogbook } from '../lib/logbookPrint'
import { useLogbookEntries } from '../hooks/useLogbookEntries'
import { useCertificates } from '../hooks/useCertificates'
import { useWorkLogEntries } from '../hooks/useWorkLogEntries'
import { useIndividualRoleOverride } from '../hooks/useIndividualRoleOverride'
import { useInstructorApprovalStatus } from '../hooks/baas/useInstructorApprovalStatus'
import { useDeleteBoardPost } from '../hooks/baas/useDeleteBoardPost'
import { useAuth } from '../contexts/AuthContext'
import { INDIVIDUAL_ROLE_LABEL } from '../lib/baas/types'
import type { IndividualRole } from '../lib/baas/types'
import { getRoleContentByIndividualRole } from '../data/content'
import { WORK_LOG_ROLE_COPY } from '../types/workLog'
import type { WorkLogEntry, WorkLogRole } from '../types/workLog'
import type { LogbookEntry, LogbookEntryInput, LogbookFilterKind } from '../types/logbook'
import type { Certificate } from '../types/certificate'

type TabKey = 'myRecords' | 'certificates' | 'currency' | 'logbook' | 'signatureInbox' | 'workLog'

type TabDef = { key: TabKey; label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }

// 조종사(및 역할 미설정 계정 폴백)용 기본 탭 구성. 절대 변경하지 않습니다.
const PILOT_TABS: TabDef[] = [
  { key: 'myRecords', label: '내 비행기록', icon: ListChecks },
  { key: 'logbook', label: '비행기록 관리', icon: PlaneTakeoff },
  { key: 'certificates', label: '자격증 관리', icon: ShieldCheck },
  { key: 'currency', label: '커런시 관리', icon: Gauge },
]

const SIGNATURE_INBOX_TAB: TabDef = { key: 'signatureInbox', label: '서명 요청함', icon: Inbox }

// 드론 조종자용 탭 구성: 비행기록 구조는 재사용하되 커런시/실시간 적합성 등 조종사 전용 개념은 제외합니다.
const DRONE_TABS: TabDef[] = [
  { key: 'myRecords', label: '내 비행기록', icon: ListChecks },
  { key: 'logbook', label: '비행기록 관리', icon: PlaneTakeoff },
  { key: 'certificates', label: '자격증 관리', icon: ShieldCheck },
]

const WORK_LOG_TAB_ICON: Record<WorkLogRole, TabDef['icon']> = {
  mechanic: ClipboardList,
  atc: Radar,
  dispatcher: Radio,
}

const WORK_LOG_ROLES: WorkLogRole[] = ['mechanic', 'atc', 'dispatcher']

// 엑셀 대량 가져오기 시 한 번에 처리할 배치 크기(BUG-020). 너무 크면 여전히 요청이 몰리고,
// 너무 작으면 배치 수가 늘어나 전체 완료까지 시간이 길어지므로 적당한 값으로 고정한다.
const LEGACY_IMPORT_BATCH_SIZE = 8

// "서버와 다시 동기화" 버튼 연속 클릭 방지용 쿨다운(짧은 시간에 여러 번 눌러 로그북/자격증/업무기록
// resyncFromServer + retryPendingSync 배치 요청이 한꺼번에 몰리는 것을 막기 위한 최소한의 프론트엔드 방어).
const RESYNC_COOLDOWN_MS = 10000

const WORK_LOG_COMPLIANCE_TITLE: Record<WorkLogRole, string> = {
  mechanic: '정비사 법정 요건 안내/현황',
  atc: '관제사 법정 요건 안내/현황',
  dispatcher: '운항관리사 법정 요건 안내/현황',
}

function isWorkLogRole(role: IndividualRole | undefined): role is WorkLogRole {
  return Boolean(role) && (WORK_LOG_ROLES as string[]).includes(role as string)
}

export function LogbookPage() {
  const { account, userType } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('myRecords')

  const { override: roleOverride } = useIndividualRoleOverride(account)
  const accountIndividualRole = account?.data?.individual_role as IndividualRole | undefined
  const individualRole = roleOverride ?? accountIndividualRole
  const individualRoleLabel = individualRole ? INDIVIDUAL_ROLE_LABEL[individualRole] : null
  const roleContent = useMemo(() => getRoleContentByIndividualRole(individualRole), [individualRole])

  // 조종사 전용 개념(항공신체검사/커런시/실시간 비행 적합성/승무시간 한도/교관 서명 요청함)은
  // 조종사이거나 역할이 아직 설정되지 않은 계정(기존 관례상 조종사와 유사한 기본 화면으로 폴백)에게만 노출합니다.
  const isPilotLike = !individualRole || individualRole === 'pilot'
  const isDrone = individualRole === 'drone_pilot'
  const workLogRole = isWorkLogRole(individualRole) ? individualRole : undefined
  const workLogCopy = workLogRole ? WORK_LOG_ROLE_COPY[workLogRole] : undefined

  const { isApproved: isApprovedInstructor } = useInstructorApprovalStatus(
    userType === 'individual' ? account ?? null : null,
  )

  const TABS: TabDef[] = useMemo(() => {
    if (workLogRole && workLogCopy) {
      return [
        { key: 'workLog', label: workLogCopy.tabLabel, icon: WORK_LOG_TAB_ICON[workLogRole] },
        { key: 'certificates', label: '자격증 관리', icon: ShieldCheck },
      ]
    }
    if (isDrone) {
      return DRONE_TABS
    }
    return isApprovedInstructor ? [...PILOT_TABS, SIGNATURE_INBOX_TAB] : PILOT_TABS
  }, [workLogRole, workLogCopy, isDrone, isApprovedInstructor])

  // 역할/승인 상태가 바뀌어 현재 선택된 탭이 더 이상 목록에 없으면, 목록의 첫 번째 탭으로 되돌린다.
  useEffect(() => {
    if (!TABS.some((t) => t.key === activeTab)) {
      setActiveTab(TABS[0]?.key ?? 'myRecords')
    }
  }, [activeTab, TABS])

  const {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntries,
    clearAll,
    resyncFromServer: resyncLogbookEntries,
    retryPendingSync: retryLogbookPendingSync,
  } = useLogbookEntries(account)
  const [filterKind, setFilterKind] = useState<LogbookFilterKind>('all')
  const [filterValue, setFilterValue] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null)

  // EntryDetailDialog와 AutoSyncEntryDecisions(다이얼로그 밖 백그라운드 watcher, BUG-015)가
  // 공유하는 갱신 핸들러. 현재 열려있는 상세 다이얼로그가 갱신된 기록과 같으면 그 화면도 함께 갱신한다.
  const handleUpdateEntry = useCallback(
    (id: string, input: LogbookEntryInput) => {
      updateEntry(id, input)
      setSelectedEntry((prev) => (prev && prev.id === id ? { ...prev, ...input, updatedAt: Date.now() } : prev))
    },
    [updateEntry],
  )

  // 엑셀 대량 가져오기 시 동시 요청 폭주 완화(BUG-020, BUG-014/BUG-019 후속): 수십~수백 건을 한꺼번에
  // addEntry로 넘기면 그만큼의 서버 게시글 생성 요청이 거의 동시에 나가, 일부가 네트워크 과부하/일시적
  // 오류로 실패하면 그 기록들은 로컬에만 남고 서버에는 존재하지 않게 되어 다른 기기에서 받아올 수 없다.
  // addEntry 자체는 그대로 두고(로컬 즉시 반영 + 내부 best-effort 서버 생성), 호출하는 쪽만 작은
  // 배치 단위로 나눠 순차 처리하도록 개선한다.
  const handleImportLegacyEntries = useCallback(
    (inputs: LogbookEntryInput[]) => {
      void (async () => {
        for (let i = 0; i < inputs.length; i += LEGACY_IMPORT_BATCH_SIZE) {
          const batch = inputs.slice(i, i + LEGACY_IMPORT_BATCH_SIZE)
          // 배치 단위로 addEntry 호출이 모두 처리된 뒤에만 다음 배치로 넘어가, 동시에 나가는
          // 서버 생성 요청 수를 배치 크기로 제한한다.
          await Promise.allSettled(batch.map((input) => Promise.resolve().then(() => addEntry(input))))
        }
      })()
    },
    [addEntry],
  )

  // 비행기록이 삭제되면, 그 기록에 연결된 "서명 요청" 게시판 게시글도 함께 정리한다(교관 서명
  // 완료 여부와 무관 — signatureRequestPostId가 남아있으면 정리 대상). 로컬 기록 삭제는 게시글
  // 삭제 성공 여부와 무관하게 항상 진행되어야 하므로, best-effort로 병렬 삭제만 시도하고 실패는
  // 조용히 콘솔 경고로만 남긴다(이미 삭제됨/네트워크 오류 등으로 실패해도 사용자 삭제 흐름을 막지 않음).
  const { deletePost } = useDeleteBoardPost()
  function cleanupSignatureRequestPosts(entryIds: string[]) {
    const postIds = entries
      .filter((e) => entryIds.includes(e.id) && e.signatureRequestPostId)
      .map((e) => e.signatureRequestPostId as string)
    if (postIds.length === 0) return

    void Promise.allSettled(postIds.map((postId) => deletePost(postId))).then((results) => {
      const failedCount = results.filter((result) => result.status === 'rejected').length
      if (failedCount > 0) {
        console.warn(
          `[LogbookPage] 서명 요청 게시글 ${failedCount}건 삭제에 실패했습니다(이미 삭제되었거나 네트워크 오류일 수 있음). 로컬 비행 기록 삭제는 정상 진행되었습니다.`,
        )
      }
    })
  }

  const {
    certificates,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    resyncFromServer: resyncCertificates,
    retryPendingSync: retryCertificatesPendingSync,
  } = useCertificates(account)
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)

  const {
    entries: workLogEntries,
    addEntry: addWorkLogEntry,
    updateEntry: updateWorkLogEntry,
    deleteEntry: deleteWorkLogEntry,
    resyncFromServer: resyncWorkLogEntries,
    retryPendingSync: retryWorkLogPendingSync,
  } = useWorkLogEntries(account, workLogRole)

  // 사용자가 직접 세 종류(비행기록/자격증/업무기록)의 서버 초기 동기화를 즉시 다시 시도할 수 있게 하는
  // 수동 재시도 버튼 상태(FEAT-041). 최초 시도에서 일부 배치가 실패해도 새로고침 없이 재시도할 수 있다.
  // BUG-020 후속: 서버 → 로컬 방향의 초기 동기화(resyncFromServer)뿐 아니라, 로컬에만 남아 서버에
  // 한 번도 저장되지 못한 미동기화 기록을 다시 올리는 로컬 → 서버 방향 재시도(retryPendingSync)도
  // 이 버튼 한 번으로 함께 시도한다.
  const [isResyncing, setIsResyncing] = useState(false)
  const [resyncMessage, setResyncMessage] = useState<string | null>(null)

  // 연속 클릭 방지 쿨다운(짧은 시간 내 여러 번 눌러 배치 요청이 몰리는 것을 막는다). 마지막 시도 시각은
  // 렌더링과 무관하게 즉시 최신값을 참조해야 하므로 ref로 보관하고, 남은 초 표시는 1초 간격으로만
  // 갱신되는 별도 state(resyncCooldownSecondsLeft)로 관리한다.
  const lastResyncAtRef = useRef(0)
  const [resyncCooldownSecondsLeft, setResyncCooldownSecondsLeft] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const remainingMs = RESYNC_COOLDOWN_MS - (Date.now() - lastResyncAtRef.current)
      setResyncCooldownSecondsLeft(remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const handleResyncFromServer = useCallback(() => {
    const elapsedSinceLastAttempt = Date.now() - lastResyncAtRef.current
    if (isResyncing || elapsedSinceLastAttempt < RESYNC_COOLDOWN_MS) {
      return
    }
    lastResyncAtRef.current = Date.now()
    setResyncCooldownSecondsLeft(Math.ceil(RESYNC_COOLDOWN_MS / 1000))
    setIsResyncing(true)
    setResyncMessage(null)
    void Promise.allSettled([
      resyncLogbookEntries(),
      resyncCertificates(),
      resyncWorkLogEntries(),
      retryLogbookPendingSync(),
      retryCertificatesPendingSync(),
      retryWorkLogPendingSync(),
    ]).then((results) => {
      // 미동기화 기록 재시도 3건(뒤 3개 결과)의 attempted/succeeded 건수를 합산해 사용자에게 간단히 안내한다.
      const retryResults = results.slice(3)
      let attempted = 0
      let succeeded = 0
      for (const result of retryResults) {
        if (result.status === 'fulfilled' && result.value) {
          attempted += result.value.attempted
          succeeded += result.value.succeeded
        }
      }
      setIsResyncing(false)
      setResyncMessage(
        attempted > 0
          ? `서버와 다시 동기화를 시도했습니다. (미동기화 기록 ${attempted}건 중 ${succeeded}건 재전송 성공)`
          : '서버와 다시 동기화를 시도했습니다.',
      )
      window.setTimeout(() => setResyncMessage(null), 4000)
    })
  }, [
    isResyncing,
    resyncLogbookEntries,
    resyncCertificates,
    resyncWorkLogEntries,
    retryLogbookPendingSync,
    retryCertificatesPendingSync,
    retryWorkLogPendingSync,
  ])

  const [selectedWorkLogEntry, setSelectedWorkLogEntry] = useState<WorkLogEntry | null>(null)

  // 정비사/관제사/운항관리사 법정 요건 안내/현황(실제 법령 근거 기반, 참고용 자동 계산).
  const workLogComplianceItems = useMemo(() => {
    if (workLogRole === 'mechanic') return computeMechanicCompliance(certificates, workLogEntries)
    if (workLogRole === 'atc') return computeAtcCompliance(certificates, workLogEntries)
    if (workLogRole === 'dispatcher') return computeDispatcherCompliance(certificates, workLogEntries)
    return []
  }, [workLogRole, certificates, workLogEntries])
  const workLogComplianceTitle = workLogRole ? WORK_LOG_COMPLIANCE_TITLE[workLogRole] : ''

  // 드론/UAM 조종자 법정 요건 안내/현황(비행기록의 누적 비행시간 기반).
  const droneComplianceItems = useMemo(() => (isDrone ? computeDroneCompliance(entries) : []), [isDrone, entries])

  const filteredEntries = useMemo(
    () => entries.filter((e) => matchesFilter(e, filterKind, filterValue)),
    [entries, filterKind, filterValue],
  )

  // 서버에 아직 저장되지 않은(미동기화) 기록 수. syncPostId가 없으면 서버 게시글 생성이
  // 실패했거나 아직 시도 전이라는 뜻이다 — 로컬에는 안전하게 있으므로 경고 배지로만 알린다.
  const pendingSyncCount = useMemo(() => entries.filter((e) => !e.syncPostId).length, [entries])

  // 새 비행 기록 입력 모드: 비행 직후 최소 입력(quick)이 기본, 공식 양식 전체는 detail.
  const [entryFormMode, setEntryFormMode] = useState<'quick' | 'detail'>('quick')

  // 드론 조종자는 "항공기" 대신 "기체" 개념을 사용하므로 입력 폼/상세 라벨만 자연스럽게 조정합니다.
  const aircraftLabelProps = isDrone
    ? {
        aircraftTypeLabel: '기체 모델',
        aircraftTypePlaceholder: '예: DJI Matrice 300, EVO II Pro',
        aircraftIdLabel: '기체 신고번호 (선택)',
        aircraftIdPlaceholder: '예: LM12-034567',
      }
    : {}

  return (
    <div data-mbaas-oid="7kkgjdu" className="min-h-screen bg-surface font-body text-ink">
      <header data-mbaas-oid="7fiidhl" className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur">
        <div data-mbaas-oid="7j766ty" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            data-mbaas-oid="qu45ix4" to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p data-mbaas-oid="8jtqrum" className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span data-mbaas-oid="i4za7x9" className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <AwosSectionTabs />

      <main data-mbaas-oid="bh5vvhf">
        <section data-mbaas-oid="zm0n7fe" className="relative overflow-hidden bg-navy-dark py-[clamp(24px,3vw,40px)] text-white">
          <div data-mbaas-oid="flk85t0" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.14),transparent_55%)]" />
          <div data-mbaas-dynamic="true" data-mbaas-oid="lgbpg10" className="relative mx-auto max-w-4xl px-6">
            <span data-mbaas-oid="lgbpg11" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
              <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
              AWOS 디지털 자격 월렛
            </span>
            {account && (
              <p data-mbaas-dynamic="true" data-mbaas-oid="lgbpg25" className="mt-3 text-sm font-semibold text-sky">
                {individualRoleLabel ?? '역할 미설정'} ·{' '}
                <span data-mbaas-oid="bvzpidt" data-mbaas-dynamic="true">{account.name}</span>님
              </p>
            )}

            {isPilotLike ? (
              <div data-mbaas-oid="rdnscmp" className="mt-4 flex flex-col gap-4">
                <FlightReadinessPanel entries={entries} certificates={certificates} account={account} compact />
                <div data-mbaas-oid="6w3w4t6" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MyCertificateStatusCard certificates={certificates} roleContent={roleContent} compact />
                  <DutyTimeLimitCard entries={entries} compact />
                </div>
              </div>
            ) : (
              <div data-mbaas-oid="rdnscmp" className="mt-4">
                <MyCertificateStatusCard certificates={certificates} roleContent={roleContent} compact />
              </div>
            )}

            <p data-mbaas-oid="lgbpg15" className="mt-4 text-xs text-slate-400">
              현재는 이 브라우저에만 저장되며, 실제 서버 저장은 별도 백엔드 기능 활성화가 필요합니다.
            </p>
          </div>
        </section>

        <section data-mbaas-oid="tabnav1" className="sticky top-[121px] z-30 border-b border-white/10 bg-navy/95 backdrop-blur">
          <div data-mbaas-oid="tabnav2" className="mx-auto max-w-4xl px-6">
            <div data-mbaas-oid="tabnav3" role="tablist" aria-label="AWOS 기능 선택" className="flex flex-wrap gap-2 py-4">
              {TABS.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key
                return (
                  <button
                    data-mbaas-oid="tabnav4" key={key}
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

        {activeTab === 'myRecords' && (
          <>
            {isDrone && (
              <section data-mbaas-oid="cpldrn1" className="bg-panel py-[clamp(64px,8vw,120px)]">
                <div data-mbaas-oid="cpldrn2" className="mx-auto max-w-4xl px-6">
                  <Reveal>
                    <ComplianceSection
                      title="드론조종자 법정 요건 안내/현황"
                      description="아래 항목은 등록한 자격증·비행기록을 바탕으로 자동 계산한 참고 정보입니다."
                      items={droneComplianceItems}
                    />
                  </Reveal>
                </div>
              </section>
            )}

            <section data-mbaas-oid="lgbpg30" className="bg-navy py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="lgbpg31" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <h2 data-mbaas-oid="y1wgruj" className="font-display text-2xl font-extrabold text-white">
                    총 비행시간 요약
                  </h2>
                  <p data-mbaas-oid="omsx91r" className="mt-2 text-sm text-slate-300">
                    지금까지 등록한 비행 기록을 기준으로 범주·자격·조건별 누적 시간을 계산합니다.
                  </p>
                  <div data-mbaas-oid="avfp5fw" className="mt-6">
                    <LogbookTotalsSummary entries={entries} accountId={account?.id} />
                  </div>
                </Reveal>
              </div>
            </section>

            <section data-mbaas-oid="lgbpg20" className="bg-panel py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="lgbpg21" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <div data-mbaas-oid="kyatjlq" className="flex flex-wrap items-center justify-between gap-3">
                    <h2 data-mbaas-oid="lgbpg22" className="font-display text-2xl font-extrabold text-ink">
                      내 비행 기록
                    </h2>
                    <div data-mbaas-oid="b35f0b4" className="flex flex-col items-end gap-1">
                      <Button
                        data-mbaas-oid="50pkbfd"
                        variant="outline"
                        tone="neutral"
                        size="sm"
                        loading={isResyncing}
                        disabled={isResyncing || resyncCooldownSecondsLeft > 0}
                        onClick={handleResyncFromServer}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {!isResyncing && resyncCooldownSecondsLeft > 0
                          ? `서버와 다시 동기화 (${resyncCooldownSecondsLeft}초 후 다시 시도 가능)`
                          : '서버와 다시 동기화'}
                      </Button>
                      {resyncMessage && (
                        <p data-mbaas-oid="cycrkz7" className="text-xs text-slate-400">
                          {resyncMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div data-mbaas-oid="lgbpg23" className="mt-6">
                    <EntryFilterBar
                      entries={entries}
                      kind={filterKind}
                      value={filterValue}
                      onKindChange={setFilterKind}
                      onValueChange={setFilterValue}
                    />
                  </div>
                  <div data-mbaas-oid="lgbpg24" className="mt-6">
                    <EntryList
                      entries={filteredEntries}
                      totalAccountEntryCount={entries.length}
                      pendingSyncCount={pendingSyncCount}
                      onSelect={setSelectedEntry}
                      onDeleteMany={(ids) => {
                        cleanupSignatureRequestPosts(ids)
                        deleteEntries(ids)
                      }}
                      onDeleteAll={() => {
                        cleanupSignatureRequestPosts(entries.map((e) => e.id))
                        clearAll()
                      }}
                      onExportCsv={() => downloadLogbookCsv(entries)}
                      onPrint={() => printLogbook(entries)}
                    />
                  </div>
                </Reveal>
              </div>
            </section>
          </>
        )}

        {activeTab === 'certificates' && (
          <>
            <section data-mbaas-oid="xaqul3f" className="bg-surface py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="wuso7uw" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <div
                    data-mbaas-oid="iyk1dsj" className={`flex items-start gap-3 rounded-card border p-5 ${
                      roleContent ? `${roleContent.borderClass} ${roleContent.bgClass}` : 'border-sky/30 bg-sky/10'
                    }`}
                  >
                    <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${roleContent ? roleContent.colorClass : 'text-sky'}`} aria-hidden="true" />
                    <div data-mbaas-oid="2qzvzkm">
                      <p data-mbaas-oid="dufiijg" className={`text-xs font-semibold uppercase tracking-wide ${roleContent ? roleContent.colorClass : 'text-sky'}`}>
                        {roleContent ? `${roleContent.name} 자격 템플릿` : '자격증 관리'}
                      </p>
                      <p data-mbaas-oid="vo5u9f7" className="mt-1 text-sm text-slate-400">
                        {roleContent
                          ? roleContent.summary
                          : '면허, 항공신체검사, 법정교육 등 자격 항목을 자유롭게 등록하고 관리하세요. 역할을 설정하면 역할별 추천 자격 템플릿과 강조 색상이 표시됩니다.'}
                      </p>
                      {!isPilotLike && (
                        <p data-mbaas-oid="jgvfszy" className="mt-2 text-xs text-slate-400">
                          만료일이 등록된 자격증은 D-30/D-7 기준으로 카드에 경고 배지가 표시됩니다. 이 직군의 구체적인 법정 갱신 주기는 아직
                          제공되지 않아, 등록한 자격증의 만료 알림으로 갱신 시점을 관리해 주세요.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <TsIntegrationCard />
                  </div>

                  <h2 data-mbaas-oid="d1lqcdw" className="mt-8 font-display text-2xl font-extrabold text-ink">
                    자격증 등록
                  </h2>
                  <p data-mbaas-oid="wo3mwbm" className="mt-2 text-sm text-slate-400">
                    면허, 항공신체검사, 법정교육 등 자격 항목을 등록하면 만료 임박 시 카드에 경고 배지가 표시됩니다.
                  </p>
                  <div data-mbaas-oid="0ol2vj9" className="mt-6 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                    <CertificateForm mode="create" onSubmit={(input) => addCertificate(input)} roleTemplate={roleContent} />
                  </div>
                </Reveal>
              </div>
            </section>

            <section data-mbaas-oid="7r4ryck" className="bg-panel py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="5nfdg3d" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <h2 data-mbaas-oid="x782ba2" className="font-display text-2xl font-extrabold text-ink">
                    내 자격증 목록
                  </h2>
                  <div data-mbaas-oid="85jt1q8" className="mt-6">
                    <CertificateList
                      certificates={certificates}
                      onSelect={setSelectedCertificate}
                      accentHoverBorderClass={roleContent?.hoverBorderClass}
                    />
                  </div>
                </Reveal>
              </div>
            </section>
          </>
        )}

        {activeTab === 'currency' && isPilotLike && (
          <section data-mbaas-oid="cursec1" className="bg-surface py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="cursec2" className="mx-auto max-w-4xl px-6">
              <Reveal>
                <h2 data-mbaas-oid="cursec3" className="font-display text-2xl font-extrabold text-ink">
                  커런시 현황
                </h2>
                <p data-mbaas-oid="cursec4" className="mt-2 text-sm text-slate-400">
                  비행기록 관리 탭에 입력한 이착륙·계기접근·비행교관 시간을 바탕으로 최근 비행경험·계기비행 경험·조종교육
                  비행경험 유지 상태를 계산합니다.
                </p>
                <div data-mbaas-oid="cursec5" className="mt-6">
                  <CurrencyDashboard
                    entries={entries}
                    account={account}
                    certificates={certificates}
                    isApprovedInstructor={isApprovedInstructor}
                  />
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {activeTab === 'logbook' && (
          <>
            <section data-mbaas-oid="lgbpg16" className="bg-surface py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="lgbpg17" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <h2 data-mbaas-oid="lgbpg18" className="font-display text-2xl font-extrabold text-ink">
                    새 비행 기록 추가
                  </h2>
                  <div className="mt-4 inline-flex rounded-control border border-white/15 p-1">
                    <button
                      type="button"
                      onClick={() => setEntryFormMode('quick')}
                      className={`rounded-[7px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                        entryFormMode === 'quick' ? 'bg-sky text-navy' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ⚡ 퀵 기록 (30초)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryFormMode('detail')}
                      className={`rounded-[7px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                        entryFormMode === 'detail' ? 'bg-sky text-navy' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      상세 입력 (공식 양식)
                    </button>
                  </div>
                  <div data-mbaas-oid="lgbpg19" className="mt-4 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                    {entryFormMode === 'quick' ? (
                      <QuickEntryForm onSubmit={(input) => addEntry(input)} />
                    ) : (
                      <EntryForm mode="create" onSubmit={(input) => addEntry(input)} {...aircraftLabelProps} />
                    )}
                  </div>
                </Reveal>
              </div>
            </section>

            <section data-mbaas-oid="lgbpg26" className="bg-panel py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="lgbpg27" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <h2 data-mbaas-oid="lgbpg28" className="font-display text-2xl font-extrabold text-ink">
                    종이 로그북 기록 가져오기
                  </h2>
                  <p data-mbaas-oid="lgbpg29" className="mt-2 text-sm text-slate-400">
                    기존에 종이 로그북(탈론 로그 등)이나 개인 엑셀 파일로 관리하던 과거 비행 기록을 이 앱으로 옮겨올 수 있습니다.
                  </p>
                  <div data-mbaas-oid="lgbpg2a" className="mt-6">
                    <LegacyImportSection
                      onAddEntries={handleImportLegacyEntries}
                    />
                  </div>
                </Reveal>
              </div>
            </section>

          </>
        )}

        {activeTab === 'workLog' && workLogCopy && (
          <>
            <section data-mbaas-oid="cplwrk1" className="bg-panel py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="cplwrk2" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <ComplianceSection
                    title={workLogComplianceTitle}
                    description="아래 항목은 등록한 자격증·업무기록을 바탕으로 자동 계산한 참고 정보입니다."
                    items={workLogComplianceItems}
                  />
                </Reveal>
              </div>
            </section>

            <section data-mbaas-oid="345u0xk" className="bg-surface py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="c8jey75" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <h2 data-mbaas-oid="dj8ehec" className="font-display text-2xl font-extrabold text-ink">
                    {workLogCopy.formTitle}
                  </h2>
                  <p data-mbaas-oid="g3u3q5t" className="mt-2 text-sm text-slate-400">
                    {workLogCopy.formDesc}
                  </p>
                  <div data-mbaas-oid="pw1u587" className="mt-6 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                    <WorkLogForm mode="create" copy={workLogCopy} onSubmit={(input) => addWorkLogEntry(input)} />
                  </div>
                </Reveal>
              </div>
            </section>

            <section data-mbaas-oid="5wmlu2d" className="bg-panel py-[clamp(64px,8vw,120px)]">
              <div data-mbaas-oid="djxyqfk" className="mx-auto max-w-4xl px-6">
                <Reveal>
                  <h2 data-mbaas-oid="7muuj7p" className="font-display text-2xl font-extrabold text-ink">
                    {workLogCopy.listTitle}
                  </h2>
                  <div data-mbaas-oid="p020zs5" className="mt-6">
                    <WorkLogList entries={workLogEntries} copy={workLogCopy} onSelect={setSelectedWorkLogEntry} />
                  </div>
                </Reveal>
              </div>
            </section>
          </>
        )}

        {activeTab === 'signatureInbox' && (
          <section data-mbaas-oid="sywdazj" className="bg-navy-dark py-[clamp(64px,8vw,120px)]">
            <div data-mbaas-oid="yc4n810" className="mx-auto max-w-4xl px-6">
              <Reveal>{account && <InstructorSignatureInboxSection account={account} />}</Reveal>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* 다이얼로그 열림 여부와 무관하게, 대기중인 비행경력증명서 인증/교관 서명 요청을
          백그라운드에서 자동으로 확인해 반영한다(BUG-015). */}
      <AutoSyncEntryDecisions entries={entries} onUpdate={handleUpdateEntry} />

      <EntryDetailDialog
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdate={handleUpdateEntry}
        onDelete={(id) => {
          cleanupSignatureRequestPosts([id])
          deleteEntry(id)
          setSelectedEntry(null)
        }}
        {...aircraftLabelProps}
      />

      <CertificateDetailDialog
        certificate={selectedCertificate}
        roleTemplate={roleContent}
        onClose={() => setSelectedCertificate(null)}
        onUpdate={(id, input) => {
          updateCertificate(id, input)
          setSelectedCertificate((prev) => (prev && prev.id === id ? { ...prev, ...input, updatedAt: Date.now() } : prev))
        }}
        onDelete={(id) => {
          deleteCertificate(id)
          setSelectedCertificate(null)
        }}
      />

      {workLogCopy && (
        <WorkLogDetailDialog
          entry={selectedWorkLogEntry}
          copy={workLogCopy}
          onClose={() => setSelectedWorkLogEntry(null)}
          onUpdate={(id, input) => {
            updateWorkLogEntry(id, input)
            setSelectedWorkLogEntry((prev) => (prev && prev.id === id ? { ...prev, ...input, updatedAt: Date.now() } : prev))
          }}
          onDelete={(id) => {
            deleteWorkLogEntry(id)
            setSelectedWorkLogEntry(null)
          }}
        />
      )}
    </div>
  )
}
