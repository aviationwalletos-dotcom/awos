import { ChevronLeft, ChevronRight, Clock3, Inbox, ShieldCheck } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { EMPTY_ID_SET, useApprovedInstructorIdSet } from '../../lib/baas/authorization'
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
import { useCommentsBatch } from '../../hooks/baas/useCommentsBatch'
import { useSignedFileUrl } from '../../hooks/useSignedFileUrl'
import { useCreateComment } from '../../hooks/baas/useCreateComment'
import { useSignatureRequests } from '../../hooks/baas/useSignatureRequests'
import { useUploadSignatureImage } from '../../hooks/baas/useUploadSignatureImage'

import type { AccountResponse } from '../../lib/baas/types'
import type { BoardPostListItem, CommentItem } from '../../lib/baas/boardTypes'

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
  /** 상위에서 배치로 받아온 이 게시글의 댓글 */
  comments: CommentItem[]
  /** 승인 교관 id 집합(상위에서 1회 조회) */
  instructorIds: ReadonlySet<string> | null
  /** 서명 등록 후 상위 배치 재조회 */
  onSigned: () => Promise<void> | void
}

function SignatureRequestCard({ post, account, comments, instructorIds, onSigned }: SignatureRequestCardProps) {
  const { createComment, isLoading: isSigning, error: signError, reset: resetSign } = useCreateComment(post.id)
  const { uploadSignatureImage, isLoading: isUploading, error: uploadError, reset: resetUpload } = useUploadSignatureImage()

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

  // [SEC-001] 승인 교관 계정이 남긴 [SIGNED] 댓글만 유효 서명으로 인정한다.
  const [signedLocally, setSignedLocally] = useState(false)
  const signedComment = useMemo(() => findSignedComment(comments, instructorIds ?? EMPTY_ID_SET), [comments, instructorIds])
  const isSigned = Boolean(signedComment) || signedLocally
  const signedImageRawUrl = useMemo(
    () => (signedComment ? parseSignatureImageUrlFromComment(signedComment) : undefined),
    [signedComment],
  )
  // [SEC-003] 비공개 버킷 전환 후에도 서명 이미지를 볼 수 있도록 서명 URL로 해석한다.
  const signedImageUrl = useSignedFileUrl(signedImageRawUrl)


  const isProcessing = isUploading || isSigning
  const [localError, setLocalError] = useState<string | null>(null)
  const error = localError || signError
  void uploadError

  async function handleSign() {
    if (!signatureDataUrl) return
    resetUpload()
    resetSign()
    setLocalError(null)
    // 핵심 기능이므로 저장소 업로드가 실패하거나 15초 안에 끝나지 않으면 서명 이미지를 댓글에 직접(data URL) 담아 진행한다.
    // 학생 화면은 data: URL을 그대로 표시하므로 두 경로 모두 정상 동작한다.
    let imageUrl: string = signatureDataUrl
    try {
      const uploaded = await Promise.race<string>([
        uploadSignatureImage(signatureDataUrl),
        new Promise<string>((_, reject) => window.setTimeout(() => reject(new Error('업로드 시간 초과')), 15000)),
      ])
      if (uploaded) imageUrl = uploaded
    } catch (err) {
      console.warn('[서명] 이미지 저장소 업로드 실패 → 인라인 저장으로 진행', err)
      resetUpload()
    }
    try {
      await Promise.race([
        createComment(buildSignedCommentContent(account.name, new Date(), imageUrl)),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('서버 응답 시간 초과(20초)')), 20000)),
      ])
      setSignedLocally(true)
      setSignatureDataUrl(null)
      await onSigned()
    } catch (err) {
      const message = err instanceof Error ? err.message : '서명 등록에 실패했습니다.'
      setLocalError(`서명 등록 실패: ${message}. 네트워크를 확인한 뒤 다시 눌러 주세요.`)
      console.error('[서명] 댓글 등록 실패', err)
    }
  }

  return (
    <div data-mbaas-dynamic="true" data-mbaas-oid="n9705t6" className="rounded-control border border-white/10 bg-navy px-4 py-4">
      <div data-mbaas-dynamic="true" data-mbaas-oid="cfkc49j" className="flex items-start justify-between gap-3">
        <div data-mbaas-oid="i6h2gb2">
          <p data-mbaas-dynamic="true" data-mbaas-oid="osdk24p" className="text-sm font-semibold text-white">{post.title}</p>
          <p data-mbaas-dynamic="true" data-mbaas-oid="44nrqpv" className="mt-0.5 font-mono-data text-xs tabular-nums text-slate-400">
            요청일: {formatDateTime(post.created_at)} · 요청자: {post.author_name}
          </p>
        </div>
        {isSigned ? (
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
        {isSigned ? (
          <div data-mbaas-oid="98n32ca" className="space-y-2">
            {signedImageUrl && (
              <img
                data-mbaas-oid="98n32cb" src={signedImageUrl}
                alt="교관 서명 이미지"
                className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-white object-contain p-1"
              />
            )}
            <p data-mbaas-oid="98n32cv" className="font-mono-data text-xs tabular-nums text-slate-400">
              {signedComment ? `서명자: ${signedComment.author_name} · ${formatDateTime(signedComment.created_at)}` : `서명자: ${account.name} · 방금 등록됨`}
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
  /** 서명 교관 본인의 제125조 조종교육 비행경험 충족 여부(미충족이면 제77조②나목 증명 자격 경고) */
  instructorCurrencyMet?: boolean
}

export function InstructorSignatureInboxSection({ account, instructorCurrencyMet = true }: InstructorSignatureInboxSectionProps) {
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

  // v1.1 — 서명 완료는 되돌아가지 않으므로 "완료됨"으로 확인된 요청 id를 이 브라우저에 기억한다.
  //  · 열자마자 기억된 것은 바로 완료됨에 두고(대기중 → 완료됨으로 튀는 현상 제거)
  //  · 댓글 배치 조회는 아직 완료로 기억되지 않은 요청만 대상으로 한다(요청 수가 쌓여도 조회 크기는 대기 건수만큼)
  const doneKey = `awos_signed_done:${account.id}`
  const [knownDone, setKnownDone] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(doneKey)
      return new Set(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set()
    }
  })
  const rememberDone = (ids: string[]) => {
    if (ids.length === 0) return
    setKnownDone((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      try {
        window.localStorage.setItem(doneKey, JSON.stringify([...next]))
      } catch {
        // 무시
      }
      return next
    })
  }
  const pendingIds = useMemo(() => items.filter((i) => !knownDone.has(i.id)).map((i) => i.id), [items, knownDone])
  const { byPost, isLoading: isLoadingComments, refetch: refetchBatch } = useCommentsBatch(pendingIds)
  const { instructorIds } = useApprovedInstructorIdSet()
  const hasResolvedOnce = !isLoadingComments && instructorIds !== null
  const statusMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const item of items) {
      map[item.id] = knownDone.has(item.id) || Boolean(findSignedComment(byPost[item.id] ?? [], instructorIds ?? EMPTY_ID_SET))
    }
    return map
  }, [items, byPost, instructorIds, knownDone])
  // 배치 결과로 완료 확인된 것은 기억해 둔다 → 다음 로드부터 조회 대상에서 빠진다
  useEffect(() => {
    if (!hasResolvedOnce) return
    const newlyDone = items.filter((i) => !knownDone.has(i.id) && statusMap[i.id]).map((i) => i.id)
    rememberDone(newlyDone)
  }, [hasResolvedOnce, statusMap])
  const handleSigned = async (postId: string) => {
    rememberDone([postId])
    await refetchBatch()
  }

  const [activeTab, setActiveTab] = useState<TabFilter>('pending')
  // 날짜 필터 — 제목의 비행 일자([서명요청] 2026-09-03 …) 기준
  const [dateFilter, setDateFilter] = useState('')
  const flightDateOf = (post: BoardPostListItem) => /(\d{4}-\d{2}-\d{2})/.exec(post.title)?.[1] ?? post.created_at.slice(0, 10)

  const pendingItems = useMemo(() => items.filter((item) => statusMap[item.id] !== true), [items, statusMap])
  const completedItems = useMemo(() => items.filter((item) => statusMap[item.id] === true), [items, statusMap])

  const filteredItems = useMemo(() => {
    const base = activeTab === 'pending' ? pendingItems : completedItems
    return dateFilter ? base.filter((p) => flightDateOf(p) === dateFilter) : base
  }, [activeTab, pendingItems, completedItems, dateFilter])

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
      {!instructorCurrencyMet && (
        <p data-mbaas-oid="sgncurwarn" className="mb-3 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          내 조종교육 비행경험(시행규칙 제125조: 최근 1년 10시간)이 미달이에요. 시행규칙 제77조②나목은 "제125조 경험이 있는 조종교관"의 증명을 인정하므로, 지금 서명한 경력은 응시용 증명으로 인정되지 않을 수 있어요. 커런시 탭에서 확인하세요.
        </p>
      )}
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
              {option.label} ({hasResolvedOnce || pendingIds.length === 0 ? (option.value === 'pending' ? pendingItems.length : completedItems.length) : '…'})
            </button>
          ))}
          <span className="self-center text-xs text-slate-400">비행 일자</span>
          <input
            data-mbaas-oid="sgdate"
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(0) }}
            aria-label="비행 일자로 필터"
            className="rounded-control border border-white/15 bg-panel px-2.5 py-1.5 text-xs text-ink"
          />
          {dateFilter && (
            <button type="button" onClick={() => setDateFilter('')} className="text-xs text-slate-400 underline hover:text-sky">전체</button>
          )}
          {isLoadingComments && <span className="self-center text-[11px] text-slate-500">확인 중…</span>}
        </div>
      </div>

      {isLoading ? (
        <p data-mbaas-oid="yqwskw9" className="mt-5 text-sm text-slate-400">서명 요청 목록을 불러오는 중입니다...</p>
      ) : error ? (
        <div data-mbaas-oid="k4ifgdz" role="alert" className="mt-5 rounded-control border border-rose-500/30 bg-rose-500/100/10 px-4 py-3">
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
      ) : !hasResolvedOnce && pendingIds.length > 0 && activeTab === 'pending' ? (
        <p data-mbaas-oid="sgchk" className="mt-5 text-sm text-slate-400">서명 상태 확인 중…</p>
      ) : filteredItems.length === 0 ? (
        <p data-mbaas-oid="2cdqidj" className="mt-5 text-sm text-slate-400">
          {activeTab === 'pending'
            ? '대기중인 서명 요청이 없습니다. 모두 완료되었습니다.'
            : '아직 완료된 서명 요청이 없습니다.'}
        </p>
      ) : (
        <div data-mbaas-oid="n88j9go" className="mt-5 space-y-3">
          {pagedItems.map((post) => (
            <SignatureRequestCard
              key={post.id}
              post={post}
              account={account}
              comments={byPost[post.id] ?? []}
              instructorIds={instructorIds}
              onSigned={() => handleSigned(post.id)}
            />
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
