import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleCheck, Gauge, GraduationCap, Info, Moon, Radar, Share2, Sun, TriangleAlert } from 'lucide-react'

import type { LogbookEntry } from '../../types/logbook'
import type { Certificate } from '../../types/certificate'
import { type AccountResponse, INDIVIDUAL_ROLE_LABEL } from '../../lib/baas/types'
import { useCurrencyOverrides } from '../../hooks/useCurrencyOverrides'
import { useIndividualRoleOverride } from '../../hooks/useIndividualRoleOverride'
import { usePilotTracks } from '../../hooks/usePilotTracks'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import { useMyStatusSharePost } from '../../hooks/baas/useMyStatusSharePost'
import { useCreateStatusSharePost } from '../../hooks/baas/useCreateStatusSharePost'
import { useUpdateBoardPost } from '../../hooks/baas/useUpdateBoardPost'
import {
  buildStatusShareContent,
  buildStatusShareTitle,
  findStatusSharePostByUserId,
  formatStatusShareDateTime,
} from '../../lib/statusShare'
import { computeFlightReadiness, computeReadinessStates } from '../../lib/flightReadiness'
import type { ReadinessState, ReadinessStateKey } from '../../lib/flightReadiness'
import { Button } from '../Button'

const STATE_ICON: Record<ReadinessStateKey, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  general: Sun,
  night: Moon,
  ifr: Radar,
  instructor: GraduationCap,
}

/** LogbookTotalsSummary.tsx와 동일한 기준: 비행경력증명서 출처 기록 중 미인증/반려는 공식 합계에서 제외한다. */
function isUnconfirmedCertificateEntry(entry: LogbookEntry): boolean {
  return entry.origin === 'flight_experience_certificate' && entry.certificateApprovalStatus !== 'confirmed'
}

interface FlightReadinessPanelProps {
  entries: LogbookEntry[]
  certificates?: Certificate[]
  /** 상태공유 버튼 및 개인설정 서버 동기화에 필요한 계정 정보(이름/이메일/소속). 없으면 공유 버튼을 표시하지 않습니다. */
  account?: AccountResponse | null
  /** true면 히어로 등 좁은 영역에 맞춘 축약형(작은 배지 + 칩 한 줄)으로 렌더링합니다. */
  compact?: boolean
}

const SHOW_ORG_SHARE = false // 조종사 전용 모드: 기관 공유 UI 비활성(B2B 재개 시 true)

