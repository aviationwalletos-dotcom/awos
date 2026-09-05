import React, { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUploadBoardFile } from '../../hooks/baas/useUploadBoardFile'
import { submitCertificateApprovalRequest } from '../../lib/approvals/certificateRequests'
import { commEducationDueDate, isCommEducationDue } from '../../data/certificateOptions'

import { Button } from '../Button'
import { CertificateForm } from './CertificateForm'
import { CERTIFICATE_STATUS_LABEL, certificateTrack, daysUntil, getCertificateStatus } from '../../types/certificate'
import type { Certificate, CertificateInput, CertificateStatus } from '../../types/certificate'
import type { RoleContent } from '../../data/content'

interface CertificateDetailDialogProps {
  certificate: Certificate | null
  onClose: () => void
  onUpdate: (id: string, input: CertificateInput) => void
  onDelete: (id: string) => void
  /** 로그인한 사용자의 역할에 해당하는 자격 템플릿(빠른 추가 칩)과 강조 색상 */
  roleTemplate?: RoleContent
}

const STATUS_TEXT: Record<CertificateStatus, string> = {
  valid: 'text-go',
  warning: 'text-amber-600',
  urgent: 'text-rose-600',
  expired: 'text-slate-400',
  no_expiry: 'text-sky-600',
}

