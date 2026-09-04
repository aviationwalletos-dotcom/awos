import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Clock3, FileCheck2, Image as ImageIcon, Info, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useBoardPostDetail } from '../../hooks/baas/useBoardPostDetail'
import { useCommentsBatch } from '../../hooks/baas/useCommentsBatch'
import { useCreateComment } from '../../hooks/baas/useCreateComment'
import { useFlightExperienceCertificateBoardPosts } from '../../hooks/baas/useFlightExperienceCertificateBoardPosts'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import { EMPTY_ID_SET, useAuthorizedOrgIds } from '../../lib/baas/authorization'
import {
  buildApprovalCommentContent,
  buildRejectionCommentContent,
  parseAffiliationFromTitle,
  resolveApprovalDecision,
} from '../../lib/baas/instructorApproval'
import type { ApprovalDecisionStatus } from '../../lib/baas/instructorApproval'
import { createSignedBoardFileUrl } from '../../lib/baas/supabaseTransport'
import { clearAttachmentCache, getCachedAttachmentUrl, setCachedAttachmentUrl } from '../../lib/baas/approvalAttachmentCache'
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

interface RequestRowProps {
  item: BoardPostListItem
  /** 상위 배치 조회로 받은 이 게시글의 댓글 */
  comments: CommentItem[]
  isCheckingDecision: boolean
  /** 승인/반려 후 상위 배치 재조회 */
  onDecided: () => Promise<void> | void
}

