import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Clock3, FileCheck2, Image as ImageIcon, Info, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useBoardPostDetail } from '../../hooks/baas/useBoardPostDetail'
import { useComments } from '../../hooks/baas/useComments'
import { useCreateComment } from '../../hooks/baas/useCreateComment'
import { useFlightExperienceCertificateBoardPosts } from '../../hooks/baas/useFlightExperienceCertificateBoardPosts'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import {
  buildApprovalCommentContent,
  buildRejectionCommentContent,
  parseAffiliationFromTitle,
  resolveApprovalDecision,
} from '../../lib/baas/instructorApproval'
import type { ApprovalDecisionStatus } from '../../lib/baas/instructorApproval'
import type { BoardPostListItem } from '../../lib/baas/boardTypes'

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

interface RequestRowProps {
  item: BoardPostListItem
  onStatusResolved: (postId: string, status: ApprovalDecisionStatus) => void
}

// [BUG-004/BUG-006 교훈] 게시글 숨김 토글(`PATCH .../hidden`)은 작성자 본인 또는 실제 BaaS 프로젝트
// 소유자만 호출할 수 있어, 신청서 작성자가 아닌 기관 계정으로는 항상 403 FORBIDDEN이었다. "교관 승인"
// 게시판과 동일하게, 로그인한 회원이면 누구나(기관 계정 포함) 다른 사람의 게시글에 자신의 명의로
// 댓글을 작성할 수 있는 점을 이용해 승인/반려를 댓글로 표시한다. 첨부 사진은 목록 조회 API에는
// 포함되지 않으므로(attachments는 상세 조회 응답에만 있음), 카드별로 상세 조회를 한 번씩 수행한다.
function RequestRow({ item, onStatusResolved }: RequestRowProps) {
  const { account } = useAuth()
  const { data: commentsData, isLoading: isCheckingDecision, error: commentsError, refetch: refetchComments } = useComments(item.id)
  const { createComment, isLoading: isSubmitting, error: submitError, reset: resetSubmit } = useCreateComment(item.id)
  const { fetchDetail, isLoading: isLoadingDetail } = useBoardPostDetail()

  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const decision = useMemo(() => resolveApprovalDecision(commentsData?.items ?? []), [commentsData])
  const affiliation = useMemo(() => parseAffiliationFromTitle(item.title), [item.title])

  useEffect(() => {
    if (!isCheckingDecision) onStatusResolved(item.id, decision.status)
  }, [item.id, decision.status, isCheckingDecision, onStatusResolved])

  useEffect(() => {
    let cancelled = false
    setDetailError(null)
    void (async () => {
      try {
        const detail = await fetchDetail(item.id)
        if (cancelled) return
        setAttachmentUrl(detail.attachments[0]?.url ?? null)
      } catch (err) {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : '첨부 사진을 불러오지 못했습니다.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [item.id, fetchDetail])

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
    <li data-mbaas-oid="c2b116x" className="rounded-control border border-white/10 bg-white/[0.04] p-4">
      <div data-mbaas-oid="n1w5v46" className="flex flex-wrap items-start justify-between gap-3">
        <div data-mbaas-oid="qppsyfa" className="min-w-0">
          <p data-mbaas-oid="xwjv935" className="text-sm font-semibold text-white">{item.title}</p>
          <p data-mbaas-oid="tu2wxyt" className="mt-1 text-xs text-slate-400">
            {item.author_name} · {formatDateTime(item.created_at)}
          </p>
          <span
            data-mbaas-oid="hja6eqq"
            className={`mt-2 inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold
              ${affiliation ? 'border-sky/30 bg-sky/10 text-sky' : 'border-white/15 text-slate-500'}`}
          >
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            {affiliation || '소속 미기재'}
          </span>
        </div>
        {isCheckingDecision ? (
          <span data-mbaas-oid="jljwfnr" className="inline-flex shrink-0 items-center gap-1 rounded-control border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-400">
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
        <p data-mbaas-oid="4a6q5l9" className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
          {item.content}
        </p>
      )}

      {isLoadingDetail && (
        <p data-mbaas-oid="5mm5r2d" className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          첨부 사진을 불러오는 중입니다...
        </p>
      )}
      {detailError && (
        <p data-mbaas-oid="18zo9zg" role="alert" className="mt-3 text-xs font-medium text-rose-300">{detailError}</p>
      )}
      {attachmentUrl && (
        <img
          data-mbaas-oid="c1ypqnp" src={attachmentUrl}
          alt="첨부된 비행경력증명서 사진"
          className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain"
        />
      )}

      {commentsError && (
        <div data-mbaas-oid="ni30ei7" className="mt-3 flex items-center gap-2">
          <p data-mbaas-oid="voyjk9e" className="text-xs font-medium text-rose-300">{commentsError}</p>
          <Button data-mbaas-oid="wb02u4m" type="button" variant="outline" tone="neutral" size="sm" onClick={() => void refetchComments()}>
            다시 시도
          </Button>
        </div>
      )}

      {submitError && (
        <p data-mbaas-oid="aruxeix" role="alert" className="mt-3 text-xs font-medium text-rose-300">{submitError}</p>
      )}

      {!isCheckingDecision && (
        <div data-mbaas-oid="a6i9wk5" className="mt-4 flex flex-wrap gap-2">
          {decision.status !== 'approved' && (
            <Button
              data-mbaas-oid="877hca3" type="button" size="sm" tone="brand"
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
              data-mbaas-oid="233hzas" type="button" size="sm" variant="outline" tone="danger"
              className="border-rose-400/50 text-rose-300 hover:bg-rose-500/10"
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
export function FlightExperienceCertificateApprovalPanel() {
  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const { data, isLoading, error, refetch } = useFlightExperienceCertificateBoardPosts({ limit: 100 })
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [showAllAffiliations, setShowAllAffiliations] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<string, ApprovalDecisionStatus>>({})

  const items = data?.items ?? []

  const handleStatusResolved = useCallback((postId: string, status: ApprovalDecisionStatus) => {
    setStatusMap((prev) => (prev[postId] === status ? prev : { ...prev, [postId]: status }))
  }, [])

  // 소속 기관이 설정되어 있지 않으면 필터링할 기준이 없으므로 전체 보기로 동작한다.
  const isScopedToMyAffiliation = Boolean(myAffiliation) && !showAllAffiliations

  const scopedItems = useMemo(() => {
    if (!isScopedToMyAffiliation) return items
    return items.filter((item) => parseAffiliationFromTitle(item.title) === myAffiliation)
  }, [items, isScopedToMyAffiliation, myAffiliation])

  const pendingCount = scopedItems.filter((item) => (statusMap[item.id] ?? 'pending') === 'pending').length
  const approvedCount = scopedItems.filter((item) => statusMap[item.id] === 'approved').length
  const rejectedCount = scopedItems.filter((item) => statusMap[item.id] === 'rejected').length

  const filtered = useMemo(() => {
    if (filter === 'all') return scopedItems
    return scopedItems.filter((item) => (statusMap[item.id] ?? 'pending') === filter)
  }, [scopedItems, filter, statusMap])

  return (
    <div data-mbaas-oid="l4x6f3l" className="rounded-card border border-slate-200 bg-navy p-6">
      <div data-mbaas-oid="bjnxobo" className="flex flex-wrap items-center justify-between gap-3">
        <div data-mbaas-oid="c4e4nbw">
          <h3 data-mbaas-oid="6817lbp" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <FileCheck2 className="h-4 w-4 text-sky" aria-hidden="true" />
            비행경력증명서 승인 관리
          </h3>
          <p data-mbaas-dynamic="true" data-mbaas-oid="s7dn11a" className="mt-1 text-xs text-slate-400">
            {isScopedToMyAffiliation ? `내 소속(${myAffiliation}) ` : '전체 '}
            {scopedItems.length}건 · 대기중 {pendingCount}건 · 승인됨 {approvedCount}건 · 반려됨 {rejectedCount}건
          </p>
        </div>
        <div data-mbaas-oid="6wcgyd3" className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => (
            <button
              data-mbaas-oid="thflggr" key={option.value}
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
          data-mbaas-oid="diizdsc"
          className="mt-4 flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <input
            data-mbaas-oid="dra6g4r" type="checkbox"
            checked={showAllAffiliations}
            onChange={(e) => setShowAllAffiliations(e.target.checked)}
            className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          />
          전체 보기 (소속 무관)
        </label>
      ) : (
        <div data-mbaas-oid="oln9pfb" className="mt-4 flex items-start gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p data-mbaas-oid="46m9jaz" className="text-xs font-medium text-amber-300">
            소속 기관을 먼저 설정해주세요. 소속 기관이 없으면 전체 인증 요청이 표시됩니다.{' '}
            <Link
              data-mbaas-oid="vutlbxc" to="/account"
              className="font-semibold underline underline-offset-2 hover:text-amber-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              계정정보로 이동
            </Link>
          </p>
        </div>
      )}

      {isLoading ? (
        <p data-mbaas-oid="jav9nhw" className="mt-6 text-sm text-slate-400">인증 요청 목록을 불러오는 중입니다...</p>
      ) : error ? (
        <div data-mbaas-oid="v5dhm63" role="alert" className="mt-6 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p data-mbaas-oid="z9ufl92" className="text-xs font-medium text-rose-300">{error}</p>
          <Button data-mbaas-oid="h8nfpfh" type="button" variant="outline" tone="neutral" size="sm" className="mt-3 border-white/25 text-white hover:bg-white/10" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          surface="dark"
          icon={FileCheck2}
          title="해당하는 인증 요청이 없습니다"
          description="필터를 변경해 다른 상태의 인증 요청을 확인해 보세요."
        />
      ) : (
        <ul data-mbaas-oid="3glw15b" className="mt-6 space-y-3">
          {filtered.map((item) => (
            <RequestRow key={item.id} item={item} onStatusResolved={handleStatusResolved} />
          ))}
        </ul>
      )}
    </div>
  )
}
