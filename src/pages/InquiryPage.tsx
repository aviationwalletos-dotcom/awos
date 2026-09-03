// 문의하기 — 로그인 사용자는 문의를 남기고 답변을 확인, 비로그인은 메일 안내.
import { ChevronDown, Mail, MessageSquare, Send } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import { useAuth } from '../contexts/AuthContext'
import { useBoardPostDetail } from '../hooks/baas/useBoardPostDetail'
import { useComments } from '../hooks/baas/useComments'
import { useCreateInquiryPost } from '../hooks/baas/useCreateInquiryPost'
import { useInquiryBoardPosts } from '../hooks/baas/useInquiryBoardPosts'
import { buildInquiryTitle, parseInquiryTitle } from '../lib/inquiry'
import type { BoardPostListItem } from '../lib/baas/boardTypes'

const inputClass = `rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-400
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky`

function MyInquiryItem({ item }: { item: BoardPostListItem }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const { fetchDetail } = useBoardPostDetail()
  const { data: commentsData } = useComments(item.id, { enabled: open })
  const parsed = parseInquiryTitle(item.title)

  useEffect(() => {
    if (!open || content !== null) return
    void fetchDetail(item.id)
      .then((detail) => setContent(detail.content ?? ''))
      .catch(() => setContent('(내용을 불러오지 못했습니다)'))
  }, [open, content, fetchDetail, item.id])

  const replies = commentsData?.items ?? []

  return (
    <li data-mbaas-oid="inqmy0" className="rounded-card border border-white/10 bg-white/[0.03]">
      <button
        data-mbaas-oid="inqmy1" type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span data-mbaas-oid="inqmy2" className="min-w-0 truncate text-sm font-semibold text-ink">{parsed?.subject ?? item.title}</span>
        <span data-mbaas-oid="inqmy3" className="flex shrink-0 items-center gap-2">
          {open && replies.length > 0 && (
            <span data-mbaas-oid="inqmy4" className="rounded bg-go/15 px-1.5 py-0.5 text-[10px] font-bold text-go">답변 {replies.length}</span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div data-mbaas-oid="inqmy5" className="border-t border-white/10 px-4 py-3">
          <p data-mbaas-oid="inqmy6" className="whitespace-pre-wrap text-sm text-slate-300">{content ?? '불러오는 중…'}</p>
          {replies.length > 0 ? (
            <div data-mbaas-oid="inqmy7" className="mt-3 space-y-2">
              {replies.map((reply) => (
                <div data-mbaas-oid="inqmy8" key={reply.id} className="rounded-control border border-sky/25 bg-sky/5 px-3 py-2">
                  <p data-mbaas-oid="inqmy9" className="text-[10px] font-bold uppercase tracking-wide text-sky">관리자 답변</p>
                  <p data-mbaas-oid="inqmyA" className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{reply.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p data-mbaas-oid="inqmyB" className="mt-3 text-xs text-slate-500">아직 답변이 등록되지 않았어요. 확인 후 순차적으로 답변드릴게요.</p>
          )}
        </div>
      )}
    </li>
  )
}

export function InquiryPage() {
  const { account, isAuthenticated } = useAuth()
  const { createInquiryPost, isLoading: isSubmitting } = useCreateInquiryPost()
  const { refetch, isLoading: isLoadingList } = useInquiryBoardPosts({ enabled: false })

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [myItems, setMyItems] = useState<BoardPostListItem[]>([])

  const loadMine = useCallback(async () => {
    if (!account?.user_id) return
    const res = await refetch()
    setMyItems((res?.items ?? []).filter((item) => parseInquiryTitle(item.title)?.userId === account.user_id))
  }, [account?.user_id, refetch])

  useEffect(() => {
    if (isAuthenticated) void loadMine()
  }, [isAuthenticated, loadMine])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!subject.trim()) {
      setFormError('문의 제목을 입력해 주세요.')
      return
    }
    if (body.trim().length < 5) {
      setFormError('문의 내용을 5자 이상 입력해 주세요.')
      return
    }
    try {
      await createInquiryPost({
        title: buildInquiryTitle(subject.trim(), account?.name || '회원', account?.user_id || ''),
        content: body.trim(),
      })
      setSubject('')
      setBody('')
      setDone(true)
      void loadMine()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '문의 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div data-mbaas-oid="inqpg01" className="min-h-screen bg-surface font-body text-ink">
      <Nav data-mbaas-oid="inqpg02" />
      <main data-mbaas-oid="inqpg03" className="relative overflow-hidden py-[clamp(56px,8vw,96px)]">
        <div data-mbaas-oid="inqpg04" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(0,212,255,0.12),transparent_50%)]" />
        <div data-mbaas-oid="inqpg05" className="relative mx-auto max-w-2xl px-6">
          <span data-mbaas-oid="inqpg06" className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            문의하기
          </span>
          <h1 data-mbaas-oid="inqpg07" className="mt-5 font-display text-3xl font-extrabold tracking-tight">무엇을 도와드릴까요?</h1>
          <p data-mbaas-oid="inqpg08" className="mt-3 text-sm text-slate-400">
            서비스 이용, 기록·자격 인정, 오류 제보 등 무엇이든 남겨주세요. 관리자가 확인 후 이 페이지에서 답변드려요.
          </p>

          {!isAuthenticated ? (
            <div data-mbaas-oid="inqpg09" className="mt-8 rounded-card border border-white/10 bg-white/[0.04] p-6">
              <p data-mbaas-oid="inqpg10" className="text-sm text-slate-300">
                문의를 남기려면 <Link data-mbaas-oid="inqpg11" to="/login" className="font-semibold text-sky hover:underline">로그인</Link>이 필요해요.
                아직 회원이 아니거나 로그인이 어렵다면 이메일로 보내주세요.
              </p>
              <a
                data-mbaas-oid="inqpg12" href="mailto:awos.help@gmail.com?subject=[AWOS 문의]"
                className="mt-4 inline-flex items-center gap-2 rounded-control border border-sky/40 bg-sky/10 px-4 py-2.5 text-sm font-semibold text-sky transition hover:bg-sky/20"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                awos.help@gmail.com 으로 메일 보내기
              </a>
            </div>
          ) : (
            <>
              <form data-mbaas-oid="inqpg13" onSubmit={(e) => void handleSubmit(e)} className="mt-8 flex flex-col gap-4 rounded-card border border-white/10 bg-white/[0.04] p-6">
                <div data-mbaas-oid="inqpg14" className="flex flex-col gap-1.5">
                  <label data-mbaas-oid="inqpg15" htmlFor="inq-subject" className="text-xs font-semibold text-slate-300">제목</label>
                  <input
                    data-mbaas-oid="inqpg16" id="inq-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="예: 비행경력증명서 기록 인정 문의"
                    className={inputClass}
                  />
                </div>
                <div data-mbaas-oid="inqpg17" className="flex flex-col gap-1.5">
                  <label data-mbaas-oid="inqpg18" htmlFor="inq-body" className="text-xs font-semibold text-slate-300">내용</label>
                  <textarea
                    data-mbaas-oid="inqpg19" id="inq-body"
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="문의 내용을 자세히 적어주세요."
                    className={inputClass}
                  />
                </div>
                {formError && <p data-mbaas-oid="inqpg20" className="text-xs text-rose-400">{formError}</p>}
                {done && !formError && (
                  <p data-mbaas-oid="inqpg21" className="text-xs font-semibold text-go">문의가 접수됐어요! 답변이 등록되면 아래 내역에서 확인할 수 있어요.</p>
                )}
                <Button data-mbaas-oid="inqpg22" type="submit" size="lg" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  문의 보내기
                </Button>
              </form>

              <div data-mbaas-oid="inqpg23" className="mt-10">
                <h2 data-mbaas-oid="inqpg24" className="font-display text-lg font-extrabold">내 문의 내역</h2>
                {isLoadingList ? (
                  <p data-mbaas-oid="inqpg25" className="mt-3 text-sm text-slate-400">불러오는 중…</p>
                ) : myItems.length === 0 ? (
                  <p data-mbaas-oid="inqpg26" className="mt-3 text-sm text-slate-400">아직 남긴 문의가 없어요.</p>
                ) : (
                  <ul data-mbaas-oid="inqpg27" className="mt-3 space-y-2.5">
                    {myItems.map((item) => (
                      <MyInquiryItem key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer data-mbaas-oid="inqpg28" />
    </div>
  )
}
