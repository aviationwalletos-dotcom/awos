import { Camera, CheckCircle2, Clock3, Pencil, RefreshCw, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cancelApprovalRequest, createApprovalRequest } from '../../lib/approvals/api'
import { useApprovalRequestById, useApprovalRequests } from '../../lib/approvals/hooks'
import { SIGNED_FIELD_LABEL, buildSignedSnapshot, matchesSnapshot, snapshotFromPayload } from '../../lib/approvals/snapshot'
import { buildSignatureRequestContent, buildSignatureRequestTitle } from '../../lib/baas/signatureRequest'
import { toLogbookEntryInput } from '../../lib/logbookEntryInput'
import { useSignedFileUrl } from '../../hooks/useSignedFileUrl'
import { Button } from '../Button'
import { StatusBadge } from '../StatusBadge'
import { EntryForm } from './EntryForm'
import { UltralightEntryForm } from './UltralightEntryForm'
import { entryTrack } from '../../lib/tracks'
import type { Vehicle } from '../../types/vehicle'
import { useApprovedInstructors } from '../../hooks/baas/useApprovedInstructors'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'

import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

function formatSignedAt(signedAt: number): string {
  try {
    return new Date(signedAt).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatCertifiedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

interface EntryDetailDialogProps {
  entry: LogbookEntry | null
  onClose: () => void
  onUpdate: (id: string, input: LogbookEntryInput) => void
  onDelete: (id: string) => void
  /** 드론 조종자 등 항공기 개념이 다른 역할을 위한 라벨 커스터마이즈 (미지정 시 조종사 기본값 사용) */
  aircraftTypeLabel?: string
  aircraftTypePlaceholder?: string
  aircraftIdLabel?: string
  aircraftIdPlaceholder?: string
  /** v1.1 — 초경량 기록 편집 시 기체 선택지 */
  vehicles?: Vehicle[]
}

export function EntryDetailDialog({
  entry,
  onClose,
  vehicles,
  onUpdate,
  onDelete,
  aircraftTypeLabel = '항공기 제작사 및 모델',
  aircraftTypePlaceholder,
  aircraftIdLabel = '등록번호(테일넘버)',
  aircraftIdPlaceholder,
}: EntryDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingCancelSignature, setConfirmingCancelSignature] = useState(false)
  const [signatureInvalidatedNotice, setSignatureInvalidatedNotice] = useState(false)

  const { account } = useAuth()
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [sendRequestError, setSendRequestError] = useState<string | null>(null)
  const resetSendRequest = React.useCallback(() => setSendRequestError(null), [])
  const { instructors: approvedInstructors, isLoading: isLoadingInstructors, error: instructorsError } = useApprovedInstructors()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? (account?.data?.organization_affiliation as string | undefined)

  const [showAllAffiliations, setShowAllAffiliations] = useState(false)
  const [selectedInstructorUserId, setSelectedInstructorUserId] = useState('')

  const hasMyAffiliation = Boolean(myAffiliation && myAffiliation.trim())
  // 기록의 자격 구분에 맞는 교관만 — 초경량 기록은 지도조종자, 경량은 경량 교관, 항공기는 항공기 교관(시행규칙 제77조·운영세칙 제9조)
  const entryTrackKey = entry ? entryTrack(entry) : 'aircraft'
  const trackInstructors = useMemo(() => approvedInstructors.filter((i) => i.tracks.includes(entryTrackKey)), [approvedInstructors, entryTrackKey])
  const visibleInstructors = useMemo(() => {
    if (showAllAffiliations || !hasMyAffiliation) return trackInstructors
    return trackInstructors.filter((instructor) => instructor.affiliation === myAffiliation)
  }, [trackInstructors, showAllAffiliations, hasMyAffiliation, myAffiliation])

  // 서명 요청은 반드시 특정 교관을 지정해야 하므로, 선택 가능한 목록이 바뀌면
  // 현재 선택값이 더 이상 유효하지 않을 때 목록의 첫 번째 교관을 자동으로 선택해둔다.
  useEffect(() => {
    if (visibleInstructors.length === 0) {
      if (selectedInstructorUserId) setSelectedInstructorUserId('')
      return
    }
    const stillValid = visibleInstructors.some((instructor) => instructor.userId === selectedInstructorUserId)
    if (!stillValid) {
      setSelectedInstructorUserId(visibleInstructors[0].userId)
    }
  }, [visibleInstructors, selectedInstructorUserId])

  // [3단계] 서명 요청·증명서 인증은 approval_requests 행 1건을 그대로 읽는다(댓글 파싱 없음).
  // 아직 서명이 완료되지 않았고 요청 id 가 있는 기록만 상태를 확인한다(다이얼로그가 열린 동안 15초 폴링).
  const pendingRequestPostId = entry && !entry.instructorSignature ? entry.signatureRequestPostId : undefined
  const {
    request: signatureRequest,
    isLoading: isCheckingSignature,
    error: commentsCheckError,
    refetch: refetchComments,
  } = useApprovalRequestById(pendingRequestPostId, { enabled: Boolean(pendingRequestPostId), pollMs: 15_000 })

  // 비행경력증명서 인증 요청이 제출되어 있고 아직 확정(confirmed)되지 않은 기록만 판정을 확인한다.
  const certificateRequestPostId = entry?.origin === 'flight_experience_certificate' ? entry.certificateRequestPostId : undefined
  const shouldTrackCertificateDecision = Boolean(certificateRequestPostId) && entry?.certificateApprovalStatus !== 'confirmed'
  const {
    request: certificateRequest,
    isLoading: isCheckingCertificateDecision,
    error: certificateCommentsError,
    refetch: refetchCertificateComments,
  } = useApprovalRequestById(certificateRequestPostId, { enabled: shouldTrackCertificateDecision, pollMs: 30_000 })

  // [SEC-003] 비공개 버킷 전환 후에도 교관 서명 이미지를 볼 수 있도록 서명 URL로 해석한다.
  const resolvedInstructorSignatureUrl = useSignedFileUrl(entry?.instructorSignature?.signatureDataUrl)

  // [증거] 이 기록의 서명 이력 — 승인(서명 완료)된 요청 전부. 각 요청에는 그때의 기록 스냅샷·해시가 있다.
  // 종이 로그북에서 줄을 긋고 옆에 적듯, 몇 번째 서명 뒤에 무엇이 바뀌었는지 차수별로 보여준다. 서버 행이라 지울 수 없다.
  const hasSignatureHistory = Boolean(entry?.signedRequestId || entry?.instructorSignature)
  const { data: signedRequests } = useApprovalRequests(
    { scope: 'mine', kind: 'signature', status: 'approved', subjectId: entry?.id, limit: 50 },
    { enabled: Boolean(entry) && hasSignatureHistory },
  )
  const [signatureHistory, setSignatureHistory] = useState<
    Array<{ id: string; order: number; signedAt: string | null; instructor: string; matches: boolean | null; changes: Array<{ key: string; before: unknown; after: unknown }> }>
  >([])
  useEffect(() => {
    let alive = true
    if (!entry || !signedRequests) {
      setSignatureHistory([])
      return
    }
    const current = toLogbookEntryInput(entry) as unknown as Record<string, unknown>
    const ordered = [...signedRequests].sort((a, b) => (a.decided_at ?? '').localeCompare(b.decided_at ?? ''))
    void Promise.all(
      ordered.map(async (req, i) => {
        const snap = snapshotFromPayload(req.payload)
        const matches = snap ? await matchesSnapshot(entry, snap) : null
        const changes = snap
          ? Object.entries(snap.fields)
              .filter(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify(current[k] ?? null))
              .map(([k, v]) => ({ key: k, before: v, after: current[k] ?? null }))
          : []
        return { id: req.id, order: i + 1, signedAt: req.decided_at, instructor: req.decided_by_name || '교관', matches, changes }
      }),
    ).then((rows) => {
      if (alive) setSignatureHistory(rows)
    })
    return () => {
      alive = false
    }
  }, [entry, signedRequests])
  const latestSignature = signatureHistory.length > 0 ? signatureHistory[signatureHistory.length - 1] : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (entry) {
      // [기기 호환] iOS 15.3 이하·구형 안드로이드 WebView 는 showModal 이 없다 → open 속성으로 대체 표시
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [entry])

  useEffect(() => {
    setMode('view')
    setConfirmingDelete(false)
    setConfirmingCancelSignature(false)
    setSignatureInvalidatedNotice(false)
    setSelectedInstructorUserId('')
    setShowAllAffiliations(false)
    resetSendRequest()
  }, [entry?.id, resetSendRequest])

  // 서명 요청이 승인(=교관 서명 완료)되면 이 기록에 서명을 붙인다. 판정자·시각·이미지는 행에서 그대로 온다.
  // 교관이 반려하면 요청 id 를 지워 다시 요청할 수 있게 한다(사유는 아래 화면에 표시).
  useEffect(() => {
    if (!entry || entry.instructorSignature || !pendingRequestPostId || !signatureRequest) return
    // [안전] 다른 기록의 요청 행이 잠깐 남아 있는 순간에 엉뚱한 기록에 서명이 붙지 않도록 id 를 대조한다
    if (signatureRequest.id !== pendingRequestPostId) return
    if (signatureRequest.status === 'approved' && signatureRequest.decided_by) {
      onUpdate(entry.id, {
        ...toLogbookEntryInput(entry),
        signedRequestId: signatureRequest.id,
        instructorSignature: {
          instructorName: signatureRequest.decided_by_name || '교관',
          instructorUserId: signatureRequest.decided_by,
          signatureDataUrl: signatureRequest.signature_path ?? undefined,
          signedAt: signatureRequest.decided_at ? new Date(signatureRequest.decided_at).getTime() : Date.now(),
        },
      })
      return
    }
    if (signatureRequest.status === 'rejected' || signatureRequest.status === 'cancelled') {
      onUpdate(entry.id, {
        ...toLogbookEntryInput(entry),
        signatureRequestPostId: undefined,
        lastSignatureRejection:
          signatureRequest.status === 'rejected'
            ? {
                note: signatureRequest.decision_note || '교관이 서명 요청을 반려했어요.',
                at: signatureRequest.decided_at ? new Date(signatureRequest.decided_at).getTime() : Date.now(),
                instructorName: signatureRequest.decided_by_name || '교관',
              }
            : entry.lastSignatureRejection,
      })
    }
  }, [entry, pendingRequestPostId, signatureRequest, onUpdate])

  // 비행경력증명서 인증 요청이 판정되면 기록 상태를 갱신한다(승인 → confirmed, 반려 → rejected).
  useEffect(() => {
    if (!entry || !shouldTrackCertificateDecision || !certificateRequest) return
    if (certificateRequest.id !== certificateRequestPostId) return
    if (certificateRequest.status === 'pending') return
    const nextStatus = certificateRequest.status === 'approved' ? 'confirmed' : 'rejected'
    if (entry.certificateApprovalStatus === nextStatus) return
    onUpdate(entry.id, { ...toLogbookEntryInput(entry), certificateApprovalStatus: nextStatus })
  }, [entry, shouldTrackCertificateDecision, certificateRequest, onUpdate])

  function handleNativeClose() {
    setMode('view')
    setConfirmingDelete(false)
    setConfirmingCancelSignature(false)
    onClose()
  }

  async function handleSendSignatureRequest() {
    if (!entry || !account || !selectedInstructorUserId) return
    const target = approvedInstructors.find((instructor) => instructor.userId === selectedInstructorUserId)
    if (!target) return
    resetSendRequest()
    setIsSendingRequest(true)
    try {
      const created = await createApprovalRequest({
        kind: 'signature',
        requesterName: account.name,
        requesterEmail: account.user_id,
        targetId: target.userId,
        track: entryTrackKey,
        subjectId: entry.id,
        affiliation: myAffiliation?.trim() || null,
        title: buildSignatureRequestTitle(entry),
        summary: buildSignatureRequestContent(entry, account, { name: target.name, affiliation: target.affiliation !== '미상' ? target.affiliation : undefined }),
        // [증거] 서명 대상 기록의 전체 스냅샷 + 해시. 서명 뒤 기록이 바뀌어도 "서명 당시 내용"이 서버에 남는다.
        payload: { signedSnapshot: await buildSignedSnapshot(entry) },
      })
      onUpdate(entry.id, { ...toLogbookEntryInput(entry), signatureRequestPostId: created.id, lastSignatureRejection: undefined })
    } catch (err) {
      setSendRequestError(err instanceof Error ? err.message : '서명 요청을 보내지 못했습니다.')
    } finally {
      setIsSendingRequest(false)
    }
  }

  // 대기중인 서명 요청 취소 — 서버 행은 cancelled 로(실패해도 로컬 연결은 끊는다: 옛 게시판 id 정리 경로)
  const [isCancellingRequest, setIsCancellingRequest] = useState(false)
  async function handleCancelPendingRequest() {
    if (!entry || !entry.signatureRequestPostId) return
    setIsCancellingRequest(true)
    try {
      await cancelApprovalRequest(entry.signatureRequestPostId).catch(() => undefined)
    } finally {
      setIsCancellingRequest(false)
    }
    onUpdate(entry.id, { ...toLogbookEntryInput(entry), signatureRequestPostId: undefined })
  }

  function handleConfirmCertificate() {
    if (!entry) return
    onUpdate(entry.id, { ...toLogbookEntryInput(entry), certificateApprovalStatus: 'confirmed' })
  }

  function handleCancelSignature() {
    if (!entry) return
    onUpdate(entry.id, { ...toLogbookEntryInput(entry), instructorSignature: undefined, signatureRequestPostId: undefined })
    setConfirmingCancelSignature(false)
  }

  function handleEditSubmit(input: LogbookEntryInput) {
    if (!entry) return
    const hadSignature = Boolean(entry.instructorSignature)
    onUpdate(entry.id, { ...input, instructorSignature: undefined, signatureRequestPostId: undefined })
    setMode('view')
    if (hadSignature) {
      setSignatureInvalidatedNotice(true)
    }
  }

  return (
    <dialog ref={dialogRef}
      aria-labelledby="logbook-detail-title"
      onClose={handleNativeClose}
      onCancel={handleNativeClose}
      className="w-full max-w-lg rounded-card border border-white/10 bg-panel p-0 shadow-2xl backdrop:bg-ink/50"
    >
      {entry && (
        <div className="p-cardpad">
          <div className="flex items-start justify-between gap-4">
            <h3 id="logbook-detail-title" className="font-display text-lg font-bold text-ink">
              {mode === 'edit' ? '비행 기록 수정' : '비행 기록 상세'}
            </h3>
            <button type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-slate-400 hover:bg-white/[0.08] hover:text-ink
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {mode === 'edit' ? (
            <div className="mt-5">
              {entry.instructorSignature && (
                <p className="mb-4 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs font-medium text-amber-300">
                  이 기록은 교관 서명이 완료된 상태입니다. 내용을 수정하고 저장하면 기존 서명이 취소됩니다.
                </p>
              )}
              {entryTrack(entry) === 'ultralight' ? (
                <UltralightEntryForm
                  mode="edit"
                  initialValues={entry}
                  vehicles={vehicles ?? []}
                  onCancel={() => setMode('view')}
                  onSubmit={handleEditSubmit}
                />
              ) : (
              <EntryForm
                mode="edit"
                initialValues={entry}
                onCancel={() => setMode('view')}
                onSubmit={handleEditSubmit}
                aircraftTypeLabel={aircraftTypeLabel}
                aircraftTypePlaceholder={aircraftTypePlaceholder}
                aircraftIdLabel={aircraftIdLabel}
                aircraftIdPlaceholder={aircraftIdPlaceholder}
              />
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {(entry.origin === 'legacy_excel' || entry.origin === 'flight_experience_certificate') && entry.legacySourceNote && (
                <div className="rounded-control border border-white/10 bg-surface p-4">
                  <p className="text-xs text-slate-400">출처: {entry.legacySourceNote}</p>
                </div>
              )}

              {entry.origin === 'flight_experience_certificate' && (
                <div className="rounded-control border border-white/10 bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Camera className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      비행경력증명서
                    </h4>
                    <StatusBadge
                      tone={
                        entry.certificateApprovalStatus === 'confirmed'
                          ? 'success'
                          : entry.certificateApprovalStatus === 'rejected'
                          ? 'danger'
                          : 'pending'
                      }
                      label={
                        entry.certificateApprovalStatus === 'confirmed'
                          ? '인증완료'
                          : entry.certificateApprovalStatus === 'rejected'
                          ? '반려됨'
                          : '인증 대기중'
                      }
                    />
                  </div>

                  {entry.certificateImageDataUrl && (
                    <img src={entry.certificateImageDataUrl}
                      alt="첨부된 비행경력증명서 사진"
                      className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain"
                    />
                  )}

                  {entry.certificateApprovalStatus === 'confirmed' ? (
                    <p className="mt-3 text-xs font-medium text-go">
                      인증이 완료되어 공식 총 비행시간 합계에 포함됩니다.
                    </p>
                  ) : entry.certificateApprovalStatus === 'rejected' ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-rose-300">
                        관리자가 이 인증 요청을 반려했습니다. 공식 총 비행시간 합계에서 제외되고 "반려된
                        비행경력증명서"로 별도 표시됩니다.
                      </p>
                      {certificateRequest?.status === 'rejected' && certificateRequest.decided_at && (
                        <p className="rounded-control border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                          반려 처리: {certificateRequest.decided_by_name || '관리자'} ·{' '}
                          {formatSignedAt(new Date(certificateRequest.decided_at).getTime())}
                          {certificateRequest.decision_note ? ` · 사유: ${certificateRequest.decision_note}` : ''}
                        </p>
                      )}
                    </div>
                  ) : certificateRequestPostId ? (
                    <div className="mt-3 space-y-3">
                      <div role="status" className="flex items-start gap-2 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <p className="text-sm font-medium text-amber-300">
                          관리자에게 인증 요청을 제출했습니다. 관리자가 승인/반려하면 이 화면에 자동으로 반영됩니다.
                        </p>
                      </div>
                      {certificateCommentsError && (
                        <p role="alert" className="text-xs font-medium text-rose-600">
                          {certificateCommentsError}
                        </p>
                      )}
                      <Button type="button" variant="outline" tone="brand" size="sm"
                        loading={isCheckingCertificateDecision}
                        disabled={isCheckingCertificateDecision}
                        onClick={() => void refetchCertificateComments()}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        인증 상태 확인
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-400">
                        이 기록은 관리자에게 인증 요청이 제출되지 않았습니다(제출 당시 네트워크 오류 등). 아직 인증
                        대기중이라 공식 총 비행시간 합계에서 제외되고 "미인증 비행경력증명서(참고용)"에만
                        표시됩니다. 아래에서 본인이 직접 확인 완료로 표시할 수 있습니다(실제 기관 승인이 아닙니다).
                      </p>
                      <Button type="button" variant="outline" tone="brand" size="sm" onClick={handleConfirmCertificate}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        학교/교관에게 확인받았습니다
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {signatureHistory.length > 0 && (
                <details className="mb-3 rounded-control border border-white/10 bg-white/[0.03] px-3 py-2 text-xs" open={!entry.instructorSignature}>
                  <summary className="cursor-pointer font-semibold text-slate-200">
                    서명 이력 {signatureHistory.length}건
                    {latestSignature && (latestSignature.matches === false || !entry.instructorSignature) ? ' — 마지막 서명 뒤에 수정됨' : ''}
                  </summary>
                  <p className="mt-1 text-[11px] text-slate-500">
                    서명할 때의 기록 내용이 서버에 그대로 남아요(종이 로그북의 "줄 긋고 옆에 적기"). 서명 뒤 고친 항목은 차수별로 표시돼요.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {signatureHistory.map((h) => {
                      const isCurrent = Boolean(entry.instructorSignature) && h.id === latestSignature?.id && h.matches !== false
                      return (
                        <li key={h.id} className="rounded-control border border-white/10 bg-navy px-3 py-2">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-200">{h.order}차 서명</span>
                            <span className="font-mono-data tabular-nums text-slate-400">{h.signedAt ? formatSignedAt(new Date(h.signedAt).getTime()) : ''}</span>
                            <span className="text-slate-400">{h.instructor}</span>
                            {isCurrent ? (
                              <span className="text-go">현재 유효 · 내용 일치(해시 검증)</span>
                            ) : h.changes.length > 0 ? (
                              <span className="text-amber-300">이후 수정됨</span>
                            ) : h.matches === null ? (
                              <span className="text-slate-500">스냅샷 없음(예전 방식 서명)</span>
                            ) : (
                              <span className="text-slate-400">이후 다시 서명됨</span>
                            )}
                          </p>
                          {h.changes.length > 0 && (
                            <div className="table-scroll"><table className="mt-1.5 w-full text-[11px]">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="py-0.5 pr-2 font-semibold">항목</th>
                                  <th className="py-0.5 pr-2 font-semibold">{h.order}차 서명 때</th>
                                  <th className="py-0.5 font-semibold">지금</th>
                                </tr>
                              </thead>
                              <tbody>
                                {h.changes.map((c) => (
                                  <tr key={c.key} className="border-t border-white/10">
                                    <td className="py-0.5 pr-2 text-slate-300">{SIGNED_FIELD_LABEL[c.key] ?? c.key}</td>
                                    <td className="py-0.5 pr-2 font-mono-data text-amber-200">{c.before === null || c.before === undefined ? '-' : typeof c.before === 'object' ? JSON.stringify(c.before) : String(c.before)}</td>
                                    <td className="py-0.5 font-mono-data text-slate-200">{c.after === null || c.after === undefined ? '-' : typeof c.after === 'object' ? JSON.stringify(c.after) : String(c.after)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table></div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {!entry.instructorSignature && (
                    <p className="mt-2 text-[11px] text-slate-400">지금 내용으로 다시 서명을 요청하면 {signatureHistory.length + 1}차 서명으로 기록돼요.</p>
                  )}
                </details>
              )}
              {entry.instructorSignature && latestSignature?.matches === false && (
                <p role="alert" className="mb-2 text-[11px] font-semibold text-rose-300">
                  ⚠ 마지막 서명 때 내용과 다릅니다(해시 불일치). 서명 뒤에 기록이 바뀌었을 수 있어요.
                </p>
              )}
              {signatureInvalidatedNotice && (
                <div role="status" className="rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                  <p className="text-xs font-medium text-amber-300">
                    기록 수정으로 기존 교관 서명이 취소되었습니다. 필요하다면 아래에서 다시 서명을 요청해 주세요.
                  </p>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">날짜</dt>
                  <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.date}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{aircraftTypeLabel}</dt>
                  <dd className="mt-0.5 text-ink">{entry.aircraftType}</dd>
                </div>
                {entry.aircraftIdentification && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{aircraftIdLabel}</dt>
                    <dd className="mt-0.5 font-mono-data text-ink">{entry.aircraftIdentification}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">출발지 → 도착지</dt>
                  <dd className="mt-0.5 font-mono-data text-ink">{entry.departure} → {entry.arrival}</dd>
                </div>
                {entry.viaAirports && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">경유 공항</dt>
                    <dd className="mt-0.5 font-mono-data text-ink">{entry.viaAirports}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">블록타임</dt>
                  <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.blockTime.toFixed(1)}시간</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">비행 종류</dt>
                  <dd className="mt-0.5 text-ink">{entry.flightCategory}</dd>
                </div>
                {entryTrack(entry) === 'ultralight' && (
                  <>
                    {(entry.takeoffTime || entry.landingTime) && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">이륙 → 착륙 시각</dt>
                        <dd className="mt-0.5 font-mono-data text-ink">{entry.takeoffTime ?? '–'} → {entry.landingTime ?? '–'}</dd>
                      </div>
                    )}
                    {(entry.hourMeterStart != null || entry.hourMeterEnd != null) && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">아워미터</dt>
                        <dd className="mt-0.5 font-mono-data text-ink">{entry.hourMeterStart ?? '–'} → {entry.hourMeterEnd ?? '–'}</dd>
                      </div>
                    )}
                    {entry.flightCount != null && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">비행 횟수</dt>
                        <dd className="mt-0.5 font-mono-data text-ink">{entry.flightCount}회</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">임무별 (기장/훈련/교관)</dt>
                      <dd className="mt-0.5 font-mono-data text-ink">
                        {(entry.pilotingTime?.pic ?? 0).toFixed(1)} / {(entry.pilotingTime?.training ?? 0).toFixed(1)} / {(entry.pilotingTime?.flightInstructor ?? 0).toFixed(1)}시간
                      </dd>
                    </div>
                    {entry.flightPurpose && (
                      <div className="col-span-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">비행목적 / 훈련내용</dt>
                        <dd className="mt-0.5 text-ink">{entry.flightPurpose}</dd>
                      </div>
                    )}
                    {entry.instructorLicenceNo && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">지도조종자 자격번호</dt>
                        <dd className="mt-0.5 font-mono-data text-ink">{entry.instructorLicenceNo}</dd>
                      </div>
                    )}
                  </>
                )}
                {entryTrack(entry) === 'ultralight' ? (
                  <>
                    {(entry.traineeName || entry.instructorLicenceNo) && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">교육생 / 지도조종자 자격번호</dt>
                        <dd className="mt-0.5 text-ink">{entry.traineeName || '—'} / {entry.instructorLicenceNo || '—'}</dd>
                      </div>
                    )}
                    {(entry.hourMeterStart != null || entry.hourMeterEnd != null) && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">아워미터 (이륙 → 착륙)</dt>
                        <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.hourMeterStart ?? '—'} → {entry.hourMeterEnd ?? '—'}</dd>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">계기접근 / 주간 / 야간 이착륙</dt>
                      <dd className="mt-0.5 font-mono-data tabular-nums text-ink">
                        {entry.instrumentApproaches ?? 0}회 · {entry.dayLandings ?? 0}회 / {entry.nightLandings ?? 0}회
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">범주별 시간(단발/다발/회전익/기타)</dt>
                      <dd className="mt-0.5 font-mono-data tabular-nums text-ink">
                        {(entry.categoryHours?.singleEngineLand ?? 0).toFixed(1)} / {(entry.categoryHours?.multiEngineLand ?? 0).toFixed(1)} /{' '}
                        {(entry.categoryHours?.rotorcraftHelicopter ?? 0).toFixed(1)} / {(entry.categoryHours?.otherHours ?? 0).toFixed(1)}
                        {entry.categoryHours?.otherLabel ? ` (${entry.categoryHours.otherLabel})` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">자격시간(DUAL RECEIVED/PIC/SIC/AS FLIGHT INSTRUCTOR)</dt>
                      <dd className="mt-0.5 font-mono-data tabular-nums text-ink">
                        {(entry.pilotingTime?.dualReceived ?? 0).toFixed(1)} / {(entry.pilotingTime?.pic ?? 0).toFixed(1)} /{' '}
                        {(entry.pilotingTime?.sic ?? 0).toFixed(1)} / {(entry.pilotingTime?.flightInstructor ?? 0).toFixed(1)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">조건별 시간(주/야/CC/실계기/모의계기)</dt>
                      <dd className="mt-0.5 font-mono-data tabular-nums text-ink">
                        {(entry.conditions?.day ?? 0).toFixed(1)} / {(entry.conditions?.night ?? 0).toFixed(1)} /{' '}
                        {(entry.conditions?.crossCountry ?? 0).toFixed(1)} / {(entry.conditions?.actualInstrument ?? 0).toFixed(1)} /{' '}
                        {(entry.conditions?.simulatedInstrument ?? 0).toFixed(1)}
                      </dd>
                    </div>
                  </>
                )}
                {Boolean(entry.groundTrainerTime) && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">지상훈련장비(시뮬레이터)</dt>
                    <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{(entry.groundTrainerTime ?? 0).toFixed(1)}시간</dd>
                  </div>
                )}
              </dl>

              {entry.notes && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">메모</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{entry.notes}</dd>
                </div>
              )}

              {entry.pilotCertification?.signatureDataUrl && (
                <div className="rounded-control border border-white/10 bg-surface p-4">
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                    <ShieldCheck className="h-4 w-4 text-sky" aria-hidden="true" />
                    조종사 본인 확인(참고 · 예전 기록)
                  </h4>
                  <div className="mt-3 space-y-2">
                    <img src={entry.pilotCertification.signatureDataUrl}
                      alt="조종사 본인 서명 이미지"
                      className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-white object-contain p-1"
                    />
                    {entry.pilotCertification.certifiedAt && (
                      <p className="font-mono-data text-xs tabular-nums text-slate-400">
                        확정 일시: {formatCertifiedAt(entry.pilotCertification.certifiedAt)}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500">본인 서명은 시행규칙 제77조의 경력 증명이 아니라 v45부터 입력을 받지 않아요. 예전에 붙은 서명만 표시합니다.</p>
                  </div>
                </div>
              )}

              <div className="rounded-control border border-white/10 bg-surface p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <ShieldCheck className="h-4 w-4 text-go" aria-hidden="true" />
                  교관 서명
                </h4>

                {entry.instructorSignature ? (
                  confirmingCancelSignature ? (
                    <div role="alert" className="mt-3 rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                      <p className="text-sm font-medium text-rose-300">교관 서명을 취소하시겠습니까?</p>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" tone="danger" size="sm" onClick={handleCancelSignature}>
                          서명 취소 확인
                        </Button>
                        <Button type="button"
                          variant="outline"
                          tone="neutral"
                          size="sm"
                          onClick={() => setConfirmingCancelSignature(false)}
                        >
                          닫기
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {resolvedInstructorSignatureUrl && (
                        <img src={resolvedInstructorSignatureUrl ?? undefined}
                          alt={`${entry.instructorSignature.instructorName} 교관 서명 이미지`}
                          className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-panel object-contain"
                        />
                      )}
                      <p className="text-sm text-ink">
                        <span className="font-semibold">{entry.instructorSignature.instructorName}</span> 교관
                      </p>
                      <p className="font-mono-data text-xs tabular-nums text-slate-400">
                        서명 계정: {entry.instructorSignature.instructorUserId || '확인 불가(이전 방식으로 서명됨)'}
                      </p>
                      <p className="font-mono-data text-xs tabular-nums text-slate-400">
                        서명 일시: {formatSignedAt(entry.instructorSignature.signedAt)}
                      </p>
                      <Button type="button"
                        variant="outline"
                        tone="danger"
                        size="sm"
                        onClick={() => setConfirmingCancelSignature(true)}
                      >
                        서명 취소
                      </Button>
                    </div>
                  )
                ) : entry.signatureRequestPostId ? (
                  <div className="mt-3 space-y-3">
                    <div role="status" className="flex items-start gap-2 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <p className="text-sm font-medium text-amber-300">
                        교관에게 서명 요청을 보냈습니다. 승인된 교관이 서명 요청함에서 확인 후 서명을 완료하면 이 화면에 자동으로 표시됩니다.
                      </p>
                    </div>
                    {commentsCheckError && (
                      <p role="alert" className="text-xs font-medium text-rose-600">
                        {commentsCheckError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button"
                        variant="outline"
                        tone="brand"
                        size="sm"
                        loading={isCheckingSignature}
                        disabled={isCheckingSignature}
                        onClick={() => void refetchComments()}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        서명 상태 확인
                      </Button>
                      <Button type="button"
                        variant="outline"
                        tone="neutral"
                        size="sm"
                        loading={isCancellingRequest}
                        disabled={isCancellingRequest}
                        onClick={() => void handleCancelPendingRequest()}
                      >
                        요청 취소
                      </Button>
                    </div>
                    {signatureRequest === null && !isCheckingSignature && (
                      <p className="text-[11px] text-slate-500">
                        요청이 서버에 없으면(예전 방식으로 보낸 요청) "요청 취소" 뒤 다시 보내 주세요.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {entry.lastSignatureRejection && (
                      <p role="alert" className="rounded-control border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                        {entry.lastSignatureRejection.instructorName} 교관이 서명 요청을 반려했어요
                        {' '}({formatSignedAt(entry.lastSignatureRejection.at)}). 사유: {entry.lastSignatureRejection.note}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      교관에게 서명을 요청하면, 승인된 교관이 서명 요청함에서 확인 후 서명을 완료할 수 있습니다. 교관 로그인을 기다릴 필요가 없습니다.
                    </p>

                    {isLoadingInstructors ? (
                      <p className="text-xs text-slate-400">승인된 교관 목록을 불러오는 중입니다...</p>
                    ) : instructorsError ? (
                      <p role="alert" className="text-xs font-medium text-rose-600">{instructorsError}</p>
                    ) : trackInstructors.length === 0 ? (
                      <p className="rounded-control border border-white/10 bg-surface px-3 py-2 text-xs text-slate-400">
                        {entryTrackKey === 'ultralight'
                          ? '이 기록에 서명할 수 있는 승인된 지도조종자가 없어요. 초경량 기록은 항공기 교관이 아니라 지도조종자(공단 등록)의 확인이 필요합니다(운영세칙 제9조). 지도조종자가 계정정보에서 "초경량비행장치 지도조종자"로 교관 승인을 받으면 목록에 나타나요.'
                          : entryTrackKey === 'lsa'
                            ? '이 기록에 서명할 수 있는 승인된 경량항공기 교관이 없어요. 교관이 계정정보에서 "경량항공기 조종교관"으로 승인을 받으면 목록에 나타나요.'
                            : '현재 승인된 교관이 없어 서명 요청을 보낼 수 없습니다. 교관이 승인되면 다시 시도해주세요.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor="target-instructor" className="text-xs font-semibold text-slate-400">
                            서명 요청 대상 교관
                          </label>
                          {hasMyAffiliation && (
                            <button type="button"
                              onClick={() => setShowAllAffiliations((prev) => !prev)}
                              className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                            >
                              {showAllAffiliations ? '내 소속만 보기' : '전체 보기'}
                            </button>
                          )}
                        </div>
                        <select id="target-instructor"
                          value={selectedInstructorUserId}
                          onChange={(e) => setSelectedInstructorUserId(e.target.value)}
                          disabled={visibleInstructors.length === 0}
                          className="w-full rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                            disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-slate-400"
                        >
                          {visibleInstructors.length === 0 && (
                            <option value="" disabled>
                              교관을 선택해주세요
                            </option>
                          )}
                          {visibleInstructors.map((instructor) => (
                            <option key={instructor.userId} value={instructor.userId}>
                              {instructor.name} ({instructor.affiliation})
                            </option>
                          ))}
                        </select>
                        {visibleInstructors.length === 0 && (
                          <p className="text-xs text-slate-400">
                            선택한 소속에 해당하는 승인된 교관이 없습니다. "전체 보기"를 눌러 다른 소속 교관도 확인해보세요.
                          </p>
                        )}
                      </div>
                    )}

                    {sendRequestError && (
                      <p role="alert" className="text-xs font-medium text-rose-600">
                        {sendRequestError}
                      </p>
                    )}
                    <Button type="button"
                      variant="solid"
                      tone="brand"
                      size="sm"
                      loading={isSendingRequest}
                      disabled={!account || isSendingRequest || !selectedInstructorUserId}
                      onClick={handleSendSignatureRequest}
                      data-testid="signature-request-send"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      교관에게 서명 요청 보내기
                    </Button>
                  </div>
                )}
              </div>

              {confirmingDelete ? (
                <div role="alert" className="rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                  <p className="text-sm font-medium text-rose-300">이 비행 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" tone="danger" size="sm"
                      onClick={() => {
                        onDelete(entry.id)
                        dialogRef.current?.close()
                      }}
                    >
                      삭제 확인
                    </Button>
                    <Button type="button" variant="outline" tone="neutral" size="sm" onClick={() => setConfirmingDelete(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  {entry.instructorSignature && (
                    <p className="mb-2 text-xs text-slate-400">
                      서명된 기록을 수정하면 서명이 취소됩니다.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" tone="brand" size="sm" onClick={() => setMode('edit')}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      수정하기
                    </Button>
                    <Button type="button" variant="outline" tone="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      삭제하기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
