// 관리자 문의함 — 회원 문의 목록을 확인하고 답변을 남긴다(답변은 문의하기 페이지의 본인에게 표시).
import { ChevronDown, Inbox } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { useBoardPostDetail } from '../../hooks/baas/useBoardPostDetail'
import { useComments } from '../../hooks/baas/useComments'
import { useCreateComment } from '../../hooks/baas/useCreateComment'
import { useInquiryBoardPosts } from '../../hooks/baas/useInquiryBoardPosts'
import { parseInquiryTitle } from '../../lib/inquiry'
import type { BoardPostListItem } from '../../lib/baas/boardTypes'

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

function InquiryRow({ item }: { item: BoardPostListItem }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const { fetchDetail } = useBoardPostDetail()
  const { data: commentsData, refetch: refetchComments } = useComments(item.id, { enabled: open })
  const { createComment, isLoading: isSending } = useCreateComment(item.id)
  const parsed = parseInquiryTitle(item.title)

  useEffect(() => {
    if (!open || content !== null) return
    void fetchDetail(item.id)
      .then((detail) => setContent(detail.content ?? ''))
      .catch(() => setContent('(내용을 불러오지 못했습니다)'))
  }, [open, content, fetchDetail, item.id])

  async function handleReply() {
    setSendError(null)
    if (reply.trim().length < 2) {
      setSendError('답변 내용을 입력해 주세요.')
      return
    }
    try {
      await createComment(reply.trim())
      setReply('')
      await refetchComments()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : '답변 등록에 실패했습니다.')
    }
  }

  const replies = commentsData?.items ?? []

  return (
    <li data-mbaas-oid="inqadm0" className="rounded-card border border-white/10 bg-navy">
      <button
        data-mbaas-oid="inqadm1" type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span data-mbaas-oid="inqadm2" className="min-w-0">
          <span data-mbaas-oid="inqadm3" className="block truncate text-sm font-semibold text-ink">{parsed?.subject ?? item.title}</span>
          <span data-mbaas-oid="inqadm4" className="mt-0.5 block text-xs text-slate-400">
            {parsed?.userName ?? '회원'} · {formatDateTime(item.created_at)}
          </span>
        </span>
        <span data-mbaas-oid="inqadm5" className="flex shrink-0 items-center gap-2">
          {open && (
            <span data-mbaas-oid="inqadm6" className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${replies.length > 0 ? 'bg-go/15 text-go' : 'bg-amber-400/15 text-amber-300'}`}>
              {replies.length > 0 ? '답변 완료' : '답변 대기'}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div data-mbaas-oid="inqadm7" className="border-t border-white/10 px-4 py-4">
          <p data-mbaas-oid="inqadm8" className="whitespace-pre-wrap text-sm text-slate-300">{content ?? '불러오는 중…'}</p>
          {replies.length > 0 && (
            <div data-mbaas-oid="inqadm9" className="mt-3 space-y-2">
              {replies.map((r) => (
                <div data-mbaas-oid="inqadmA" key={r.id} className="rounded-control border border-sky/25 bg-sky/5 px-3 py-2">
                  <p data-mbaas-oid="inqadmB" className="whitespace-pre-wrap text-sm text-slate-200">{r.content}</p>
                </div>
              ))}
            </div>
          )}
          <div data-mbaas-oid="inqadmC" className="mt-4">
            <textarea
              data-mbaas-oid="inqadmD" rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="답변을 입력하세요 — 회원의 문의하기 페이지에 표시됩니다."
              className="w-full rounded-control border border-white/15 bg-panel px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            />
            {sendError && <p data-mbaas-oid="inqadmE" className="mt-1.5 text-xs text-rose-300">{sendError}</p>}
            <div data-mbaas-oid="inqadmF" className="mt-2">
              <Button data-mbaas-oid="inqadmG" type="button" size="sm" onClick={() => void handleReply()} disabled={isSending} loading={isSending}>
                답변 등록
              </Button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

export function InquiryAdminPanel() {
  const { refetch, isLoading, error } = useInquiryBoardPosts({ enabled: false })
  const [items, setItems] = useState<BoardPostListItem[]>([])

  useEffect(() => {
    void refetch().then((res) => {
      if (res) setItems(res.items.filter((item) => item.title.startsWith('[문의]')))
    })
  }, [refetch])

  if (isLoading && items.length === 0) {
    return <p data-mbaas-oid="inqadmL" className="text-sm text-slate-400">문의를 불러오는 중…</p>
  }
  if (error && items.length === 0) {
    return <p data-mbaas-oid="inqadmM" className="text-sm text-rose-300">{error}</p>
  }
  if (items.length === 0) {
    return <EmptyState data-mbaas-oid="inqadmN" icon={Inbox} title="접수된 문의가 없습니다" description="회원이 문의하기 페이지에서 문의를 남기면 여기에 표시돼요." />
  }
  return (
    <ul data-mbaas-oid="inqadmO" className="space-y-3">
      {items.map((item) => (
        <InquiryRow key={item.id} item={item} />
      ))}
    </ul>
  )
}
