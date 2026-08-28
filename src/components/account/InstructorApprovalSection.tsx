import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'

import { Button } from '../Button'
import { useComments } from '../../hooks/baas/useComments'
import { useCreateInstructorApplication } from '../../hooks/baas/useCreateInstructorApplication'
import { useInstructorApplications } from '../../hooks/baas/useInstructorApplications'
import {
  buildAffiliationLine,
  buildInstructorApplicationTitle,
  findInstructorApplicationByUserId,
  parseDecidedAtFromComment,
  resolveApprovalDecision,
} from '../../lib/baas/instructorApproval'
import type { AccountResponse } from '../../lib/baas/types'

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ko-KR')
  } catch {
    return ''
  }
}

interface InstructorApprovalSectionProps {
  account: AccountResponse
  /** AccountPage에서 계산한 현재 유효 소속 기관(override → 계정 저장값 순 우선). 신청서 content에 포함된다. */
  affiliation?: string
}

export function InstructorApprovalSection({ account, affiliation }: InstructorApprovalSectionProps) {
  const { data, isLoading, error, refetch } = useInstructorApplications()
  const { createApplication, isLoading: isSubmitting, error: submitError, reset: resetSubmit } = useCreateInstructorApplication()

  const [reason, setReason] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const myApplication = useMemo(
    () => findInstructorApplicationByUserId(data?.items ?? [], account.user_id),
    [data, account.user_id],
  )

  // [BUG-004 수정] 승인 여부는 신청 게시글의 is_hidden이 아니라 댓글([APPROVED]/[REJECTED])로 판정한다.
  const {
    data: commentsData,
    isLoading: isCheckingDecision,
    error: commentsError,
    refetch: refetchComments,
  } = useComments(myApplication?.id, { enabled: Boolean(myApplication) })

  const decision = useMemo(() => resolveApprovalDecision(commentsData?.items ?? []), [commentsData])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim() || isSubmitting) return

    resetSubmit()
    setSubmitSuccess(false)

    try {
      const contentLines = [reason.trim()]
      if (affiliation && affiliation.trim()) {
        contentLines.push('', buildAffiliationLine(affiliation.trim()))
      }
      await createApplication({
        title: buildInstructorApplicationTitle(account.name, account.user_id, affiliation),
        content: contentLines.join('\n'),
        // [BUG-005 수정] is_hidden:true로 생성하면 작성자 본인이 아닌 계정(기관 계정)에게는
        // 목록에서도 조회되지 않아 승인 관리 화면에 신청서가 전혀 나타나지 않았다.
        // 승인 상태는 전적으로 댓글([APPROVED]/[REJECTED])로만 판정하므로 게시글 자체는
        // 항상 공개(비숨김) 상태로 둔다.
        is_hidden: false,
      })
      setReason('')
      setSubmitSuccess(true)
      await refetch()
    } catch {
      // submitError 상태로 화면에 안내됨
    }
  }

  async function handleRefetchAll() {
    await refetch()
    if (myApplication) await refetchComments()
  }

  return (
    <div data-mbaas-oid="iasec01" className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
      <h2 data-mbaas-oid="iasec02" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
        <ShieldCheck className="h-4 w-4 text-sky" aria-hidden="true" />
        교관 승인 신청
      </h2>
      <p data-mbaas-oid="iasec03" className="mt-1 text-xs text-slate-400">
        비행 기록에 교관 전자서명을 하려면 먼저 승인이 필요합니다. 신청 후 기관 관리자의 검토를 기다려 주세요.
      </p>

      {isLoading ? (
        <p data-mbaas-oid="iasec04" className="mt-5 text-sm text-slate-400">신청 현황을 불러오는 중입니다...</p>
      ) : error ? (
        <div data-mbaas-oid="iasec05" role="alert" className="mt-5 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p data-mbaas-oid="iasec06" className="text-xs font-medium text-rose-300">{error}</p>
          <Button data-mbaas-oid="iasec07" type="button" variant="outline" tone="neutral" size="sm" className="mt-3" onClick={() => void handleRefetchAll()}>
            다시 시도
          </Button>
        </div>
      ) : myApplication ? (
        <div data-mbaas-oid="iasec08" className="mt-5 space-y-4">
          {isCheckingDecision ? (
            <p data-mbaas-oid="iasec25" className="text-sm text-slate-400">승인 여부를 확인하는 중입니다...</p>
          ) : commentsError ? (
            <div data-mbaas-oid="iasec26" role="alert" className="flex items-center gap-2 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <p data-mbaas-oid="iasec27" className="text-xs font-medium text-rose-300">{commentsError}</p>
              <Button data-mbaas-oid="iasec28" type="button" variant="outline" tone="neutral" size="sm" onClick={() => void refetchComments()}>
                다시 시도
              </Button>
            </div>
          ) : decision.status === 'approved' ? (
            <div data-mbaas-oid="iasec09" role="status" className="flex items-center gap-2 rounded-control border border-go/30 bg-go/10 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-go" aria-hidden="true" />
              <p data-mbaas-oid="iasec10" className="text-sm font-medium text-go">
                교관 승인이 완료되었습니다. 이제 비행 기록에 교관 전자서명을 할 수 있습니다.
              </p>
            </div>
          ) : decision.status === 'rejected' ? (
            <div data-mbaas-oid="iasec29" role="status" className="flex items-center gap-2 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
              <p data-mbaas-oid="iasec30" className="text-sm font-medium text-rose-300">
                신청이 반려되었습니다. 문의사항이 있다면 소속 기관 관리자에게 확인해주세요.
              </p>
            </div>
          ) : (
            <div data-mbaas-oid="iasec11" role="status" className="flex items-center gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-4 py-3">
              <Clock3 className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <p data-mbaas-oid="iasec12" className="text-sm font-medium text-amber-300">
                승인 대기중입니다. 기관 관리자의 검토가 완료되면 서명이 가능해집니다.
              </p>
            </div>
          )}

          {decision.comment && (
            <p data-mbaas-oid="iasec31" className="font-mono-data text-xs tabular-nums text-slate-500">
              처리자: {decision.comment.author_name} · {formatTimestamp(parseDecidedAtFromComment(decision.comment))}
            </p>
          )}

          <div data-mbaas-oid="iasec13" className="rounded-control border border-white/10 bg-navy px-4 py-3">
            <p data-mbaas-oid="iasec14" className="text-xs font-semibold text-slate-400">제출한 사유</p>
            <p data-mbaas-oid="iasec15" className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
              {myApplication.content}
            </p>
            <p data-mbaas-oid="iasec16" className="mt-2 font-mono-data text-xs tabular-nums text-slate-500">
              신청일: {formatDateTime(myApplication.created_at)}
            </p>
          </div>
        </div>
      ) : (
        <form data-mbaas-oid="iasec17" onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {submitError && (
            <p data-mbaas-oid="iasec18" role="alert" className="rounded-control border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
              {submitError}
            </p>
          )}
          {submitSuccess && !submitError && (
            <p data-mbaas-oid="iasec19" role="status" className="rounded-control border border-go/30 bg-go/10 px-3 py-2 text-xs font-medium text-go">
              신청이 접수되었습니다. 승인 대기중입니다.
            </p>
          )}

          <div data-mbaas-oid="iasec20" className="flex flex-col gap-1.5">
            <label data-mbaas-oid="iasec21" htmlFor="instructor-application-reason" className="text-xs font-semibold text-slate-300">
              신청 사유 / 교관 경력
            </label>
            <textarea
              data-mbaas-oid="iasec22" id="instructor-application-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="교관 자격 취득 경위, 비행 교육 경력 등을 입력해주세요."
              className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-500
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            />
            <p data-mbaas-oid="iasec32" className="text-xs text-slate-500">
              소속 기관: {affiliation && affiliation.trim() ? affiliation : '미설정 (계정정보 상단에서 소속 기관을 먼저 등록하면 신청서에 함께 표시됩니다.)'}
            </p>
          </div>

          <Button data-mbaas-oid="iasec23" type="submit" size="md" disabled={!reason.trim() || isSubmitting} loading={isSubmitting} className="self-start">
            신청하기
          </Button>
        </form>
      )}
    </div>
  )
}
