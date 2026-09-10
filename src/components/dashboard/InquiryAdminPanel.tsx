// 관리자 문의함 — 회원 문의 목록을 확인하고 답변을 남긴다(답변은 문의하기 페이지의 본인에게 표시).
import { ChevronDown, Inbox, Search } from 'lucide-react'
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
      .catch(() => setContent('(내용을 불러오지 못했어요)'))
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
      setSendError(err instanceof Error ? err.message : '답변 등록에 실패했어요.')
    }
  }

  const replies = commentsData?.items ?? []

  return (
    <li className="rounded-card border border-white/10 bg-navy">
      <button type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{parsed?.subject ?? item.title}</span>
          <span className="mt-0.5 block text-xs text-slate-400">
            {parsed?.userName ?? '회원'} · {formatDateTime(item.created_at)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {open && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${replies.length > 0 ? 'bg-go/15 text-go' : 'bg-amber-400/15 text-amber-300'}`}>
              {replies.length > 0 ? '답변 완료' : '답변 대기'}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="border-t border-white/10 px-4 py-4">
          <p className="whitespace-pre-wrap text-sm text-slate-300">{content ?? '불러오는 중…'}</p>
          {replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="rounded-control border border-sky/25 bg-sky/5 px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">{r.content}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <textarea rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="답변을 입력하세요 — 회원의 문의하기 페이지에 표시돼요."
              className="w-full rounded-control border border-white/15 bg-panel px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            />
            {sendError && <p className="mt-1.5 text-xs text-rose-300">{sendError}</p>}
            <div className="mt-2">
              <Button type="button" size="sm" onClick={() => void handleReply()} disabled={isSending} loading={isSending}>
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
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  useEffect(() => {
    void refetch().then((res) => {
      if (res) setItems(res.items.filter((item) => item.title.startsWith('[문의]')))
    })
  }, [refetch])

  if (isLoading && items.length === 0) {
    return <p className="text-sm text-slate-400">문의를 불러오는 중…</p>
  }
  if (error && items.length === 0) {
    return <p className="text-sm text-rose-300">{error}</p>
  }
  if (items.length === 0) {
    return <EmptyState icon={Inbox} title="접수된 문의가 없어요" description="회원이 문의하기 페이지에서 문의를 남기면 여기에 표시돼요." />
  }
  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter((it) => `${it.title} ${it.author_name ?? ''}`.toLowerCase().includes(q)) : items
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="제목·이름으로 검색" aria-label="문의 검색"
          className="w-full rounded-control border border-white/15 bg-navy py-2 pl-9 pr-3 text-sm text-ink placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky" />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">검색 결과가 없어요.</p>
      ) : (
        <ul className="space-y-3">
          {pageItems.map((item) => (
            <InquiryRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between text-xs text-slate-400" aria-label="페이지">
          <span>{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}건</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="rounded-control border border-white/15 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40">이전</button>
            <span className="px-2">{safePage} / {pageCount}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount} className="rounded-control border border-white/15 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40">다음</button>
          </div>
        </nav>
      )}
    </div>
  )
}