export function FlightReadinessPanel({
  entries,
  certificates = [],
  account = null,
  compact = false,
}: FlightReadinessPanelProps) {
  const { instrumentCheckDate, instructorFirstCertDate, instructorRecoveryChecked } = useCurrencyOverrides(account)
  const { operationType } = usePilotTracks(account)

  const result = useMemo(
    () =>
      computeFlightReadiness(entries, certificates, {
        instrumentCheckDate,
        instructorFirstCertDate,
        instructorRecoveryChecked,
        operationType,
      }),
    [entries, certificates, instrumentCheckDate, instructorFirstCertDate, instructorRecoveryChecked, operationType],
  )
  const summary = useMemo(() => computeReadinessStates(result, certificates), [result, certificates])

  const hasData = entries.length > 0 || certificates.length > 0

  // ── 내 상태를 소속 기관에 공유 ────────────────────────────────────────────────
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const affiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const { override: roleOverride } = useIndividualRoleOverride(account)
  const roleLabel = useMemo(() => {
    const role = roleOverride ?? account?.data?.individual_role
    return role ? INDIVIDUAL_ROLE_LABEL[role] : '역할 미설정'
  }, [roleOverride, account])
  const totalHours = useMemo(
    () => entries.filter((e) => !isUnconfirmedCertificateEntry(e)).reduce((sum, e) => sum + (e.blockTime || 0), 0),
    [entries],
  )

  const { refetch: refetchMyStatusSharePost } = useMyStatusSharePost(account?.user_id)
  const { createStatusSharePost, isLoading: isCreatingShare, error: createShareError, reset: resetCreateShare } =
    useCreateStatusSharePost()
  const { updatePost: updateStatusSharePost, isLoading: isUpdatingShare, error: updateShareError, reset: resetUpdateShare } =
    useUpdateBoardPost()

  const [lastSharedAt, setLastSharedAt] = useState<Date | null>(null)

  const isSharing = isCreatingShare || isUpdatingShare
  const shareError = createShareError || updateShareError
  const canShare = Boolean(account && affiliation && affiliation.trim())

  async function handleShareStatus() {
    if (!account || !affiliation || isSharing) return
    resetCreateShare()
    resetUpdateShare()

    try {
      const title = buildStatusShareTitle(account.name, account.user_id, affiliation)
      const content = buildStatusShareContent({
        overallGo: summary.overallGo,
        states: summary.states,
        class1Status: result.medical.class1Status,
        class2Status: result.medical.class2Status,
        class3Status: result.medical.class3Status,
        certificates,
        roleLabel,
        totalHours,
      })

      // 마운트 시점에 캐시된 myStatusSharePost는 최신이 아닐 수 있으므로(예: 목록 조회가 아직
      // 끝나기 전에 버튼을 눌렀거나 최초 조회가 실패했던 경우), create/update 분기 직전에 항상
      // 최신 목록을 다시 조회해 본인 게시글 존재 여부를 판단한다(BUG-018: 중복 게시글 생성 방지).
      const freshItems = await refetchMyStatusSharePost()
      const existingPost = freshItems ? findStatusSharePostByUserId(freshItems, account.user_id) : null

      if (existingPost) {
        await updateStatusSharePost(existingPost.id, { title, content })
      } else {
        await createStatusSharePost({ title, content, is_hidden: false })
      }
      await refetchMyStatusSharePost()
      setLastSharedAt(new Date())
    } catch {
      // shareError 상태로 화면에 안내됨
    }
  }

  const shareControl = (
    <div className={compact ? 'mt-3' : 'mt-6'}>
      {!canShare && account && (
        <p className="flex items-start gap-1.5 text-xs text-amber-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          먼저{' '}
          <Link to="/account"
            className="font-semibold underline underline-offset-2 hover:text-amber-200
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            계정정보
          </Link>
          에서 소속 기관을 설정해주세요.
        </p>
      )}

      {/* 조종사 전용 모드: 기관 상태공유 UI는 숨긴다(B2B 재개 시 이 플래그만 켜면 복원).
          훅·핸들러는 보존되어 있어 기능 자체는 살아있다. */}
      {SHOW_ORG_SHARE && account && (
        <Button type="button" size="sm" tone="brand" variant="outline"
          className="mt-2 border-sky/40 text-sky hover:bg-sky/10"
          disabled={!canShare || isSharing}
          loading={isSharing}
          onClick={() => void handleShareStatus()}
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          내 상태를 소속 기관에 공유
        </Button>
      )}

      {SHOW_ORG_SHARE && shareError && (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-300">
          {shareError}
        </p>
      )}

      {SHOW_ORG_SHARE && lastSharedAt && !shareError && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-go">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {formatStatusShareDateTime(lastSharedAt)} 기준으로 공유됨
        </p>
      )}

    </div>
  )

  if (compact) {
    return (
      <div
        className="rounded-card border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-sky" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-sky">
            실시간 비행 적합성
          </p>
        </div>

        {!hasData ? (
          <p className="mt-3 text-xs text-slate-400">
            자격증·비행 기록을 등록하면 실시간 GO/NO-GO 판정이 표시됩니다.
          </p>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 ${
                summary.overallGo ? 'border-go/60 bg-go/10 text-go' : 'border-rose-400/60 bg-rose-500/100/10 text-rose-400'
              }`}
            >
              {summary.overallGo ? (
                <CircleCheck className="h-6 w-6" aria-hidden="true" />
              ) : (
                <TriangleAlert className="h-6 w-6" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-display text-base font-extrabold tracking-tight ${
                  summary.overallGo ? 'text-go' : 'text-rose-400'
                }`}
              >
                {summary.overallGo ? 'GO-TO-FLY' : 'NO-GO'}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.states.map((state) => (
                  <ReadinessStateChip key={state.key} state={state} />
                ))}
              </div>
            </div>
          </div>
        )}

        {shareControl}
      </div>
    )
  }

  return (
    <div
      className="rounded-card border border-white/10 bg-white/[0.04] p-cardpad backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-sky" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide text-sky">
          실시간 비행 적합성
        </p>
      </div>

      {!hasData ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-control border border-dashed border-white/15 bg-white/[0.02] py-10 text-center">
          <Gauge className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="max-w-xs text-sm text-slate-400">
            아직 등록된 자격증이나 비행 기록이 없어 비행 적합성을 계산할 수 없습니다. 자격증 관리·비행기록 관리 탭에서
            정보를 등록하면 이 자리에 실시간 GO/NO-GO 판정이 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          {/* 종합 배지 — 일반 비행 가능 여부 기준 GO/NO-GO */}
          <div className="mt-6 flex flex-col items-center text-center">
            <span className={`flex h-24 w-24 items-center justify-center rounded-full border-4 ${
                summary.overallGo ? 'border-go/60 bg-go/10 text-go' : 'border-rose-400/60 bg-rose-500/100/10 text-rose-400'
              }`}
            >
              {summary.overallGo ? (
                <CircleCheck className="h-11 w-11" aria-hidden="true" />
              ) : (
                <TriangleAlert className="h-11 w-11" aria-hidden="true" />
              )}
            </span>
            <p className={`mt-3 font-display text-2xl font-extrabold tracking-tight ${
                summary.overallGo ? 'text-go' : 'text-rose-400'
              }`}
            >
              {summary.overallGo ? 'GO-TO-FLY' : 'NO-GO'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {summary.overallGo
                ? '항공신체검사와 최근 비행경험 기본 요건을 충족해 일반 비행이 가능합니다'
                : '항공신체검사 또는 최근 비행경험 기본 요건이 충족되지 않아 일반 비행이 제한됩니다'}
            </p>
          </div>

          {/* 4개 상태 카드 */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {summary.states.map((state) => (
              <ReadinessStateCard key={state.key} state={state} />
            ))}
          </div>
        </>
      )}

      {shareControl}

      <p className="mt-6 text-xs text-slate-400">
        이 판정은 등록된 자격증·비행 기록을 바탕으로 한 참고용 자동 계산이며, 실제 법적 판단은 소속 기관/관련 규정을
        통해 확인해야 합니다. 자세한 산출 근거는 아래 "커런시 관리" 탭에서 확인할 수 있습니다.
      </p>
    </div>
  )
}