export function CertificateDetailDialog({ certificate, onClose, onUpdate, onDelete, roleTemplate }: CertificateDetailDialogProps) {
  const { account } = useAuth()
  const { uploadFile } = useUploadBoardFile()
  const [isRequestingApproval, setIsRequestingApproval] = useState(false)
  const [approvalFile, setApprovalFile] = useState<File | null>(null)
  const [approvalDone, setApprovalDone] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)

  async function handleRequestApproval() {
    if (!certificate || !account) return
    setApprovalError(null)
    setIsRequestingApproval(true)
    try {
      const request = await submitCertificateApprovalRequest({
        certificate,
        account,
        file: approvalFile,
        uploadFile,
      })
      const { id: _cid, createdAt: _cc, updatedAt: _cu, syncPostId: _cs, ...rest } = certificate
      onUpdate(certificate.id, { ...rest, approvalStatus: 'pending', approvalRequestPostId: request.id, approvalRevokedAt: undefined })
      setApprovalDone(true)
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : '인증 요청에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsRequestingApproval(false)
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (certificate) {
      // [기기 호환] iOS 15.3 이하·구형 안드로이드 WebView 는 showModal 이 없다 → open 속성으로 대체 표시
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [certificate])

  useEffect(() => {
    setMode('view')
    setConfirmingDelete(false)
  }, [certificate?.id])

  function handleNativeClose() {
    setMode('view')
    setConfirmingDelete(false)
    onClose()
  }

  const status = certificate ? getCertificateStatus(certificate.expiryDate) : null
  const remaining = certificate?.expiryDate ? daysUntil(certificate.expiryDate) : null

  return (
    <dialog ref={dialogRef}
      aria-labelledby="certificate-detail-title"
      onClose={handleNativeClose}
      onCancel={handleNativeClose}
      className="w-full max-w-lg rounded-card border border-white/10 bg-panel p-0 shadow-2xl backdrop:bg-ink/50"
    >
      {certificate && status && (
        <div className="p-cardpad">
          <div className="flex items-start justify-between gap-4">
            <h3 id="certificate-detail-title" className="font-display text-lg font-bold text-ink">
              {mode === 'edit' ? '자격증 수정' : '자격증 상세'}
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
              <CertificateForm
                mode="edit"
                initialValues={certificate}
                onCancel={() => setMode('view')}
                roleTemplate={roleTemplate}
                track={certificateTrack(certificate)}
                onSubmit={(input) => {
                  // 인증(또는 인증 요청) 뒤에 자격 내용을 바꾸면 관리자가 확인한 것과 달라지므로 인증을 해제하고 재요청하게 한다.
                  // 메모만 바뀐 경우는 유지.
                  const substantiveKeys = ['name', 'category', 'issuer', 'issuedDate', 'expiryDate', 'licenceNumber', 'aircraftCategory', 'classRating', 'typeRating', 'limitations', 'linkedCertificateId'] as const
                  const changed = substantiveKeys.some((k) => (certificate[k] ?? '') !== (input[k] ?? ''))
                  const wasVerified = certificate.approvalStatus === 'approved' || (certificate.approvalStatus === 'pending' && certificate.approvalRequestPostId)
                  if (changed && wasVerified) {
                    onUpdate(certificate.id, { ...input, approvalStatus: undefined, approvalRequestPostId: undefined, approvalRevokedAt: Date.now() })
                  } else {
                    onUpdate(certificate.id, input)
                  }
                  setMode('view')
                }}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className={`text-sm font-semibold ${STATUS_TEXT[status]}`}>
                {CERTIFICATE_STATUS_LABEL[status]}
                {remaining !== null && (remaining >= 0 ? ` · D-${remaining}` : ` · 만료 ${Math.abs(remaining)}일 경과`)}
              </p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">구분</dt>
                  <dd className="mt-0.5 text-ink">{certificate.category}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">명칭</dt>
                  <dd className="mt-0.5 text-ink">{certificate.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">발급기관</dt>
                  <dd className="mt-0.5 text-ink">{certificate.issuer}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">발급일</dt>
                  <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{certificate.issuedDate}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">만료일</dt>
                  <dd className="mt-0.5 font-mono-data tabular-nums text-ink">
                    {certificate.expiryDate ?? '만료 없음'}
                  </dd>
                </div>
              </dl>

              {certificate.notes && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">메모</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{certificate.notes}</dd>
                </div>
              )}

              {certificate.category === '무선통신사' && (
                <div className="rounded-card border border-orange-400/30 bg-orange-400/10 p-4 text-xs leading-relaxed text-orange-200">
                  <p className="font-semibold">통신보안 의무교육 (5년 주기)</p>
                  <p className="mt-1">
                    다음 교육 기한: <span className="font-mono-data font-semibold">{commEducationDueDate(certificate.issuedDate) ?? '-'}</span>
                    {isCommEducationDue(certificate.issuedDate) && certificate.approvalStatus !== 'approved'
                      ? ' — 기한이 지났어요. 아래에서 교육 이수증을 첨부해 관리자 인증을 요청하세요.'
                      : ' — 기한 내입니다.'}
                  </p>
                </div>
              )}

              {/* 관리자 인증 — 상태 표시 및 (재)요청 */}
              {(() => {
                const effectiveStatus = certificate.approvalStatus ?? (approvalDone ? 'pending' : undefined)
                const requestNotSent = certificate.approvalStatus === 'pending' && !certificate.approvalRequestPostId && !approvalDone
                return (
                  <div className="rounded-card border border-sky/25 bg-sky/5 p-4">
                    <p className="text-sm font-semibold text-ink">관리자 인증</p>
                    {effectiveStatus === 'approved' && (
                      <p className="mt-2 text-sm font-semibold text-go">
                        인증 완료 — 관리자가 확인한 자격입니다.
                      </p>
                    )}
                    {effectiveStatus === 'pending' && !requestNotSent && (
                      <p className="mt-2 text-sm text-amber-300">
                        승인 대기 중 — 관리자 확인 후 이 카드에 자동 반영됩니다.
                      </p>
                    )}
                    {effectiveStatus === undefined && certificate.approvalRevokedAt && (
                      <p className="rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                        내용을 수정해 이전 인증이 해제되었어요. 수정한 내용이 실물과 맞는지 관리자가 다시 확인해야 하므로 인증을 다시 요청해 주세요.
                      </p>
                    )}
                    {(effectiveStatus === undefined || effectiveStatus === 'rejected' || requestNotSent) && (
                      <>
                        {effectiveStatus === 'rejected' && (
                          <p className="mt-2 text-sm text-rose-300">
                            반려됨 — 사진을 다시 첨부해 재요청할 수 있어요.
                          </p>
                        )}
                        {requestNotSent && (
                          <p className="mt-2 text-sm text-amber-300">
                            요청이 관리자에게 전송되지 않았어요(등록 당시 네트워크 문제로 보여요). 아래에서 다시 보내주세요.
                          </p>
                        )}
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          자격증 사진(이미지 또는 PDF)을 첨부해 관리자에게 인증을 요청하세요. 관리자 페이지의
                          &lsquo;자격증·신체검사 요청함&rsquo;에서 확인 후 승인합니다.
                        </p>
                        <input type="file"
                          accept="image/*,application/pdf,.pdf"
                          onChange={(e) => {
                            const picked = e.target.files?.[0] ?? null
                            // 너무 큰 파일은 업로드 도중이 아니라 고른 즉시 알려준다
                            if (picked && picked.size > 10 * 1024 * 1024) {
                              setApprovalError('파일이 너무 커요(10MB 이하). 사진 크기를 줄여서 다시 골라 주세요.')
                              setApprovalFile(null)
                              e.target.value = ''
                              return
                            }
                            setApprovalError(null)
                            setApprovalFile(picked)
                          }}
                          className="mt-3 block w-full text-xs text-slate-400 file:mr-3 file:rounded-control file:border file:border-sky/40 file:bg-sky/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky"
                        />
                        {approvalError && (
                          <p className="mt-2 text-xs text-rose-300">{approvalError}</p>
                        )}
                        <div className="mt-3">
                          <Button type="button" size="sm" onClick={() => void handleRequestApproval()} disabled={isRequestingApproval}>
                            {isRequestingApproval ? '요청 보내는 중…' : effectiveStatus === 'rejected' || requestNotSent ? '인증 요청 다시 보내기' : '관리자에게 인증 요청'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {confirmingDelete ? (
                <div role="alert" className="rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                  <p className="text-sm font-medium text-rose-300">이 자격증을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" tone="danger" size="sm"
                      onClick={() => {
                        onDelete(certificate.id)
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
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="button" variant="outline" tone="brand" size="sm" onClick={() => setMode('edit')}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    수정하기
                  </Button>
                  <Button type="button" variant="outline" tone="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    삭제하기
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