// [BUG-004/BUG-006 교훈] 게시글 숨김 토글(`PATCH .../hidden`)은 작성자 본인 또는 실제 BaaS 프로젝트
// 소유자만 호출할 수 있어, 신청서 작성자가 아닌 기관 계정으로는 항상 403 FORBIDDEN이었다. "교관 승인"
// 게시판과 동일하게, 로그인한 회원이면 누구나(기관 계정 포함) 다른 사람의 게시글에 자신의 명의로
// 댓글을 작성할 수 있는 점을 이용해 승인/반려를 댓글로 표시한다. 첨부 사진은 목록 조회 API에는
// 포함되지 않으므로(attachments는 상세 조회 응답에만 있음), 카드별로 상세 조회를 한 번씩 수행한다.
function RequestRow({ item, comments, isCheckingDecision, onDecided }: RequestRowProps) {
  const { account } = useAuth()
  const commentsData = useMemo(() => ({ items: comments }), [comments])
  const commentsError: string | null = null
  const refetchComments = onDecided
  const { createComment, isLoading: isSubmitting, error: submitError, reset: resetSubmit } = useCreateComment(item.id)
  const { fetchDetail, isLoading: isLoadingDetail } = useBoardPostDetail()

  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  // [성능] 첨부는 카드가 보일 때가 아니라 "첨부 파일 보기"를 눌렀을 때만 불러온다.
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoLoaded, setPhotoLoaded] = useState(false)

  const { orgIds } = useAuthorizedOrgIds()
  const decision = useMemo(
    () => resolveApprovalDecision(commentsData?.items ?? [], orgIds ?? EMPTY_ID_SET),
    [commentsData, orgIds],
  )
  const affiliation = useMemo(() => parseAffiliationFromTitle(item.title), [item.title])


  useEffect(() => {
    if (!photoOpen) return
    const cached = getCachedAttachmentUrl(item.id)
    if (cached !== undefined) {
      setAttachmentUrl(cached)
      setPhotoLoaded(true)
      return
    }
    let cancelled = false
    setDetailError(null)
    void (async () => {
      try {
        const detail = await fetchDetail(item.id)
        if (cancelled) return
        const raw = detail.attachments[0]?.url ?? null
        // [SEC-003] 저장소가 비공개라 public URL은 열리지 않는다 — 만료형 서명 URL로 변환해 표시한다.
        const resolved = raw ? (await createSignedBoardFileUrl(raw)) ?? raw : null
        if (cancelled) return
        setCachedAttachmentUrl(item.id, resolved)
        setAttachmentUrl(resolved)
        setPhotoLoaded(true)
      } catch (err) {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : '첨부 사진을 불러오지 못했습니다.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [item.id, fetchDetail, photoOpen])

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
    <li className="rounded-control border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {item.author_name} · {formatDateTime(item.created_at)}
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold
              ${affiliation ? 'border-sky/30 bg-sky/10 text-sky' : 'border-white/15 text-slate-400'}`}
          >
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            {affiliation || '소속 미기재'}
          </span>
        </div>
        {isCheckingDecision ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-control border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-400">
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
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
          {item.content}
        </p>
      )}

      {!photoOpen && (
        <button type="button"
          onClick={() => setPhotoOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          첨부 파일 보기
        </button>
      )}
      {photoOpen && isLoadingDetail && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          첨부 사진을 불러오는 중입니다...
        </p>
      )}
      {photoOpen && photoLoaded && !detailError && attachmentUrl === null && (
        <p className="mt-3 text-xs text-slate-500">첨부된 파일이 없어요.</p>
      )}
      {detailError && (
        <p role="alert" className="mt-3 text-xs font-medium text-rose-300">{detailError}</p>
      )}
      {attachmentUrl && (
        /\.pdf(\?|$)/i.test(attachmentUrl) ? (
          <a href={attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-control border border-sky/40 bg-sky/10 px-3 py-2 text-sm font-semibold text-sky"
          >
            첨부 PDF 열기 ↗
          </a>
        ) : (
          <img src={attachmentUrl}
          alt="첨부된 비행경력증명서 사진"
          className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain"
        />
        )
      )}

      {commentsError && (
        <div className="mt-3 flex items-center gap-2">
          <p className="text-xs font-medium text-rose-300">{commentsError}</p>
          <Button type="button" variant="outline" tone="neutral" size="sm" onClick={() => void refetchComments()}>
            다시 시도
          </Button>
        </div>
      )}

      {submitError && (
        <p role="alert" className="mt-3 text-xs font-medium text-rose-300">{submitError}</p>
      )}

      {!isCheckingDecision && (
        <div className="mt-4 flex flex-wrap gap-2">
          {decision.status !== 'approved' && (
            <Button type="button" size="sm" tone="brand"
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => void handleDecision('approved')}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              승인
            </Button>
          )}
          {decision.status !== 'rejected' && (
            <Button type="button" size="sm" variant="outline" tone="danger"
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
export function FlightExperienceCertificateApprovalPanel() {
  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const { data, isLoading, error, refetch } = useFlightExperienceCertificateBoardPosts({ limit: 100 })
  // 기본은 '대기중' — 관리자가 열자마자 처리할 건이 보이게 (v1.1)
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [showAllAffiliations, setShowAllAffiliations] = useState(false)

  const items = data?.items ?? []


  // 소속 기관이 설정되어 있지 않으면 필터링할 기준이 없으므로 전체 보기로 동작한다.
  const isScopedToMyAffiliation = Boolean(myAffiliation) && !showAllAffiliations

  const scopedItems = useMemo(() => {
    if (!isScopedToMyAffiliation) return items
    return items.filter((item) => parseAffiliationFromTitle(item.title) === myAffiliation)
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
    <div className="rounded-card border border-white/10 bg-navy p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <FileCheck2 className="h-4 w-4 text-sky" aria-hidden="true" />
            비행경력증명서 승인 관리
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isScopedToMyAffiliation ? `내 소속(${myAffiliation}) ` : '전체 '}
            {scopedItems.length}건 · 대기중 {pendingCount}건 · 승인됨 {approvedCount}건 · 반려됨 {rejectedCount}건
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => (
            <button key={option.value}
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
          className="mt-4 flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <input type="checkbox"
            checked={showAllAffiliations}
            onChange={(e) => setShowAllAffiliations(e.target.checked)}
            className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          />
          전체 보기 (소속 무관)
        </label>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-xs font-medium text-amber-300">
            소속 기관을 먼저 설정해주세요. 소속 기관이 없으면 전체 인증 요청이 표시됩니다.{' '}
            <Link to="/account"
              className="font-semibold underline underline-offset-2 hover:text-amber-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              계정정보로 이동
            </Link>
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">인증 요청 목록을 불러오는 중입니다...</p>
      ) : error ? (
        <div role="alert" className="mt-6 rounded-control border border-rose-500/30 bg-rose-500/100/10 px-4 py-3">
          <p className="text-xs font-medium text-rose-300">{error}</p>
          <Button type="button" variant="outline" tone="neutral" size="sm" className="mt-3 border-white/25 text-white hover:bg-white/10" onClick={() => { clearAttachmentCache(); void refetch() }}>
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
        <ul className="mt-6 space-y-3">
          {filtered.map((item) => (
            <RequestRow key={item.id} item={item} comments={byPost[item.id] ?? []} isCheckingDecision={isLoadingComments || !panelOrgIds} onDecided={refetchBatch} />
          ))}
        </ul>
      )}
    </div>
  )

}
