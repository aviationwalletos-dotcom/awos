// 교관 서명 요청함 — approval_requests(schema12) 기준.
// 부채 3단계: "서명 요청 게시판 전체 + 댓글 배치 + 승인 교관 집합 대조" → target_id=나 인 행만 서버에서 받는다.
// 서명 = 손그림 이미지를 업로드한 뒤 decide_approval_request('approved', signature_path). 되돌릴 수 없다.

import { AlertTriangle, ChevronLeft, ChevronRight, Clock3, Inbox, ShieldCheck, XCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { useToast } from '../Toast'
import { SignaturePad } from '../logbook/SignaturePad'
import { useSignedFileUrl } from '../../hooks/useSignedFileUrl'
import { useUploadSignatureImage } from '../../hooks/baas/useUploadSignatureImage'
import { decideApprovalRequest } from '../../lib/approvals/api'
import { useApprovalRequests } from '../../lib/approvals/hooks'
import { SIGNED_FIELD_LABEL, snapshotFromPayload } from '../../lib/approvals/snapshot'
import { type ApprovalRequest, type PilotTrack, TRACK_LABEL } from '../../lib/approvals/types'
import type { AccountResponse } from '../../lib/baas/types'
import { InfoTip } from '../InfoTip'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

interface SignatureRequestCardProps {
  request: ApprovalRequest
  account: AccountResponse
  /** 서명/반려 후 상위 목록 재조회 + 안내 */
  onDecided: (outcome: 'signed' | 'rejected') => Promise<unknown> | void
}

function SignatureRequestCard({ request, account, onDecided }: SignatureRequestCardProps) {
  const { uploadSignatureImage, isLoading: isUploading, reset: resetUpload } = useUploadSignatureImage()
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isDeciding, setIsDeciding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const isSigned = request.status === 'approved'
  const isRejected = request.status === 'rejected'
  // [SEC-003] 비공개 버킷 전환 후에도 서명 이미지를 볼 수 있도록 서명 URL로 해석한다.
  const signedImageUrl = useSignedFileUrl(request.signature_path ?? undefined)
  const isProcessing = isUploading || isDeciding

  async function handleSign() {
    if (!signatureDataUrl) return
    resetUpload()
    setError(null)
    setIsDeciding(true)
    // 저장소 업로드가 실패하거나 8초 안에 끝나지 않으면 data URL 을 그대로 서명 경로로 쓴다(핵심 기능 보호).
    // (E2E에서 업로드가 15초 제한까지 걸려 서명 완료가 26초 걸렸다 — 이미지는 작아서 인라인 저장으로 충분하다)
    let imageUrl: string = signatureDataUrl
    try {
      const uploaded = await Promise.race<string>([
        uploadSignatureImage(signatureDataUrl),
        new Promise<string>((_, reject) => window.setTimeout(() => reject(new Error('업로드 시간 초과')), 8000)),
      ])
      if (uploaded) imageUrl = uploaded
    } catch (err) {
      console.warn('[서명] 이미지 저장소 업로드 실패 → 인라인 저장으로 진행', err)
      resetUpload()
    }
    try {
      await decideApprovalRequest(request.id, 'approved', { signaturePath: imageUrl })
      setSignatureDataUrl(null)
      await onDecided('signed')
    } catch (err) {
      const message = err instanceof Error ? err.message : '서명 등록에 실패했습니다.'
      setError(`서명 등록 실패: ${message}`)
    } finally {
      setIsDeciding(false)
    }
  }

  async function handleReject() {
    setError(null)
    setIsDeciding(true)
    try {
      await decideApprovalRequest(request.id, 'rejected', { note: rejectNote.trim() || undefined })
      setRejectOpen(false)
      await onDecided('rejected')
    } catch (err) {
      setError(err instanceof Error ? err.message : '반려에 실패했습니다.')
    } finally {
      setIsDeciding(false)
    }
  }

  return (
    <div className="rounded-control border border-white/10 bg-navy px-4 py-4" data-testid="signature-request-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{request.title}</p>
          <p className="mt-0.5 font-mono-data text-xs tabular-nums text-slate-400">
            요청일: {formatDateTime(request.created_at)} · 요청자: {request.requester_name}
          </p>
          {request.track && (
            <span className="mt-1.5 inline-flex items-center rounded-control border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
              {TRACK_LABEL[request.track]}
            </span>
          )}
        </div>
        {isSigned ? (
          <StatusBadge tone="success" surface="dark" icon={ShieldCheck} label="완료됨" />
        ) : isRejected ? (
          <StatusBadge tone="danger" surface="dark" icon={XCircle} label="반려됨" />
        ) : (
          <StatusBadge tone="pending" surface="dark" icon={Clock3} label="대기중" />
        )}
      </div>

      {/* [무결성] 서명 대상은 요청 행의 스냅샷(payload.signedSnapshot)이다. 요약 텍스트는 학생이 쓴 자유 문장이라
          스냅샷과 다르게 적을 수 있으므로, 교관에게는 스냅샷을 표로 직접 보여주고 요약은 참고로만 접어 둔다. */}
      {(() => {
        const snap = snapshotFromPayload(request.payload)
        if (!snap) {
          return request.summary ? (
            <p className="mt-3 whitespace-pre-wrap rounded-control border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-300">{request.summary}</p>
          ) : null
        }
        const rows = Object.entries(snap.fields).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
        return (
          <div className="mt-3 rounded-control border border-sky/20 bg-white/5 px-3 py-2.5 text-xs">
            <p className="mb-1.5 font-semibold text-sky">서명 대상 기록 (이 내용에 서명합니다)</p>
            <div className="table-scroll"><table className="w-full">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k} className="border-t border-white/10 first:border-t-0">
                    <td className="py-0.5 pr-3 text-slate-400">{SIGNED_FIELD_LABEL[k] ?? k}</td>
                    <td className="py-0.5 font-mono-data text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <p className="mt-1.5 font-mono-data text-[10px] text-slate-500">해시 {snap.hash.slice(0, 16)}… · 요청자 {request.requester_name}{request.requester_email ? ` (${request.requester_email})` : ''}</p>
            {request.summary && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[11px] text-slate-500">요청자가 적은 요약 보기</summary>
                <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">{request.summary}</p>
              </details>
            )}
          </div>
        )
      })()}

      <div className="mt-3">
        {isSigned ? (
          <div className="space-y-2">
            {signedImageUrl && (
              <img src={signedImageUrl} alt="교관 서명 이미지" className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-white object-contain p-1" />
            )}
            <p className="font-mono-data text-xs tabular-nums text-slate-400">
              서명자: {request.decided_by_name || account.name} · {formatDateTime(request.decided_at)}
            </p>
          </div>
        ) : isRejected ? (
          <p className="font-mono-data text-xs tabular-nums text-slate-400">
            반려: {formatDateTime(request.decided_at)}
            {request.decision_note ? ` · 사유: ${request.decision_note}` : ''}
          </p>
        ) : rejectOpen ? (
          <div className="rounded-control border border-rose-400/30 bg-rose-500/5 p-3">
            <label htmlFor={`sig-reject-${request.id}`} className="text-xs font-semibold text-slate-300">반려 사유(학생에게 표시돼요)</label>
            <input id={`sig-reject-${request.id}`}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="예: 블록타임이 실제와 달라요"
              className="mt-1.5 w-full rounded-control border border-white/15 bg-panel px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {error && <p className="mt-2 text-xs font-medium text-rose-300">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" tone="danger" loading={isDeciding} disabled={isDeciding} onClick={() => void handleReject()}>반려 확정</Button>
              <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setRejectOpen(false)}>취소</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              아래 영역에 직접 서명한 뒤 "서명 완료"를 누르면 본인 명의로 서명이 등록됩니다. 등록 후에는 되돌릴 수 없어요.
            </p>
            <SignaturePad onChange={setSignatureDataUrl} disabled={isProcessing} />
            {error && <p className="text-xs font-medium text-rose-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" tone="brand"
                loading={isProcessing}
                disabled={!signatureDataUrl || isProcessing}
                onClick={() => void handleSign()}
                data-testid="signature-complete"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {isUploading ? '서명 이미지 업로드 중...' : isDeciding ? '서명 등록 중...' : '서명 완료'}
              </Button>
              <Button type="button" size="sm" variant="outline" tone="danger" className="border-rose-400/50 text-rose-300" disabled={isProcessing} onClick={() => setRejectOpen(true)}>
                반려
              </Button>
            </div>
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
  /** 지금 보고 있는 자격 구분 — 이 구분의 요청만 보여준다(항공기 요청이 초경량 탭에 섞이지 않게) */
  track?: PilotTrack
  /** 다른 구분에 대기중 요청이 있을 때 그 구분으로 바로 전환 */
  onSwitchTrack?: (track: PilotTrack) => void
}

export function InstructorSignatureInboxSection({ account, instructorCurrencyMet = true, track, onSwitchTrack }: InstructorSignatureInboxSectionProps) {
  const [tab, setTab] = useState<TabFilter>('pending')
  const [page, setPage] = useState(1)
  const { toast, showToast } = useToast()

  // 대기중은 pending 만, 완료됨은 approved+rejected 만 서버에서 받는다. 구분(track)도 서버에서 거른다.
  const { data, isLoading, error, refetch } = useApprovalRequests(
    { scope: 'inbox', kind: 'signature', status: tab === 'pending' ? 'pending' : ['approved', 'rejected'], track, limit: 200 },
    { pollMs: tab === 'pending' ? 30_000 : undefined },
  )

  async function handleDecided(outcome: 'signed' | 'rejected') {
    await refetch()
    showToast(outcome === 'signed' ? '서명이 등록되었어요. 완료됨 탭에서 확인할 수 있어요.' : '요청을 반려했어요.')
  }
  const items = useMemo(() => data ?? [], [data])

  // 다른 구분에 대기중인 요청 — 교관이 지금 보는 구분과 다른 구분의 요청을 놓치지 않게 개수만 보여준다
  const { data: allPending } = useApprovalRequests(
    { scope: 'inbox', kind: 'signature', status: 'pending', limit: 200 },
    { enabled: Boolean(track), pollMs: 60_000 },
  )
  const otherTrackCounts = useMemo(() => {
    const counts: Partial<Record<PilotTrack, number>> = {}
    for (const r of allPending ?? []) {
      if (!r.track || r.track === track) continue
      counts[r.track] = (counts[r.track] ?? 0) + 1
    }
    return counts
  }, [allPending, track])
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [tab])
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paged = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page])

  return (
    <div className="mt-8 rounded-card border border-white/10 bg-white/5 p-cardpad">
      {toast}
      {!instructorCurrencyMet && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            내 조종교육 비행경험(시행규칙 제125조: 최근 1년 10시간)이 미달이에요. 시행규칙 제77조②나목은 "제125조 경험이 있는 조종교관"의 증명을 인정하므로, 지금 서명한 경력은 응시용 증명으로 인정되지 않을 수 있어요. 커런시 탭에서 확인하세요.
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <Inbox className="h-4 w-4 text-sky" aria-hidden="true" />
            서명 요청함{track ? ` · ${TRACK_LABEL[track]}` : ''}
            <InfoTip label="서명 요청함 안내">
              학생이 나에게 보낸 {track ? `${TRACK_LABEL[track]} ` : ''}비행 기록 서명 요청이에요. 내용을 확인한 뒤 직접 서명하고 "서명 완료"를 누르면 서명 이미지와 함께 본인 명의로 등록돼요.
              {track ? ' 다른 구분의 요청은 상단에서 구분을 바꾸면 보여요.' : ''}
            </InfoTip>
          </h2>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="서명 요청 상태">
          {TAB_OPTIONS.map((option) => (
            <button key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => setTab(option.value)}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors
                ${tab === option.value ? 'bg-sky text-navy' : 'border border-white/15 text-slate-300 hover:border-white/30'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(otherTrackCounts).length > 0 && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-2 text-xs text-sky">
          <span className="font-semibold">다른 구분에 대기중인 서명 요청이 있어요:</span>
          {(Object.entries(otherTrackCounts) as Array<[PilotTrack, number]>).map(([t, n]) => (
            <button key={t}
              type="button"
              onClick={() => onSwitchTrack?.(t)}
              className="inline-flex min-h-[32px] items-center rounded-control border border-sky/40 bg-navy px-2.5 text-xs font-semibold text-sky hover:bg-sky/15"
              data-testid={`inbox-switch-${t}`}
            >
              {TRACK_LABEL[t]} {n}건 보기 →
            </button>
          ))}
        </div>
      )}
      {/* 이미 받아둔 목록이 있으면 일시적 오류에도 목록을 유지하고 경고만 띄운다(화면이 통째로 사라지지 않게) */}
      {error && data && (
        <p role="status" className="mt-4 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          목록을 새로 읽지 못했어요({error}). 마지막으로 받은 목록을 보여주고 있어요.{' '}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => void refetch()}>다시 시도</button>
        </p>
      )}
      {isLoading && !data ? (
        <p className="mt-5 text-sm text-slate-400">서명 요청을 불러오는 중입니다...</p>
      ) : error && !data ? (
        <div role="alert" className="mt-5 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-medium text-rose-300">{error}</p>
          <Button type="button" variant="outline" tone="neutral" size="sm" className="mt-3" onClick={() => void refetch()}>다시 시도</Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="mt-5" surface="dark" icon={Inbox}
          title={tab === 'pending' ? '대기중인 서명 요청이 없습니다' : '완료된 서명 요청이 없습니다'}
          description={tab === 'pending' ? '학생이 서명을 요청하면 여기에 표시됩니다.' : '서명하거나 반려한 요청이 여기에 남습니다.'}
        />
      ) : (
        <>
          <ul className="mt-5 space-y-3">
            {paged.map((request) => (
              <li key={request.id}>
                <SignatureRequestCard request={request} account={account} onDecided={handleDecided} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button type="button" size="sm" variant="outline" tone="neutral" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> 이전
              </Button>
              <span className="font-mono-data text-xs tabular-nums text-slate-400">{page} / {totalPages}</span>
              <Button type="button" size="sm" variant="outline" tone="neutral" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                다음 <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