function ReadinessStateChip({ state }: { state: ReadinessState }) {
  const Icon = STATE_ICON[state.key]
  return (
    <span className={`inline-flex items-center gap-2 rounded-control border px-4 py-2 text-sm font-bold ${
        state.met ? 'border-go/25 bg-go/10 text-go' : 'border-white/10 bg-white/[0.03] text-slate-400'
      }`}
      title={state.label}
    >
      <Icon className="h-5 w-5" aria-hidden={true} />
      {state.label}
      <span className={`ml-0.5 rounded-control px-1 text-[10px] font-bold ${
          state.met ? 'bg-go/15 text-go' : 'bg-rose-500/100/15 text-rose-300'
        }`}
      >
        {state.met ? '가능' : '제한'}
      </span>
    </span>
  )
}

function ReadinessStateCard({ state }: { state: ReadinessState }) {
  const Icon = STATE_ICON[state.key]
  return (
    <div
      className={`rounded-control border p-4 ${
        state.met ? 'border-go/25 bg-go/5' : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-6 w-6 ${state.met ? 'text-go' : 'text-slate-400'}`} aria-hidden={true} />
          <span className="text-sm font-bold text-white">
            {state.label}
          </span>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-control px-2 py-0.5 text-sm font-bold ${
            state.met ? 'bg-go/15 text-go' : 'bg-rose-500/100/15 text-rose-300'
          }`}
        >
          {state.met ? '가능' : '제한'}
        </span>
      </div>
      {!state.met && state.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-slate-400">
          {state.reasons.map((reason, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden="true">
                ·
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
