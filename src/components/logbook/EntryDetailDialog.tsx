import { Camera, CheckCircle2, Clock3, Pencil, RefreshCw, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import {
  parseDecidedAtFromComment,
  resolveApprovalDecision,
} from '../../lib/baas/instructorApproval'
import {
  buildSignatureRequestContent,
  buildSignatureRequestTitle,
  findSignedComment,
  parseSignatureImageUrlFromComment,
  parseSignedAtFromComment,
} from '../../lib/baas/signatureRequest'
import { toLogbookEntryInput } from '../../lib/logbookEntryInput'
import { Button } from '../Button'
import { StatusBadge } from '../StatusBadge'
import { EntryForm } from './EntryForm'
import { useApprovedInstructors } from '../../hooks/baas/useApprovedInstructors'
import { useAuth } from '../../contexts/AuthContext'
import { useComments } from '../../hooks/baas/useComments'
import { useCreateSignatureRequest } from '../../hooks/baas/useCreateSignatureRequest'
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
}

export function EntryDetailDialog({
  entry,
  onClose,
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
  const { createRequest, isLoading: isSendingRequest, error: sendRequestError, reset: resetSendRequest } = useCreateSignatureRequest()
  const { instructors: approvedInstructors, isLoading: isLoadingInstructors, error: instructorsError } = useApprovedInstructors()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? (account?.data?.organization_affiliation as string | undefined)

  const [showAllAffiliations, setShowAllAffiliations] = useState(false)
  const [selectedInstructorUserId, setSelectedInstructorUserId] = useState('')

  const hasMyAffiliation = Boolean(myAffiliation && myAffiliation.trim())
  const visibleInstructors = useMemo(() => {
    if (showAllAffiliations || !hasMyAffiliation) return approvedInstructors
    return approvedInstructors.filter((instructor) => instructor.affiliation === myAffiliation)
  }, [approvedInstructors, showAllAffiliations, hasMyAffiliation, myAffiliation])

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

  // 아직 서명이 완료되지 않았고, 서명 요청 게시글이 있는 기록만 댓글([SIGNED] 여부)을 확인한다.
  const pendingRequestPostId = entry && !entry.instructorSignature ? entry.signatureRequestPostId : undefined
  const {
    data: commentsData,
    isLoading: isCheckingSignature,
    error: commentsCheckError,
    refetch: refetchComments,
  } = useComments(pendingRequestPostId, { enabled: Boolean(pendingRequestPostId) })

  // 비행경력증명서 인증 요청이 제출되어 있고 아직 확정(confirmed)되지 않은 기록만 승인/반려 댓글을
  // 확인한다(반려된 기록도 반려 사유 표시를 위해 계속 조회한다).
  const certificateRequestPostId = entry?.origin === 'flight_experience_certificate' ? entry.certificateRequestPostId : undefined
  const shouldTrackCertificateDecision = Boolean(certificateRequestPostId) && entry?.certificateApprovalStatus !== 'confirmed'
  const {
    data: certificateCommentsData,
    isLoading: isCheckingCertificateDecision,
    error: certificateCommentsError,
    refetch: refetchCertificateComments,
  } = useComments(certificateRequestPostId, { enabled: shouldTrackCertificateDecision })

  const certificateDecision = useMemo(
    () => resolveApprovalDecision(certificateCommentsData?.items ?? []),
    [certificateCommentsData],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (entry) {
      if (!dialog.open) dialog.showModal()
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

  // 서명 요청 대기중인 게시글에 교관이 [SIGNED] 댓글을 남겼는지 확인해, 발견되면 자동으로
  // 이 기록의 서명 완료 상태로 전환한다(댓글 작성자 = 인증된 교관 계정이므로 그 자체가 전자서명).
  useEffect(() => {
    if (!entry || entry.instructorSignature || !pendingRequestPostId || !commentsData) return

    const signedComment = findSignedComment(commentsData.items)
    if (!signedComment) return

    onUpdate(entry.id, {
      ...toLogbookEntryInput(entry),
      instructorSignature: {
        instructorName: signedComment.author_name,
        instructorUserId: signedComment.author_id,
        signatureDataUrl: parseSignatureImageUrlFromComment(signedComment),
        signedAt: parseSignedAtFromComment(signedComment),
      },
    })
  }, [entry, pendingRequestPostId, commentsData, onUpdate])

  // 비행경력증명서 인증 요청 게시글에 기관 담당자가 [APPROVED]/[REJECTED] 댓글을 남겼는지 확인해,
  // 발견되면 자동으로 이 기록의 인증 상태를 갱신한다(승인 → confirmed, 반려 → rejected).
  useEffect(() => {
    if (!entry || !shouldTrackCertificateDecision || !certificateCommentsData) return
    if (certificateDecision.status === 'pending') return

    const nextStatus = certificateDecision.status === 'approved' ? 'confirmed' : 'rejected'
    if (entry.certificateApprovalStatus === nextStatus) return

    onUpdate(entry.id, { ...toLogbookEntryInput(entry), certificateApprovalStatus: nextStatus })
  }, [entry, shouldTrackCertificateDecision, certificateCommentsData, certificateDecision, onUpdate])

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
    try {
      const created = await createRequest({
        title: buildSignatureRequestTitle(entry),
        content: buildSignatureRequestContent(entry, account, { name: target.name, userId: target.userId }),
      })
      onUpdate(entry.id, { ...toLogbookEntryInput(entry), signatureRequestPostId: created.id })
    } catch {
      // sendRequestError 상태로 화면에 안내됨
    }
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
    <dialog
      data-mbaas-oid="lgbdlg1" ref={dialogRef}
      aria-labelledby="logbook-detail-title"
      onClose={handleNativeClose}
      onCancel={handleNativeClose}
      className="w-full max-w-lg rounded-card border border-white/10 bg-panel p-0 shadow-2xl backdrop:bg-ink/50"
    >
      {entry && (
        <div data-mbaas-oid="lgbdlg2" className="p-cardpad">
          <div data-mbaas-oid="lgbdlg3" className="flex items-start justify-between gap-4">
            <h3 data-mbaas-oid="lgbdlg4" id="logbook-detail-title" className="font-display text-lg font-bold text-ink">
              {mode === 'edit' ? '비행 기록 수정' : '비행 기록 상세'}
            </h3>
            <button
              data-mbaas-oid="lgbdlg5" type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-slate-400 hover:bg-white/[0.08] hover:text-ink
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {mode === 'edit' ? (
            <div data-mbaas-oid="lgbdlg6" className="mt-5">
              {entry.instructorSignature && (
                <p data-mbaas-oid="r3okjt6" className="mb-4 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs font-medium text-amber-300">
                  이 기록은 교관 서명이 완료된 상태입니다. 내용을 수정하고 저장하면 기존 서명이 취소됩니다.
                </p>
              )}
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
            </div>
          ) : (
            <div data-mbaas-oid="lgbdlg8" className="mt-5 space-y-4">
              {(entry.origin === 'legacy_excel' || entry.origin === 'flight_experience_certificate') && entry.legacySourceNote && (
                <div data-mbaas-oid="5qdk0ac" className="rounded-control border border-white/10 bg-surface p-4">
                  <p data-mbaas-oid="7daab0v" className="text-xs text-slate-400">출처: {entry.legacySourceNote}</p>
                </div>
              )}

              {entry.origin === 'flight_experience_certificate' && (
                <div data-mbaas-oid="qlzi0bi" className="rounded-control border border-white/10 bg-surface p-4">
                  <div data-mbaas-oid="stp53e3" className="flex flex-wrap items-center justify-between gap-2">
                    <h4 data-mbaas-oid="pfgkgua" className="flex items-center gap-1.5 text-sm font-bold text-ink">
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
                    <img
                      data-mbaas-oid="gg64mzu" src={entry.certificateImageDataUrl}
                      alt="첨부된 비행경력증명서 사진"
                      className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain"
                    />
                  )}

                  {entry.certificateApprovalStatus === 'confirmed' ? (
                    <p data-mbaas-oid="5vd5pcx" className="mt-3 text-xs font-medium text-go">
                      인증이 완료되어 공식 총 비행시간 합계에 포함됩니다.
                    </p>
                  ) : entry.certificateApprovalStatus === 'rejected' ? (
                    <div data-mbaas-oid="ncj7z02" className="mt-3 space-y-2">
                      <p data-mbaas-oid="73s406n" className="text-xs font-medium text-rose-300">
                        관리자가 이 인증 요청을 반려했습니다. 공식 총 비행시간 합계에서 제외되고 "반려된
                        비행경력증명서"로 별도 표시됩니다.
                      </p>
                      {certificateDecision.comment && (
                        <p data-mbaas-oid="557m71t" className="rounded-control border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                          반려 처리: {certificateDecision.comment.author_name} ·{' '}
                          {formatSignedAt(parseDecidedAtFromComment(certificateDecision.comment))}
                        </p>
                      )}
                    </div>
                  ) : certificateRequestPostId ? (
                    <div data-mbaas-oid="o4ksb06" className="mt-3 space-y-3">
                      <div data-mbaas-oid="0vfvlcs" role="status" className="flex items-start gap-2 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <p data-mbaas-oid="u3tx8dx" className="text-sm font-medium text-amber-300">
                          관리자에게 인증 요청을 제출했습니다. 관리자가 승인/반려하면 이 화면에 자동으로 반영됩니다.
                        </p>
                      </div>
                      {certificateCommentsError && (
                        <p data-mbaas-oid="tmo8ikc" role="alert" className="text-xs font-medium text-rose-600">
                          {certificateCommentsError}
                        </p>
                      )}
                      <Button
                        data-mbaas-oid="js2nh4u" type="button" variant="outline" tone="brand" size="sm"
                        loading={isCheckingCertificateDecision}
                        disabled={isCheckingCertificateDecision}
                        onClick={() => void refetchCertificateComments()}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        인증 상태 확인
                      </Button>
                    </div>
                  ) : (
                    <div data-mbaas-oid="8rnm1fo" className="mt-3 space-y-2">
                      <p data-mbaas-oid="njhfi7d" className="text-xs text-slate-400">
                        이 기록은 관리자에게 인증 요청이 제출되지 않았습니다(제출 당시 네트워크 오류 등). 아직 인증
                        대기중이라 공식 총 비행시간 합계에서 제외되고 "미인증 비행경력증명서(참고용)"에만
                        표시됩니다. 아래에서 본인이 직접 확인 완료로 표시할 수 있습니다(실제 기관 승인이 아닙니다).
                      </p>
                      <Button data-mbaas-oid="74q0dc2" type="button" variant="outline" tone="brand" size="sm" onClick={handleConfirmCertificate}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        학교/교관에게 확인받았습니다
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {signatureInvalidatedNotice && (
                <div data-mbaas-oid="sro094q" role="status" className="rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                  <p data-mbaas-oid="cea59rs" className="text-xs font-medium text-amber-300">
                    기록 수정으로 기존 교관 서명이 취소되었습니다. 필요하다면 아래에서 다시 서명을 요청해 주세요.
                  </p>
                </div>
              )}
              <dl data-mbaas-oid="lgbdlg9" className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div data-mbaas-oid="e25jsrj">
                  <dt data-mbaas-oid="oaihdr7" className="text-xs font-medium uppercase tracking-wide text-slate-400">날짜</dt>
                  <dd data-mbaas-oid="nlmmjpr" className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.date}</dd>
                </div>
                <div data-mbaas-oid="5jqk03g">
                  <dt data-mbaas-oid="lgo47mj" className="text-xs font-medium uppercase tracking-wide text-slate-400">{aircraftTypeLabel}</dt>
                  <dd data-mbaas-oid="2242joh" className="mt-0.5 text-ink">{entry.aircraftType}</dd>
                </div>
                {entry.aircraftIdentification && (
                  <div data-mbaas-oid="5ys7sfd">
                    <dt data-mbaas-oid="3vsfjrl" className="text-xs font-medium uppercase tracking-wide text-slate-400">{aircraftIdLabel}</dt>
                    <dd data-mbaas-oid="ppq5cmg" className="mt-0.5 font-mono-data text-ink">{entry.aircraftIdentification}</dd>
                  </div>
                )}
                <div data-mbaas-oid="scr91b4">
                  <dt data-mbaas-oid="hdzv6fg" className="text-xs font-medium uppercase tracking-wide text-slate-400">출발지 → 도착지</dt>
                  <dd data-mbaas-oid="fwd7sqd" className="mt-0.5 font-mono-data text-ink">{entry.departure} → {entry.arrival}</dd>
                </div>
                {entry.viaAirports && (
                  <div data-mbaas-oid="q4e5l8u">
                    <dt data-mbaas-oid="4brwine" className="text-xs font-medium uppercase tracking-wide text-slate-400">경유 공항</dt>
                    <dd data-mbaas-oid="0s8bfsp" className="mt-0.5 font-mono-data text-ink">{entry.viaAirports}</dd>
                  </div>
                )}
                <div data-mbaas-oid="wk049ff">
                  <dt data-mbaas-oid="kkx11f6" className="text-xs font-medium uppercase tracking-wide text-slate-400">블록타임</dt>
                  <dd data-mbaas-oid="1tb8fh5" className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.blockTime.toFixed(1)}시간</dd>
                </div>
                <div data-mbaas-oid="gzpyuhw">
                  <dt data-mbaas-oid="1pjrfm8" className="text-xs font-medium uppercase tracking-wide text-slate-400">비행 종류</dt>
                  <dd data-mbaas-oid="radoise" className="mt-0.5 text-ink">{entry.flightCategory}</dd>
                </div>
                <div data-mbaas-oid="lnddet1">
                  <dt data-mbaas-oid="lnddet2" className="text-xs font-medium uppercase tracking-wide text-slate-400">계기접근 / 주간 / 야간 이착륙</dt>
                  <dd data-mbaas-oid="lnddet3" className="mt-0.5 font-mono-data tabular-nums text-ink">
                    {entry.instrumentApproaches ?? 0}회 · {entry.dayLandings ?? 0}회 / {entry.nightLandings ?? 0}회
                  </dd>
                </div>
                <div data-mbaas-oid="2pfqv5b">
                  <dt data-mbaas-oid="8evi40u" className="text-xs font-medium uppercase tracking-wide text-slate-400">범주별 시간(단발/다발/회전익/기타)</dt>
                  <dd data-mbaas-oid="sv75pvz" className="mt-0.5 font-mono-data tabular-nums text-ink">
                    {(entry.categoryHours?.singleEngineLand ?? 0).toFixed(1)} / {(entry.categoryHours?.multiEngineLand ?? 0).toFixed(1)} /{' '}
                    {(entry.categoryHours?.rotorcraftHelicopter ?? 0).toFixed(1)} / {(entry.categoryHours?.otherHours ?? 0).toFixed(1)}
                    {entry.categoryHours?.otherLabel ? ` (${entry.categoryHours.otherLabel})` : ''}
                  </dd>
                </div>
                <div data-mbaas-oid="b5d9rtj">
                  <dt data-mbaas-oid="4ceqp6z" className="text-xs font-medium uppercase tracking-wide text-slate-400">자격시간(DUAL RECEIVED/PIC/SIC/AS FLIGHT INSTRUCTOR)</dt>
                  <dd data-mbaas-oid="xr8ol5j" className="mt-0.5 font-mono-data tabular-nums text-ink">
                    {(entry.pilotingTime?.dualReceived ?? 0).toFixed(1)} / {(entry.pilotingTime?.pic ?? 0).toFixed(1)} /{' '}
                    {(entry.pilotingTime?.sic ?? 0).toFixed(1)} / {(entry.pilotingTime?.flightInstructor ?? 0).toFixed(1)}
                  </dd>
                </div>
                <div data-mbaas-oid="sopibil">
                  <dt data-mbaas-oid="mfe7b6k" className="text-xs font-medium uppercase tracking-wide text-slate-400">조건별 시간(주/야/CC/실계기/모의계기)</dt>
                  <dd data-mbaas-oid="m0itc6g" className="mt-0.5 font-mono-data tabular-nums text-ink">
                    {(entry.conditions?.day ?? 0).toFixed(1)} / {(entry.conditions?.night ?? 0).toFixed(1)} /{' '}
                    {(entry.conditions?.crossCountry ?? 0).toFixed(1)} / {(entry.conditions?.actualInstrument ?? 0).toFixed(1)} /{' '}
                    {(entry.conditions?.simulatedInstrument ?? 0).toFixed(1)}
                  </dd>
                </div>
                {Boolean(entry.groundTrainerTime) && (
                  <div data-mbaas-oid="a9mhhzz">
                    <dt data-mbaas-oid="xkv5vkn" className="text-xs font-medium uppercase tracking-wide text-slate-400">지상훈련장비(시뮬레이터)</dt>
                    <dd data-mbaas-oid="r6521v0" className="mt-0.5 font-mono-data tabular-nums text-ink">{(entry.groundTrainerTime ?? 0).toFixed(1)}시간</dd>
                  </div>
                )}
              </dl>

              {entry.notes && (
                <div data-mbaas-oid="3a7gyyh">
                  <dt data-mbaas-oid="9zq5pdy" className="text-xs font-medium uppercase tracking-wide text-slate-400">메모</dt>
                  <dd data-mbaas-oid="y6lsgmt" className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{entry.notes}</dd>
                </div>
              )}

              <div data-mbaas-oid="c9z828i" className="rounded-control border border-white/10 bg-surface p-4">
                <h4 data-mbaas-oid="lpmhmvm" className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <ShieldCheck className="h-4 w-4 text-sky" aria-hidden="true" />
                  조종사 본인 서명(자기 인증)
                </h4>
                {entry.pilotCertification?.certifiedAt ? (
                  <div data-mbaas-oid="yc3t6bs" className="mt-3 space-y-2">
                    {entry.pilotCertification.signatureDataUrl && (
                      <img
                        data-mbaas-oid="yhkzgbo" src={entry.pilotCertification.signatureDataUrl}
                        alt="조종사 본인 서명 이미지"
                        className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-panel object-contain"
                      />
                    )}
                    <p data-mbaas-oid="j3utrf5" className="font-mono-data text-xs tabular-nums text-slate-400">
                      확정 일시: {formatCertifiedAt(entry.pilotCertification.certifiedAt)}
                    </p>
                  </div>
                ) : (
                  <p data-mbaas-oid="zqu0984" className="mt-2 text-xs text-slate-400">
                    아직 본인 서명으로 확정되지 않았습니다. "수정하기"에서 서명 후 "기록 확정(서명)" 버튼을 눌러 확정할 수 있습니다.
                  </p>
                )}
              </div>

              <div data-mbaas-oid="i4yxlcq" className="rounded-control border border-white/10 bg-surface p-4">
                <h4 data-mbaas-oid="hwsa94l" className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <ShieldCheck className="h-4 w-4 text-go" aria-hidden="true" />
                  교관 서명
                </h4>

                {entry.instructorSignature ? (
                  confirmingCancelSignature ? (
                    <div data-mbaas-oid="wab7pca" role="alert" className="mt-3 rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                      <p data-mbaas-oid="rp0bmd4" className="text-sm font-medium text-rose-300">교관 서명을 취소하시겠습니까?</p>
                      <div data-mbaas-oid="xi03z5c" className="mt-3 flex gap-2">
                        <Button data-mbaas-oid="13h4ra3" type="button" tone="danger" size="sm" onClick={handleCancelSignature}>
                          서명 취소 확인
                        </Button>
                        <Button
                          data-mbaas-oid="vbzsk3h" type="button"
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
                    <div data-mbaas-oid="48yreht" className="mt-3 space-y-2">
                      {entry.instructorSignature.signatureDataUrl && (
                        <img
                          data-mbaas-oid="9pv77r0" src={entry.instructorSignature.signatureDataUrl}
                          alt={`${entry.instructorSignature.instructorName} 교관 서명 이미지`}
                          className="h-20 w-full max-w-xs rounded-control border border-white/10 bg-panel object-contain"
                        />
                      )}
                      <p data-mbaas-oid="v29d9fa" className="text-sm text-ink">
                        <span data-mbaas-oid="6yyruta" className="font-semibold">{entry.instructorSignature.instructorName}</span> 교관
                      </p>
                      <p data-mbaas-oid="t7begqs" className="font-mono-data text-xs tabular-nums text-slate-400">
                        서명 계정: {entry.instructorSignature.instructorUserId || '확인 불가(이전 방식으로 서명됨)'}
                      </p>
                      <p data-mbaas-oid="58psn2i" className="font-mono-data text-xs tabular-nums text-slate-400">
                        서명 일시: {formatSignedAt(entry.instructorSignature.signedAt)}
                      </p>
                      <Button
                        data-mbaas-oid="xws5v5q" type="button"
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
                  <div data-mbaas-oid="nz5vq3e" className="mt-3 space-y-3">
                    <div data-mbaas-oid="pjqy8du" role="status" className="flex items-start gap-2 rounded-control border border-amber-400/40 bg-amber-400/10 px-4 py-3">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <p data-mbaas-oid="4xo4o0x" className="text-sm font-medium text-amber-300">
                        교관에게 서명 요청을 보냈습니다. 승인된 교관이 서명 요청함에서 확인 후 서명을 완료하면 이 화면에 자동으로 표시됩니다.
                      </p>
                    </div>
                    {commentsCheckError && (
                      <p data-mbaas-oid="3bxc0jq" role="alert" className="text-xs font-medium text-rose-600">
                        {commentsCheckError}
                      </p>
                    )}
                    <Button
                      data-mbaas-oid="8a2o3m8" type="button"
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
                  </div>
                ) : (
                  <div data-mbaas-oid="qbero0z" className="mt-3 space-y-3">
                    <p data-mbaas-oid="phbdg1m" className="text-xs text-slate-400">
                      교관에게 서명을 요청하면, 승인된 교관이 서명 요청함에서 확인 후 서명을 완료할 수 있습니다. 교관 로그인을 기다릴 필요가 없습니다.
                    </p>

                    {isLoadingInstructors ? (
                      <p data-mbaas-oid="nq52vb2" className="text-xs text-slate-400">승인된 교관 목록을 불러오는 중입니다...</p>
                    ) : instructorsError ? (
                      <p data-mbaas-oid="whlfhgk" role="alert" className="text-xs font-medium text-rose-600">{instructorsError}</p>
                    ) : approvedInstructors.length === 0 ? (
                      <p data-mbaas-oid="b04ttjx" className="rounded-control border border-white/10 bg-surface px-3 py-2 text-xs text-slate-400">
                        현재 승인된 교관이 없어 서명 요청을 보낼 수 없습니다. 교관이 승인되면 다시 시도해주세요.
                      </p>
                    ) : (
                      <div data-mbaas-oid="wdbtg5s" className="space-y-2">
                        <div data-mbaas-oid="kbnc8ua" className="flex items-center justify-between gap-2">
                          <label data-mbaas-oid="pxmhi6g" htmlFor="target-instructor" className="text-xs font-semibold text-slate-400">
                            서명 요청 대상 교관
                          </label>
                          {hasMyAffiliation && (
                            <button
                              data-mbaas-oid="1vvotxv" type="button"
                              onClick={() => setShowAllAffiliations((prev) => !prev)}
                              className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
                            >
                              {showAllAffiliations ? '내 소속만 보기' : '전체 보기'}
                            </button>
                          )}
                        </div>
                        <select
                          data-mbaas-oid="iyl8h2r" id="target-instructor"
                          value={selectedInstructorUserId}
                          onChange={(e) => setSelectedInstructorUserId(e.target.value)}
                          disabled={visibleInstructors.length === 0}
                          className="w-full rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                            disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-slate-400"
                        >
                          {visibleInstructors.length === 0 && (
                            <option data-mbaas-oid="wca7tg3" value="" disabled>
                              교관을 선택해주세요
                            </option>
                          )}
                          {visibleInstructors.map((instructor) => (
                            <option data-mbaas-oid="z9i9lkb" key={instructor.userId} value={instructor.userId}>
                              {instructor.name} ({instructor.affiliation})
                            </option>
                          ))}
                        </select>
                        {visibleInstructors.length === 0 && (
                          <p data-mbaas-oid="rwn5en2" className="text-xs text-slate-400">
                            선택한 소속에 해당하는 승인된 교관이 없습니다. "전체 보기"를 눌러 다른 소속 교관도 확인해보세요.
                          </p>
                        )}
                      </div>
                    )}

                    {sendRequestError && (
                      <p data-mbaas-oid="pxk5rli" role="alert" className="text-xs font-medium text-rose-600">
                        {sendRequestError}
                      </p>
                    )}
                    <Button
                      data-mbaas-oid="2g9vfhb" type="button"
                      variant="solid"
                      tone="brand"
                      size="sm"
                      loading={isSendingRequest}
                      disabled={!account || isSendingRequest || !selectedInstructorUserId}
                      onClick={handleSendSignatureRequest}
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      교관에게 서명 요청 보내기
                    </Button>
                  </div>
                )}
              </div>

              {confirmingDelete ? (
                <div data-mbaas-oid="5f14dk1" role="alert" className="rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                  <p data-mbaas-oid="1285gdt" className="text-sm font-medium text-rose-300">이 비행 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
                  <div data-mbaas-oid="yq809rj" className="mt-3 flex gap-2">
                    <Button
                      data-mbaas-oid="2liwin7" type="button" tone="danger" size="sm"
                      onClick={() => {
                        onDelete(entry.id)
                        dialogRef.current?.close()
                      }}
                    >
                      삭제 확인
                    </Button>
                    <Button data-mbaas-oid="2hdugm0" type="button" variant="outline" tone="neutral" size="sm" onClick={() => setConfirmingDelete(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div data-mbaas-oid="wvzhrk1" className="pt-2">
                  {entry.instructorSignature && (
                    <p data-mbaas-oid="o85qokh" className="mb-2 text-xs text-slate-400">
                      서명된 기록을 수정하면 서명이 취소됩니다.
                    </p>
                  )}
                  <div data-mbaas-oid="ktod293" className="flex flex-wrap gap-3">
                    <Button data-mbaas-oid="8acd8a5" type="button" variant="outline" tone="brand" size="sm" onClick={() => setMode('edit')}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      수정하기
                    </Button>
                    <Button data-mbaas-oid="y147cyk" type="button" variant="outline" tone="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
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
