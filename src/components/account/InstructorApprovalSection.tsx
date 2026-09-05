// 교관 승인 신청 — 계정정보 화면. approval_requests(schema12) 기준, 자격 구분(track)별로 신청·표시한다.
// 부채 3단계: 계정당 1건이던 게시판 신청서 → (사용자 × 구분) 단위 행. 항공기로 승인받은 뒤에도
// 경량·초경량을 따로 신청할 수 있다.

import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../Button'
import { createApprovalRequest } from '../../lib/approvals/api'
import { useMyInstructorApprovals } from '../../lib/approvals/hooks'
import { type ApprovalRequest, type PilotTrack, TRACK_INSTRUCTOR_LABEL } from '../../lib/approvals/types'
import type { AccountResponse } from '../../lib/baas/types'
import { useCertificates } from '../../hooks/useCertificates'
import type { Certificate } from '../../types/certificate'
import { InfoTip } from '../InfoTip'

/** 구분별로 교관 신청에 필요한 자격증 카테고리 */
const INSTRUCTOR_CERT_CATEGORY: Record<PilotTrack, Certificate['category']> = {
  aircraft: '조종교육증명',
  lsa: '경량항공기 조종교육증명',
  ultralight: '지도조종자',
}
const APPROVAL_LABEL: Record<string, string> = { approved: '인증됨', pending: '인증 대기중', rejected: '인증 반려' }

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
  // 교관 신청 전제: 그 구분의 조종교육증명(지도조종자)이 자격증 탭에 등록돼 있어야 한다.
  // 등록된 증명 정보는 신청서에 자동으로 붙어 관리자가 본다(인증됨/대기중 포함).
  const { certificates } = useCertificates(account)
  const instructorCertByTrack = useMemo(() => {
    const out: Partial<Record<PilotTrack, Certificate>> = {}
    for (const t of TRACK_ORDER) {
      const found = certificates
        .filter((c) => c.category === INSTRUCTOR_CERT_CATEGORY[t])
        .sort((a, b) => (a.approvalStatus === 'approved' ? -1 : 0) - (b.approvalStatus === 'approved' ? -1 : 0))[0]
      if (found) out[t] = found
    }
    return out
  }, [certificates])

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
    const cert = instructorCertByTrack[openTrack]
    if (!cert) {
      setSubmitError(`${INSTRUCTOR_CERT_CATEGORY[openTrack]}을(를) 자격증 탭에 먼저 등록해 주세요.`)
      setIsSubmitting(false)
      return
    }
    try {
      await createApprovalRequest({
        kind: 'instructor',
        requesterName: account.name,
        requesterEmail: account.user_id,
        track: openTrack,
        affiliation: affiliation?.trim() || null,
        title: `${TRACK_INSTRUCTOR_LABEL[openTrack]} 승인 신청 — ${account.name}`,
        summary: [
          `${cert.category}: ${cert.name} · 발급 ${cert.issuedDate}${cert.issuer ? ` · ${cert.issuer}` : ''} · ${APPROVAL_LABEL[cert.approvalStatus ?? ''] ?? '미인증'}`,
          '',
          reason.trim(),
        ].join('\n'),
        payload: {
          instructorCertificate: {
            id: cert.id,
            category: cert.category,
            name: cert.name,
            issuer: cert.issuer,
            issuedDate: cert.issuedDate,
            expiryDate: cert.expiryDate ?? null,
            approvalStatus: cert.approvalStatus ?? null,
            approvalRequestId: cert.approvalRequestPostId ?? null,
          },
        },
      })
      setSubmitSuccess(openTrack)
      setOpenTrack(null)
      setReason('')
      await refetch()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '신청에 실패했어요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
        <ShieldCheck className="h-4 w-4 text-sky" aria-hidden="true" />
        교관 승인 신청
        <InfoTip label="교관 승인 안내">
          비행 기록에 교관 전자서명을 하려면 자격 구분별로 승인이 필요해요. 항공기 교관 승인으로는 경량·초경량 기록에 서명할 수 없어요(운영세칙 제9조).
        </InfoTip>
      </h2>

      {isLoading && Object.keys(byTrack).length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">신청 현황을 불러오는 중이에요...</p>
      ) : error && Object.keys(byTrack).length === 0 ? (
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
            const cert = instructorCertByTrack[track]
            const canApply = (!request || request.status === 'rejected') && Boolean(cert)
            const isOpen = openTrack === track
            return (
              <li key={track} className="rounded-control border border-white/10 bg-navy p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{TRACK_INSTRUCTOR_LABEL[track]}</p>
                  {(!request || request.status === 'rejected') && !cert && (
                    <Link to="/logbook?tab=certificates"
                      className="inline-flex min-h-[40px] items-center rounded-control border border-sky/40 bg-sky/10 px-3 text-xs font-semibold text-sky hover:bg-sky/15"
                    >
                      자격증 탭에서 {INSTRUCTOR_CERT_CATEGORY[track]} 등록하기 →
                    </Link>
                  )}
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

                {(!request || request.status === 'rejected') && !cert && (
                  <p className="mt-2 text-xs text-slate-400">
                    교관 신청에는 <span className="font-semibold text-slate-200">{INSTRUCTOR_CERT_CATEGORY[track]}</span>이 필요해요. 자격증 탭에 먼저 등록(사진 첨부)하면 여기서 신청할 수 있어요.
                  </p>
                )}
                {cert && (!request || request.status === 'rejected') && (
                  <p className="mt-2 text-xs text-slate-400">
                    등록된 증명: <span className="text-slate-200">{cert.name}</span> · 발급 {cert.issuedDate} · {APPROVAL_LABEL[cert.approvalStatus ?? ''] ?? '미인증'}
                    {cert.approvalStatus !== 'approved' ? ' — 인증이 끝나지 않아도 신청은 되지만, 관리자가 함께 확인해요.' : ''}
                  </p>
                )}
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
                    신청이 접수됐어요. 승인 대기중이에요.
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
                      소속 기관: {affiliation && affiliation.trim() ? affiliation : '미설정 (계정정보 상단에서 소속 기관을 먼저 등록하면 신청서에 함께 표시돼요.)'}
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
