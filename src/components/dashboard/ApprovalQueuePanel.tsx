// 관리자 승인 큐 — approval_requests(schema12) 공용 패널.
// 교관 승인 / 자격증·신체검사 인증 / 비행경력증명서 승인 탭이 이 컴포넌트를 kind 만 바꿔 쓴다.
//
// 부채 3단계에서 바뀐 것
//  - 상태는 서버 status 컬럼으로 필터한다(기본 '대기중'). 댓글 파싱·배치 조회 없음.
//  - 첨부 사진은 "첨부 보기"를 눌렀을 때만 서명 URL 을 발급한다.
//  - 판정은 decide_approval_request RPC. 판정 뒤에는 바꿀 수 없다(불변) — 버튼도 사라진다.

import { AlertTriangle, Building2, CheckCircle2, Clock3, Image as ImageIcon, Info, type LucideIcon, XCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import { decideApprovalRequest } from '../../lib/approvals/api'
import { useApprovalRequests } from '../../lib/approvals/hooks'
import { type ApprovalKind, type ApprovalRequest, type ApprovalStatus, TRACK_LABEL } from '../../lib/approvals/types'
import { clearAttachmentCache, getCachedAttachmentUrl, setCachedAttachmentUrl } from '../../lib/baas/approvalAttachmentCache'
import { createSignedBoardFileUrl } from '../../lib/baas/supabaseTransport'

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

const FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'pending', label: '대기중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'all', label: '전체' },
]

function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

interface RowProps {
  item: ApprovalRequest
  showAttachment: boolean
  onDecided: () => Promise<unknown> | void
  renderExtra?: (item: ApprovalRequest) => React.ReactNode
}

