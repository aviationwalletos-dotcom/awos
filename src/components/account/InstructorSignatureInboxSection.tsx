import { ChevronLeft, ChevronRight, Clock3, Inbox, RefreshCw, ShieldCheck } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
  buildSignedCommentContent,
  findSignedComment,
  parseSignatureImageUrlFromComment,
  parseTargetInstructorUserIdFromContent,
} from '../../lib/baas/signatureRequest'
import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { SignaturePad } from '../logbook/SignaturePad'
import { useComments } from '../../hooks/baas/useComments'
import { useCreateComment } from '../../hooks/baas/useCreateComment'
import { useSignatureRequests } from '../../hooks/baas/useSignatureRequests'
import { useUploadSignatureImage } from '../../hooks/baas/useUploadSignatureImage'

import type { AccountResponse } from '../../lib/baas/types'
import type { BoardPostListItem } from '../../lib/baas/boardTypes'

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

interface SignatureRequestCardProps {
  post: BoardPostListItem
  account: AccountResponse
  onStatusResolved: (postId: string, isSigned: boolean) => void
}

function SignatureRequestCard({ post, account, onStatusResolved }: SignatureRequestCardProps) {
  const { data: commentsData, isLoading: isCheckingComments, error: commentsError, refetch: refetchComments } = useComments(post.id)
  const { createComment, isLoading: isSigning, error: signError, reset: resetSign } = useCreateComment(post.id)
  const { uploadSignatureImage, isLoading: isUploading, error: uploadError, reset: resetUpload } = useUploadSignatureImage()

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

  const signedComment = useMemo(() => findSignedComment(commentsData?.items ?? []), [commentsData])
  const signedImageUrl = useMemo(
    () => (signedComment ? parseSignatureImageUrlFromComment(signedComment) : undefined),
    [signedComment],
  )

  useEffect(() => {
    if (!isCheckingComments) onStatusResolved(post.id, Boolean(signedComment))
  }, [post.id, signedComment, isCheckingComments, onStatusResolved])

  const isProcessing = isUploading || isSigning
  const error = uploadError || signError

  async function handleSign() {
    if (!signatureDataUrl) return
    resetUpload()
    resetSign()
    try {
      const imageUrl = await uploadSignatureImage(signatureDataUrl)
      await createComment(buildSignedCommentContent(account.name, new Date(), imageUrl))
      await refetchComments()
      setSignatureDataUrl(null)
    } catch {
      // uploadError/signError 상태로 화면에 안내됨. 서명은 저장하지 않으므로(캔버스는 그대로 남아있음)
      // 다시 "서명 완료" 버튼을 눌러 재시도할 수 있다.
    }
  }

  return (
    <div data-mbaas-dynamic="true" data-mbaas-oid="n9705t6" className="rounded-control border border-white/10 bg-navy px-4 py-4">
      <div data-mbaas-dynamic="true" data-mbaas-oid="cfkc49j" className="flex items-start justify-between gap-3">
        <div data-mbaas-oid="i6h2gb2">
          <p data-mbaas-dynamic="true" data-mbaas-oid="osdk24p" className="text-sm font-semibold text-white">{post.title}</p>
          <p data-mbaas-dynamic="true" data-mbaas-oid="44nrqpv" className="mt-0.5 font-mono-data text-xs tabular-nums text-slate-500">
            요청일: {formatDateTime(post.created_at)} · 요청자: {post.author_name}
          </p>
        </div>
        {signedComment ? (
          <StatusBadge tone="success" surface="dark" icon={ShieldCheck} label="완료됨" />
        ) : (
          <StatusBadge tone="pending" surface="dark" icon={Clock3} label="대기중" />
        )}
      </div>

      {post.content && (
        <p data-mbaas-dynamic="true" data-mbaas-oid="8az3qfg" className="mt-3 whitespace-pre-wrap rounded-control border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-300">
          {post.content}
        </p>
      )}

      <div data-mbaas-oid="6316nwp" className="mt-3">
        {isCheckingComments ? (
          <p data-mbaas-oid="gyn76p3" className="text-xs text-slate-500">서명 상태를 확인하는 중입니다...</p>
        ) : commentsError ? (
          <div data-mbaas-oid="hfsni3z" className="flex items-center gap-2">
            <p data-mbaas-oid="asmw4pc" className="text-xs font-medium text-rose-300">{commentsError}</p>
            <Button data-mbaas-oid="211u7f0" type="button" variant="outline" tone="neutral" size="sm" onClick={() => void refetchComments()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              다시 시도
            </Button>
          </div>
        ) : signedComment ? (
          <div data-mbaas-oid="98n32ca" className="space-y-2">
            {signedImageUrl && (
              <img
                data-mbaas-oid="98n32cb" src={signedImageUrl}
                alt={`${signedComment.author_name} 교관 서명 이미지`}
                className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-white object-contain"
              />
            )}
            <p data-mbaas-oid="98n32cv" className="font-mono-data text-xs tabular-nums text-slate-400">
              서명자: {signedComment.author_name} · {formatDateTime(signedComment.created_at)}
            </p>
          </div>
        ) : (
          <div data-mbaas-oid="vnz7ywy" className="space-y-3">
            <p data-mbaas-oid="hrn21bs" className="text-xs text-slate-400">
              아래 영역에 직접 서명한 뒤 "서명 완료"를 누르면 본인 명의로 서명이 등록됩니다.
            </p>
            <SignaturePad onChange={setSignatureDataUrl} disabled={isProcessing} />
            {error && <p data-mbaas-oid="rk1jzzb" className="text-xs font-medium text-rose-300">{error}</p>}
            <Button
              data-mbaas-oid="yujdw0z" type="button" size="sm" tone="brand"
              loading={isProcessing}
              disabled={!signatureDataUrl || isProcessing}
              onClick={handleSign}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {isUploading ? '서명 이미지 업로드 중...' : isSigning ? '서명 등록 중...' : '서명 완료'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const PAGE_SIZE = 5

type TabFilter = 'pending' | 'completed'

const TAB_OPTIONS: Array<{ value: TabFilter; label: string }> = [
  { value: 'pending', label: '대기중' },
  { value: 'completed', label: '완료됨' },
]

interface InstructorSignatureInboxSectionProps {
  account: AccountResponse
}

export function InstructorSignatureInboxSection({ account }: InstructorSignatureInboxSectionProps) {
  const { data, isLoading, error, refetch } = useSignatureRequests()
  const allItems = data?.items ?? []

  // 서명 요청 시 특정 교관 지정이 필수이므로, 정확히 본인이 지정된 요청만 보여준다.
  // 대상 지정이 없는 요청(과거 방식으로 생성된 요청 포함)은 더 이상 표시하지 않는다.
  const items = useMemo(
    () =>
      allItems.filter((post) => {
        const targetUserId = parseTargetInstructorUserIdFromContent(post.content)
        return targetUserId === account.user_id
      }),
    [allItems, account.user_id],
  )
  const hiddenByTargetingCount = allItems.length - items.length

  // 각 카드가 댓글 조회로 서명 여부를 확인하면 이 맵에 결과를 채운다.
  // true = 완료됨. 아직 값이 없으면 확인 중이거나 대기중인 것으로 간주한다.
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({})

  const handleStatusResolved = useCallback((postId: string, isSigned: boolean) => {
    setStatusMap((prev) => (prev[postId] === isSigned ? prev : { ...prev, [postId]: isSigned }))
  }, [])

  const [activeTab, setActiveTab] = useState<TabFilter>('pending')

  const pendingItems = useMemo(() => items.filter((item) => statusMap[item.id] !== true), [items, statusMap])
  const completedItems = useMemo(() => items.filter((item) => statusMap[item.id] === true), [items, statusMap])

  const filteredItems = activeTab === 'pending' ? pendingItems : completedItems

  // 클라이언트 사이드 페이지네이션 — 탭 필터링된 목록을 5개 단위로만 잘라 화면에 보여준다.
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))

  // 탭을 전환하면 항상 1페이지부터 다시 보여준다.
  useEffect(() => {
    setCurrentPage(0)
  }, [activeTab])

  // 필터링된 목록이 바뀌어(예: 서명 완료 처리 후 다른 탭으로 이동) 현재 페이지가 범위를 벗어나면 보정한다.
  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1))
    }
  }, [currentPage, totalPages])

  const pagedItems = useMemo(
    () => filteredItems.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filteredItems, currentPage],
  )

  return (
    <div data-mbaas-oid="n0q7rjx" className="rounded-card border border-white/10 bg-white/5 p-cardpad">
      <div data-mbaas-oid="ziti7d0" className="flex flex-wrap items-start justify-between gap-3">
        <div data-mbaas-oid="fzifob2">
          <h2 data-mbaas-oid="p2leuhg" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <Inbox className="h-4 w-4 text-sky" aria-hidden="true" />
            서명 요청함
          </h2>
          <p data-mbaas-oid="xz0gvgf" className="mt-1 text-xs text-slate-400">
            학생이 보낸 비행 기록 서명 요청 목록입니다. 내용을 확인한 뒤 직접 서명하고 "서명 완료"를 누르면 서명 이미지와 함께 본인 명의로 등록됩니다.
            실시간 알림은 제공되지 않으므로 새로운 요청이 있는지 이 화면에서 직접 확인해주세요.
            {hiddenByTargetingCount > 0 && ` (본인이 지정되지 않은 요청 ${hiddenByTargetingCount}건은 표시하지 않습니다.)`}
          </p>
        </div>
        <div data-mbaas-oid="os7q20r" className="flex flex-wrap gap-1.5">
          {TAB_OPTIONS.map((option) => (
            <button
              data-mbaas-oid="18g8jgc" key={option.value}
              type="button"
              onClick={() => setActiveTab(option.value)}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors
                ${activeTab === option.value ? 'bg-sky text-navy' : 'border border-white/15 text-slate-300 hover:border-white/30'}`}
            >
              {option.label} ({option.value === 'pending' ? pendingItems.length : completedItems.length})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p data-mbaas-oid="yqwskw9" className="mt-5 text-sm text-slate-400">서명 요청 목록을 불러오는 중입니다...</p>
      ) : error ? (
        <div data-mbaas-oid="k4ifgdz" role="alert" className="mt-5 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p data-mbaas-oid="im2d4zk" className="text-xs font-medium text-rose-300">{error}</p>
          <Button data-mbaas-oid="o4iaj7d" type="button" variant="outline" tone="neutral" size="sm" className="mt-3" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-5"
          surface="dark"
          icon={Inbox}
          title={allItems.length === 0 ? '아직 접수된 서명 요청이 없습니다' : '표시할 서명 요청이 없습니다'}
          description={
            allItems.length === 0
              ? '학생이 서명을 요청하면 이 목록에 표시됩니다.'
              : '본인이 지정된 서명 요청이 없어 지금 표시할 항목이 없습니다.'
          }
        />
      ) : filteredItems.length === 0 ? (
        <p data-mbaas-oid="2cdqidj" className="mt-5 text-sm text-slate-400">
          {activeTab === 'pending'
            ? '대기중인 서명 요청이 없습니다. 모두 완료되었습니다.'
            : '아직 완료된 서명 요청이 없습니다.'}
        </p>
      ) : (
        <div data-mbaas-oid="n88j9go" className="mt-5 space-y-3">
          {pagedItems.map((post) => (
            <SignatureRequestCard key={post.id} post={post} account={account} onStatusResolved={handleStatusResolved} />
          ))}

          {totalPages > 1 && (
            <div data-mbaas-oid="pg1n2o3" className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <Button
                data-mbaas-oid="pg1prev" type="button" variant="outline" tone="neutral" size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                이전
              </Button>
              <p data-mbaas-oid="k5y3d5s" className="font-mono-data text-xs tabular-nums text-slate-400">
                {currentPage + 1} / 총 {totalPages}페이지
              </p>
              <Button
                data-mbaas-oid="pg1next" type="button" variant="outline" tone="neutral" size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
              >
                다음
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
