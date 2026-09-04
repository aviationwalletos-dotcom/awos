// 교관 승인 신청 — 계정정보 화면. approval_requests(schema12) 기준, 자격 구분(track)별로 신청·표시한다.
// 부채 3단계: 계정당 1건이던 게시판 신청서 → (사용자 × 구분) 단위 행. 항공기로 승인받은 뒤에도
// 경량·초경량을 따로 신청할 수 있다.

import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { Button } from '../Button'
import { createApprovalRequest } from '../../lib/approvals/api'
import { useMyInstructorApprovals } from '../../lib/approvals/hooks'
import { type ApprovalRequest, type PilotTrack, TRACK_INSTRUCTOR_LABEL } from '../../lib/approvals/types'
import type { AccountResponse } from '../../lib/baas/types'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

interface InstructorApprovalSectionProps {
  account: AccountResponse
  /** AccountPage에서 계산한 현재 유효 소속 기관(override → 계정 저장값 순 우선). 신청서에 포함된다. */
  affiliation?: string
  /** 사용자가 보유한 자격 구분 — 이 구분들만 신청 카드로 보여준다 */
  pilotTracks?: PilotTrack[]
}

const TRACK_ORDER: PilotTrack[] = ['aircraft', 'lsa', 'ultralight']

function StatusLine({ request }: { request: ApprovalRequest }) {
  if (request.status === 'approved') {
    return (
      <div role="status" className="flex items-start gap-2 rounded-control border border-go/30 bg-go/10 px-3 py-2.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-go" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-go">승인됨 — 이 구분의 비행 기록에 교관 전자서명을 할 수 있어요.</p>
          {request.decided_at && (
            <p className="mt-0.5 font-mono-data text-[11px] tabular-nums text-slate-400">
              {request.decided_by_name || '관리자'} · {formatDateTime(request.decided_at)}
            </p>
          )}
        </div>
      </div>
    )
  }
  if (request.status === 'rejected') {
    return (
      <div role="status" className="flex items-start gap-2 rounded-control border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-rose-300">반려됨 — 아래에서 다시 신청할 수 있어요.</p>
          {request.decision_note && <p className="mt-1 text-xs text-slate-300">사유: {request.decision_note}</p>}
        </div>
      </div>
    )
  }
  return (
    <div role="status" className="flex items-center gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
      <Clock3 className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
      <p className="text-sm font-medium text-amber-300">승인 대기중 — 관리자 검토가 끝나면 서명이 가능해져요.</p>
    </div>
  )
}

export function InstructorApprovalSection({ account, affiliation, pilotTracks = ['aircraft'] }: InstructorApprovalSectionProps) {
  const { byTrack, isLoading, error, refetch } = useMyInstructorApprovals(account.id)
  const tracks = useMemo(() => TRACK_ORDER.filter((t) => pilotTracks.includes(t)), [pilotTracks])

  // 신청 폼은 한 번에 하나의 구분만 연다
  const [openTrack, setOpenTrack] = useState<PilotTrack | null>(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<PilotTrack | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!openTrack || !reason.trim() || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      await createApprovalRequest({
        kind: 'instructor',
        requesterName: account.name,
        requesterEmail: account.user_id,
        track: openTrack,
        affiliation: affiliation?.trim() || null,
        title: `${TRACK_INSTRUCTOR_LABEL[openTrack]} 승인 신청 — ${account.name}`,
        summary: reason.trim(),
      })
      setSubmitSuccess(openTrack)
      setOpenTrack(null)
      setReason('')
      await refetch()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '신청에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
        <ShieldCheck className="h-4 w-4 text-sky" aria-hidden="true" />
        교관 승인 신청
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        비행 기록에 교관 전자서명을 하려면 자격 구분별로 승인이 필요해요. 항공기 교관 승인으로는 경량·초경량 기록에 서명할 수 없어요(운영세칙 제9조).
      </p>

      {isLoading ? (
        <p className="mt-5 text-sm text-slate-400">신청 현황을 불러오는 중입니다...</p>
      ) : error ? (
        <div role="alert" className="mt-5 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-medium text-rose-300">{error}</p>
          <Button type="button" variant="outline" tone="neutral" size="sm" className="mt-3" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {tracks.map((track) => {
            const request = byTrack[track]
            const canApply = !request || request.status === 'rejected'
            const isOpen = openTrack === track
            return (
              <li key={track} className="rounded-control border border-white/10 bg-navy p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{TRACK_INSTRUCTOR_LABEL[track]}</p>
                  {canApply && !isOpen && (
                    <Button type="button" size="sm" variant="outline" tone="brand"
                      data-testid={`instructor-apply-${track}`}
                      onClick={() => {
                        setOpenTrack(track)
                        setSubmitError(null)
                        setSubmitSuccess(null)
                      }}
                    >
                      {request?.status === 'rejected' ? '다시 신청하기' : '신청하기'}
                    </Button>
                  )}
                </div>

                {request && (
                  <div className="mt-3">
                    <StatusLine request={request} />
                    {request.summary && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400">제출 사유: {request.summary}</p>
                    )}
                    <p className="mt-1 font-mono-data text-[11px] tabular-nums text-slate-500">신청일: {formatDateTime(request.created_at)}</p>
                  </div>
                )}

                {submitSuccess === track && (
                  <p role="status" className="mt-3 rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
                    신청이 접수되었습니다. 승인 대기중입니다.
                  </p>
                )}

                {isOpen && (
                  <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
                    {submitError && (
                      <p role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                        {submitError}
                      </p>
                    )}
                    <label htmlFor={`instructor-reason-${track}`} className="text-xs font-semibold text-slate-300">
                      신청 사유 / 교관 경력
                    </label>
                    <textarea id={`instructor-reason-${track}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      placeholder={track === 'ultralight' ? '지도조종자 등록 번호, 교육 경력 등을 입력해주세요.' : '교관 자격 취득 경위, 비행 교육 경력 등을 입력해주세요.'}
                      className="rounded-control border border-white/15 bg-panel px-4 py-3 text-sm text-white placeholder:text-slate-400
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    />
                    <p className="text-xs text-slate-400">
                      소속 기관: {affiliation && affiliation.trim() ? affiliation : '미설정 (계정정보 상단에서 소속 기관을 먼저 등록하면 신청서에 함께 표시됩니다.)'}
                    </p>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={!reason.trim() || isSubmitting} loading={isSubmitting}
                        data-testid={`instructor-submit-${track}`}
                      >
                        신청하기
                      </Button>
                      <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setOpenTrack(null)}>
                        취소
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