function RequestRow({ item, showAttachment, onDecided, renderExtra }: RowProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState('')

  // 첨부: 눌렀을 때만
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  useEffect(() => {
    if (!photoOpen || !item.attachment_path) return
    const cached = getCachedAttachmentUrl(item.id)
    if (cached !== undefined) {
      setPhotoUrl(cached)
      setPhotoLoaded(true)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const url = (await createSignedBoardFileUrl(item.attachment_path!)) ?? item.attachment_path
        if (cancelled) return
        setCachedAttachmentUrl(item.id, url)
        setPhotoUrl(url)
        setPhotoLoaded(true)
      } catch (err) {
        if (!cancelled) setPhotoError(err instanceof Error ? err.message : '첨부를 불러오지 못했습니다.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [photoOpen, item.id, item.attachment_path])

  async function decide(decision: 'approved' | 'rejected') {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await decideApprovalRequest(item.id, decision, { note: decision === 'rejected' ? note.trim() || undefined : undefined })
      setRejectOpen(false)
      setNote('')
      await onDecided()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '처리에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <li className="rounded-control border border-white/10 bg-white/[0.04] p-4" data-testid="approval-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {item.requester_name}
            {item.requester_email ? ` (${item.requester_email})` : ''} · {formatDateTime(item.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold
                ${item.affiliation ? 'border-sky/30 bg-sky/10 text-sky' : 'border-white/15 text-slate-400'}`}
            >
              <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              {item.affiliation || '소속 미기재'}
            </span>
            {item.track && (
              <span className="inline-flex items-center rounded-control border border-white/15 px-2 py-0.5 text-xs font-semibold text-slate-300">
                {TRACK_LABEL[item.track]}
              </span>
            )}
          </div>
        </div>
        {item.status === 'approved' ? (
          <StatusBadge tone="success" surface="dark" bordered icon={CheckCircle2} label="승인됨" />
        ) : item.status === 'rejected' ? (
          <StatusBadge tone="danger" surface="dark" bordered icon={XCircle} label="반려됨" />
        ) : item.status === 'cancelled' ? (
          <StatusBadge tone="neutral" surface="dark" bordered icon={XCircle} label="취소됨" />
        ) : (
          <StatusBadge tone="pending" surface="dark" bordered icon={Clock3} label="승인 대기중" />
        )}
      </div>

      {item.summary && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{item.summary}</p>}
      {renderExtra?.(item)}

      {showAttachment && item.attachment_path && !photoOpen && (
        <button type="button"
          onClick={() => setPhotoOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          첨부 보기
        </button>
      )}
      {showAttachment && !item.attachment_path && <p className="mt-3 text-xs text-slate-500">첨부된 파일이 없어요.</p>}
      {photoOpen && !photoLoaded && !photoError && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          첨부를 불러오는 중입니다...
        </p>
      )}
      {photoError && <p role="alert" className="mt-3 text-xs font-medium text-rose-300">{photoError}</p>}
      {photoUrl && (
        /\.pdf(\?|$)/i.test(photoUrl) ? (
          <a href={photoUrl} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-sky/40 bg-sky/10 px-3 py-2 text-sm font-semibold text-sky"
          >
            첨부 PDF 열기 ↗
          </a>
        ) : (
          <img src={photoUrl} alt="첨부 사진" className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain" />
        )
      )}

      {item.status !== 'pending' && item.decided_at && (
        <p className="mt-3 font-mono-data text-xs tabular-nums text-slate-400">
          처리자: {item.decided_by_name || '관리자'} · {formatDateTime(item.decided_at)}
          {item.decision_note ? ` · 사유: ${item.decision_note}` : ''}
        </p>
      )}

      {submitError && <p role="alert" className="mt-3 text-xs font-medium text-rose-300">{submitError}</p>}

      {item.status === 'pending' && (
        <div className="mt-4">
          {rejectOpen ? (
            <div className="rounded-control border border-rose-400/30 bg-rose-500/5 p-3">
              <label htmlFor={`reject-note-${item.id}`} className="text-xs font-semibold text-slate-300">반려 사유(선택)</label>
              <input id={`reject-note-${item.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 사진이 흐려서 확인이 어려워요"
                className="mt-1.5 w-full rounded-control border border-white/15 bg-navy px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" tone="danger" loading={isSubmitting} disabled={isSubmitting} onClick={() => void decide('rejected')}
                  data-testid="approval-reject-confirm"
                >
                  반려 확정
                </Button>
                <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setRejectOpen(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" tone="brand" loading={isSubmitting} disabled={isSubmitting} onClick={() => void decide('approved')}
                data-testid="approval-approve"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                승인
              </Button>
              <Button type="button" size="sm" variant="outline" tone="danger"
                className="border-rose-400/50 text-rose-300"
                disabled={isSubmitting}
                onClick={() => setRejectOpen(true)}
                data-testid="approval-reject"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                반려
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export interface ApprovalQueuePanelProps {
  kinds: ApprovalKind[]
  title: string
  description: string
  icon: LucideIcon
  emptyTitle: string
  /** 첨부 보기 버튼 노출(자격증·증명서) */
  showAttachment?: boolean
  /** 카드 아래에 종류별 추가 정보를 그린다 */
  renderExtra?: (item: ApprovalRequest) => React.ReactNode
  /** 목록 중 일부만 보여줄 때(예: 자격증/신체검사 카테고리 칩) */
  filterItems?: (item: ApprovalRequest) => boolean
}

export function ApprovalQueuePanel({ kinds, title, description, icon: Icon, emptyTitle, showAttachment = false, renderExtra, filterItems }: ApprovalQueuePanelProps) {
  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [showAllAffiliations, setShowAllAffiliations] = useState(false)

  const status: ApprovalStatus | ApprovalStatus[] | undefined =
    filter === 'all' ? ['pending', 'approved', 'rejected'] : filter
  const { data, isLoading, error, refetch } = useApprovalRequests({ scope: 'admin', kind: kinds, status, limit: 200 })

  const isScopedToMyAffiliation = Boolean(myAffiliation) && !showAllAffiliations
  const items = useMemo(() => {
    let list = data ?? []
    if (filterItems) list = list.filter(filterItems)
    if (isScopedToMyAffiliation) list = list.filter((it) => (it.affiliation ?? '').trim() === (myAffiliation ?? '').trim())
    return list
  }, [data, filterItems, isScopedToMyAffiliation, myAffiliation])

  async function handleDecided() {
    clearAttachmentCache()
    await refetch()
  }

  return (
    <div className="rounded-card border border-white/10 bg-navy p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <Icon className="h-4 w-4 text-sky" aria-hidden="true" />
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isScopedToMyAffiliation ? `내 소속(${myAffiliation}) ` : '전체 '}
            {FILTER_OPTIONS.find((o) => o.value === filter)?.label} {isLoading ? '…' : `${items.length}건`}
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
      <p className="mt-2 text-xs text-slate-500">{description}</p>

      {myAffiliation ? (
        <label className="mt-4 flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300">
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
            소속 기관을 먼저 설정해주세요. 소속 기관이 없으면 전체 요청이 표시됩니다.{' '}
            <Link to="/account" className="rounded font-semibold underline underline-offset-2 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky">
              계정정보로 이동
            </Link>
          </p>
        </div>
      )}

      {error && data && (
        <p role="status" className="mt-4 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          목록을 새로 읽지 못했어요({error}). 마지막으로 받은 목록을 보여주고 있어요.{' '}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => void handleDecided()}>다시 시도</button>
        </p>
      )}
      {isLoading && !data ? (
        <p className="mt-6 text-sm text-slate-400">목록을 불러오는 중입니다...</p>
      ) : error && !data ? (
        <div role="alert" className="mt-6 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-medium text-rose-300">{error}</p>
          <Button type="button" variant="outline" tone="neutral" size="sm" className="mt-3 border-white/25 text-white hover:bg-white/10" onClick={() => void handleDecided()}>
            다시 시도
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="mt-6" surface="dark" icon={Icon} title={emptyTitle} description="필터를 변경해 다른 상태의 요청을 확인해 보세요." />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <RequestRow key={item.id} item={item} showAttachment={showAttachment} onDecided={handleDecided} renderExtra={renderExtra} />
          ))}
        </ul>
      )}
    </div>
  )
}
