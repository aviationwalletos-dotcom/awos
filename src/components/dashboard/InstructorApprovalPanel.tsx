import React, { useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Clock3, Info, ShieldCheck, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useCommentsBatch } from '../../hooks/baas/useCommentsBatch'
import { useCreateComment } from '../../hooks/baas/useCreateComment'
import { useInstructorApplications } from '../../hooks/baas/useInstructorApplications'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import { EMPTY_ID_SET, useAuthorizedOrgIds } from '../../lib/baas/authorization'
import {
  buildApprovalCommentContent,
  buildRejectionCommentContent,
  parseAffiliationFromContent,
  parseAffiliationFromTitle,
  resolveApprovalDecision,
} from '../../lib/baas/instructorApproval'
import type { ApprovalDecisionStatus } from '../../lib/baas/instructorApproval'
import type { BoardPostListItem, CommentItem } from '../../lib/baas/boardTypes'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
]

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

interface ApplicationRowProps {
  item: BoardPostListItem
  /** 상위 배치 조회로 받은 이 게시글의 댓글 */
  comments: CommentItem[]
  isCheckingDecision: boolean
  /** 승인/반려 후 상위 배치 재조회 */
  onDecided: () => Promise<void> | void
}

// [BUG-004 수정] 게시글 숨김 토글(`PATCH .../hidden`)은 작성자 본인 또는 실제 BaaS 프로젝트 소유자만
// 호출할 수 있어, 신청서 작성자가 아닌 기관 계정으로는 항상 403 FORBIDDEN이었다(승인 기능이 실제로는
// 동작하지 않던 근본 원인). "서명 요청" 게시판과 동일하게, 로그인한 회원이면 누구나(기관 계정 포함)
// 다른 사람의 게시글에 자신의 명의로 댓글을 작성할 수 있는 점을 이용해 승인/반려를 댓글로 표시한다.
//
// [BUG 수정] 소속 기관 파싱은 목록 조회 API에서 가공 없이 그대로 내려오는 title을 우선 사용한다
// (content는 "내용 미리보기" 가공으로 줄바꿈이 보존되지 않을 수 있어 content 기반 파싱이 항상
// 실패했었다). 제목에 소속 접미사가 없는 구 형식 신청서는 content 파싱으로 폴백한다.
function ApplicationRow({ item, comments, isCheckingDecision, onDecided }: ApplicationRowProps) {
  const { account } = useAuth()
  const commentsData = useMemo(() => ({ items: comments }), [comments])
  const commentsError: string | null = null
  const refetchComments = onDecided
  const { createComment, isLoading: isSubmitting, error: submitError, reset: resetSubmit } = useCreateComment(item.id)

  const { orgIds } = useAuthorizedOrgIds()
  const decision = useMemo(
    () => resolveApprovalDecision(commentsData?.items ?? [], orgIds ?? EMPTY_ID_SET),
    [commentsData, orgIds],
  )
  const affiliation = useMemo(
    () => parseAffiliationFromTitle(item.title) ?? parseAffiliationFromContent(item.content),
    [item.title, item.content],
  )


  async function handleDecision(next: 'approved' | 'rejected') {
    resetSubmit()
    try {
      const approverName = account?.name ?? '기관 관리자'
      const content = next === 'approved' ? buildApprovalCommentContent(approverName) : buildRejectionCommentContent(approverName)
      await createComment(content)
      await refetchComments()
    } catch {
      // submitError 상태로 화면에 안내됨
    }
  }

  return (
    <li data-mbaas-oid="iapan15" className="rounded-control border border-white/10 bg-white/[0.04] p-4">
      <div data-mbaas-oid="iapan16" className="flex flex-wrap items-start justify-between gap-3">
        <div data-mbaas-oid="iapan17" className="min-w-0">
          <p data-mbaas-oid="iapan18" className="text-sm font-semibold text-white">{item.title}</p>
          <p data-mbaas-oid="iapan19" className="mt-1 text-xs text-slate-400">
            {item.author_name} · {formatDateTime(item.created_at)}
          </p>
          <span
            data-mbaas-oid="iapan39"
            className={`mt-2 inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold
              ${affiliation ? 'border-sky/30 bg-sky/10 text-sky' : 'border-white/15 text-slate-400'}`}
          >
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            {affiliation || '소속 미기재'}
          </span>
        </div>
        {isCheckingDecision ? (
          <span data-mbaas-oid="iapan33" className="inline-flex shrink-0 items-center gap-1 rounded-control border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-400">
            확인 중...
          </span>
        ) : decision.status === 'approved' ? (
          <StatusBadge tone="success" surface="dark" bordered icon={CheckCircle2} label="승인됨" />
        ) : decision.status === 'rejected' ? (
          <StatusBadge tone="danger" surface="dark" bordered icon={XCircle} label="반려됨" />
        ) : (
          <StatusBadge tone="pending" surface="dark" bordered icon={Clock3} label="승인 대기중" />
        )}
      </div>

      {item.content && (
        <p data-mbaas-oid="iapan22" className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
          {item.content}
        </p>
      )}

      {commentsError && (
        <div data-mbaas-oid="iapan35" className="mt-3 flex items-center gap-2">
          <p data-mbaas-oid="iapan36" className="text-xs font-medium text-rose-300">{commentsError}</p>
          <Button data-mbaas-oid="iapan37" type="button" variant="outline" tone="neutral" size="sm" onClick={() => void refetchComments()}>
            다시 시도
          </Button>
        </div>
      )}

      {submitError && (
        <p data-mbaas-oid="iapan38" role="alert" className="mt-3 text-xs font-medium text-rose-300">{submitError}</p>
      )}

      {!isCheckingDecision && (
        <div data-mbaas-oid="iapan23" className="mt-4 flex flex-wrap gap-2">
          {decision.status !== 'approved' && (
            <Button
              data-mbaas-oid="iapan24" type="button" size="sm" tone="brand"
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => void handleDecision('approved')}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              승인
            </Button>
          )}
          {decision.status !== 'rejected' && (
            <Button
              data-mbaas-oid="iapan25" type="button" size="sm" variant="outline" tone="danger"
              className="border-rose-400/50 text-rose-300 hover:bg-rose-500/100/10"
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => void handleDecision('rejected')}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              반려
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

// 주의: 이 패널은 프론트엔드 라우트 가드(`RequireUserType userType="organization"`)로만 접근을
// 제한한다. 동적 게시판 API 자체에는 "기관 소속 관리자만 처리 가능" 같은 조직 단위 권한 개념이
// 없어, 댓글 작성 API는 로그인한 프로젝트 소속 회원이면 누구나 호출할 수 있다(UI 레벨 제한).
export function InstructorApprovalPanel() {
  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const { data, isLoading, error, refetch } = useInstructorApplications({ limit: 100 })
  // 기본은 '대기중' — 관리자가 열자마자 처리할 건이 보이게 (v1.1)
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [showAllAffiliations, setShowAllAffiliations] = useState(false)

  const items = data?.items ?? []


  // 소속 기관이 설정되어 있지 않으면 필터링할 기준이 없으므로 전체 보기로 동작한다.
  const isScopedToMyAffiliation = Boolean(myAffiliation) && !showAllAffiliations

  const scopedItems = useMemo(() => {
    if (!isScopedToMyAffiliation) return items
    return items.filter(
      (item) => (parseAffiliationFromTitle(item.title) ?? parseAffiliationFromContent(item.content)) === myAffiliation,
    )
  }, [items, isScopedToMyAffiliation, myAffiliation])

  // v1.1 — 항목마다 댓글을 따로 조회하던 N+1 대신 배치 1회. 화면에 없는 페이지 항목의 상태도 정확히 센다.
  const scopedIds = useMemo(() => scopedItems.map((i) => i.id), [scopedItems])
  const { byPost, isLoading: isLoadingComments, refetch: refetchBatch } = useCommentsBatch(scopedIds)
  const { orgIds: panelOrgIds } = useAuthorizedOrgIds()
  const statusMap = useMemo(() => {
    const map: Record<string, ApprovalDecisionStatus> = {}
    for (const item of scopedItems) map[item.id] = resolveApprovalDecision(byPost[item.id] ?? [], panelOrgIds ?? EMPTY_ID_SET).status
    return map
  }, [scopedItems, byPost, panelOrgIds])

  const pendingCount = scopedItems.filter((item) => (statusMap[item.id] ?? 'pending') === 'pending').length
  const approvedCount = scopedItems.filter((item) => statusMap[item.id] === 'approved').length
  const rejectedCount = scopedItems.filter((item) => statusMap[item.id] === 'rejected').length

  const filtered = useMemo(() => {
    if (filter === 'all') return scopedItems
    return scopedItems.filter((item) => (statusMap[item.id] ?? 'pending') === filter)
  }, [scopedItems, filter, statusMap])

  return (
    <div data-mbaas-oid="iapan01" className="rounded-card border border-white/10 bg-navy p-6">
      <div data-mbaas-oid="iapan02" className="flex flex-wrap items-center justify-between gap-3">
        <div data-mbaas-oid="iapan03">
          <h3 data-mbaas-oid="iapan04" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <ShieldCheck className="h-4 w-4 text-sky" aria-hidden="true" />
            교관 승인 관리
          </h3>
          <p data-mbaas-dynamic="true" data-mbaas-oid="iapan05" className="mt-1 text-xs text-slate-400">
            {isScopedToMyAffiliation ? `내 소속(${myAffiliation}) ` : '전체 '}
            {scopedItems.length}건 · 대기중 {pendingCount}건 · 승인됨 {approvedCount}건 · 반려됨 {rejectedCount}건
          </p>
        </div>
        <div data-mbaas-oid="iapan06" className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => (
            <button
              data-mbaas-oid="iapan07" key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors
                ${filter === option.value ? 'bg-sky text-navy' : 'border border-white/15 text-slate-300 hover:border-white/30'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {myAffiliation ? (
        <label
          data-mbaas-oid="iapan40"
          className="mt-4 flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <input
            data-mbaas-oid="iapan41" type="checkbox"
            checked={showAllAffiliations}
            onChange={(e) => setShowAllAffiliations(e.target.checked)}
            className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          />
          전체 보기 (소속 무관)
        </label>
      ) : (
        <div data-mbaas-oid="iapan42" className="mt-4 flex items-start gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p data-mbaas-oid="iapan43" className="text-xs font-medium text-amber-300">
            소속 기관을 먼저 설정해주세요. 소속 기관이 없으면 전체 신청서가 표시됩니다.{' '}
            <Link
              data-mbaas-oid="iapan44" to="/account"
              className="font-semibold underline underline-offset-2 hover:text-amber-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              계정정보로 이동
            </Link>
          </p>
        </div>
      )}

      {isLoading ? (
        <p data-mbaas-oid="iapan09" className="mt-6 text-sm text-slate-400">신청 목록을 불러오는 중입니다...</p>
      ) : error ? (
        <div data-mbaas-oid="iapan10" role="alert" className="mt-6 rounded-control border border-rose-500/30 bg-rose-500/100/10 px-4 py-3">
          <p data-mbaas-oid="iapan11" className="text-xs font-medium text-rose-300">{error}</p>
          <Button data-mbaas-oid="iapan12" type="button" variant="outline" tone="neutral" size="sm" className="mt-3 border-white/25 text-white hover:bg-white/10" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          surface="dark"
          icon={ShieldCheck}
          title="해당하는 신청서가 없습니다"
          description="필터를 변경해 다른 상태의 신청서를 확인해 보세요."
        />
      ) : (
        <ul data-mbaas-oid="iapan14" className="mt-6 space-y-3">
          {filtered.map((item) => (
            <ApplicationRow key={item.id} item={item} comments={byPost[item.id] ?? []} isCheckingDecision={isLoadingComments || !panelOrgIds} onDecided={refetchBatch} />
          ))}
        </ul>
      )}
    </div>
  )

}
