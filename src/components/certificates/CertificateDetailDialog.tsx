import React, { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCreateCertificateApprovalPost } from '../../hooks/baas/useCreateCertificateApprovalPost'
import { useUploadBoardFile } from '../../hooks/baas/useUploadBoardFile'
import { commEducationDueDate, isCommEducationDue } from '../../data/certificateOptions'
import { buildCertificateApprovalContent, buildCertificateApprovalTitle } from '../../lib/certificateApproval'

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
  const { createCertificateApprovalPost, isLoading: isRequestingApproval } = useCreateCertificateApprovalPost()
  const [approvalFile, setApprovalFile] = useState<File | null>(null)
  const [approvalDone, setApprovalDone] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)

  async function handleRequestApproval() {
    if (!certificate) return
    setApprovalError(null)
    try {
      let fileIds: number[] | undefined
      if (approvalFile) {
        const uploaded = await uploadFile(approvalFile, {
          filename: approvalFile.name,
          contentType: approvalFile.type || 'image/jpeg',
        })
        fileIds = [uploaded.fileId]
      }
      const post = await createCertificateApprovalPost({
        title: buildCertificateApprovalTitle({
          category: certificate.category,
          certId: certificate.id,
          userName: account?.name || account?.user_id || '사용자',
          userId: account?.user_id || '',
          affiliation: account?.data?.organization_affiliation || undefined,
        }),
        content: buildCertificateApprovalContent(certificate),
        ...(fileIds ? { file_ids: fileIds } : {}),
      })
      const { id: _cid, createdAt: _cc, updatedAt: _cu, syncPostId: _cs, ...rest } = certificate
      onUpdate(certificate.id, { ...rest, approvalStatus: 'pending', approvalRequestPostId: post.id })
      setApprovalDone(true)
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : '인증 요청에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (certificate) {
      if (!dialog.open) dialog.showModal()
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
    <dialog
      data-mbaas-oid="3tnzfw1" ref={dialogRef}
      aria-labelledby="certificate-detail-title"
      onClose={handleNativeClose}
      onCancel={handleNativeClose}
      className="w-full max-w-lg rounded-card border border-white/10 bg-panel p-0 shadow-2xl backdrop:bg-ink/50"
    >
      {certificate && status && (
        <div data-mbaas-oid="t4tcd72" className="p-cardpad">
          <div data-mbaas-oid="iy7gh96" className="flex items-start justify-between gap-4">
            <h3 data-mbaas-oid="qhaz6v9" id="certificate-detail-title" className="font-display text-lg font-bold text-ink">
              {mode === 'edit' ? '자격증 수정' : '자격증 상세'}
            </h3>
            <button
              data-mbaas-oid="sxm19et" type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-slate-400 hover:bg-white/[0.08] hover:text-ink
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {mode === 'edit' ? (
            <div data-mbaas-oid="t6wd5yc" className="mt-5">
              <CertificateForm
                mode="edit"
                initialValues={certificate}
                onCancel={() => setMode('view')}
                roleTemplate={roleTemplate}
                track={certificateTrack(certificate)}
                onSubmit={(input) => {
                  onUpdate(certificate.id, input)
                  setMode('view')
                }}
              />
            </div>
          ) : (
            <div data-mbaas-oid="rszqnmj" className="mt-5 space-y-4">
              <p data-mbaas-oid="1lh54z2" className={`text-sm font-semibold ${STATUS_TEXT[status]}`}>
                {CERTIFICATE_STATUS_LABEL[status]}
                {remaining !== null && (remaining >= 0 ? ` · D-${remaining}` : ` · 만료 ${Math.abs(remaining)}일 경과`)}
              </p>

              <dl data-mbaas-oid="dyqsxzy" className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div data-mbaas-oid="qm4sho5">
                  <dt data-mbaas-oid="7rrdjz8" className="text-xs font-medium uppercase tracking-wide text-slate-400">구분</dt>
                  <dd data-mbaas-oid="bl8ckum" className="mt-0.5 text-ink">{certificate.category}</dd>
                </div>
                <div data-mbaas-oid="ejhvekn">
                  <dt data-mbaas-oid="vknccpr" className="text-xs font-medium uppercase tracking-wide text-slate-400">명칭</dt>
                  <dd data-mbaas-oid="fb1meuz" className="mt-0.5 text-ink">{certificate.name}</dd>
                </div>
                <div data-mbaas-oid="hmheuuy">
                  <dt data-mbaas-oid="09gnwbu" className="text-xs font-medium uppercase tracking-wide text-slate-400">발급기관</dt>
                  <dd data-mbaas-oid="2oqijvm" className="mt-0.5 text-ink">{certificate.issuer}</dd>
                </div>
                <div data-mbaas-oid="sidry9o">
                  <dt data-mbaas-oid="sq4gcaw" className="text-xs font-medium uppercase tracking-wide text-slate-400">발급일</dt>
                  <dd data-mbaas-oid="0ggsi8y" className="mt-0.5 font-mono-data tabular-nums text-ink">{certificate.issuedDate}</dd>
                </div>
                <div data-mbaas-oid="erh9o89">
                  <dt data-mbaas-oid="dbo2mnt" className="text-xs font-medium uppercase tracking-wide text-slate-400">만료일</dt>
                  <dd data-mbaas-oid="1uemlk6" className="mt-0.5 font-mono-data tabular-nums text-ink">
                    {certificate.expiryDate ?? '만료 없음'}
                  </dd>
                </div>
              </dl>

              {certificate.notes && (
                <div data-mbaas-oid="xaa4esm">
                  <dt data-mbaas-oid="u5h16ho" className="text-xs font-medium uppercase tracking-wide text-slate-400">메모</dt>
                  <dd data-mbaas-oid="cwrxhki" className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{certificate.notes}</dd>
                </div>
              )}

              {certificate.category === '무선통신사' && (
                <div data-mbaas-oid="commdet" className="rounded-card border border-orange-400/30 bg-orange-400/10 p-4 text-xs leading-relaxed text-orange-200">
                  <p data-mbaas-oid="commdet1" className="font-semibold">통신보안 의무교육 (5년 주기)</p>
                  <p data-mbaas-oid="commdet2" className="mt-1">
                    다음 교육 기한: <span data-mbaas-oid="commdet3" className="font-mono-data font-semibold">{commEducationDueDate(certificate.issuedDate) ?? '-'}</span>
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
                  <div data-mbaas-oid="crtaprq" className="rounded-card border border-sky/25 bg-sky/5 p-4">
                    <p data-mbaas-oid="crtaprq1" className="text-sm font-semibold text-ink">관리자 인증</p>
                    {effectiveStatus === 'approved' && (
                      <p data-mbaas-oid="crtaprqA" className="mt-2 text-sm font-semibold text-go">
                        인증 완료 — 관리자가 확인한 자격입니다.
                      </p>
                    )}
                    {effectiveStatus === 'pending' && !requestNotSent && (
                      <p data-mbaas-oid="crtaprqP" className="mt-2 text-sm text-amber-300">
                        승인 대기 중 — 관리자 확인 후 이 카드에 자동 반영됩니다.
                      </p>
                    )}
                    {(effectiveStatus === undefined || effectiveStatus === 'rejected' || requestNotSent) && (
                      <>
                        {effectiveStatus === 'rejected' && (
                          <p data-mbaas-oid="crtaprqR" className="mt-2 text-sm text-rose-300">
                            반려됨 — 사진을 다시 첨부해 재요청할 수 있어요.
                          </p>
                        )}
                        {requestNotSent && (
                          <p data-mbaas-oid="crtaprqN" className="mt-2 text-sm text-amber-300">
                            요청이 관리자에게 전송되지 않았어요(등록 당시 네트워크 문제로 보여요). 아래에서 다시 보내주세요.
                          </p>
                        )}
                        <p data-mbaas-oid="crtaprq3" className="mt-1 text-xs leading-relaxed text-slate-400">
                          자격증 사진(이미지 또는 PDF)을 첨부해 관리자에게 인증을 요청하세요. 관리자 페이지의
                          &lsquo;자격증·신체검사 요청함&rsquo;에서 확인 후 승인합니다.
                        </p>
                        <input
                          data-mbaas-oid="crtaprq4" type="file"
                          accept="image/*,application/pdf,.pdf"
                          onChange={(e) => setApprovalFile(e.target.files?.[0] ?? null)}
                          className="mt-3 block w-full text-xs text-slate-400 file:mr-3 file:rounded-control file:border file:border-sky/40 file:bg-sky/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky"
                        />
                        {approvalError && (
                          <p data-mbaas-oid="crtaprq5" className="mt-2 text-xs text-rose-300">{approvalError}</p>
                        )}
                        <div data-mbaas-oid="crtaprq6" className="mt-3">
                          <Button data-mbaas-oid="crtaprq7" type="button" size="sm" onClick={() => void handleRequestApproval()} disabled={isRequestingApproval}>
                            {isRequestingApproval ? '요청 보내는 중…' : effectiveStatus === 'rejected' || requestNotSent ? '인증 요청 다시 보내기' : '관리자에게 인증 요청'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {confirmingDelete ? (
                <div data-mbaas-oid="eowofus" role="alert" className="rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                  <p data-mbaas-oid="5816g1n" className="text-sm font-medium text-rose-300">이 자격증을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
                  <div data-mbaas-oid="013qhcq" className="mt-3 flex gap-2">
                    <Button
                      data-mbaas-oid="icjjlcy" type="button" tone="danger" size="sm"
                      onClick={() => {
                        onDelete(certificate.id)
                        dialogRef.current?.close()
                      }}
                    >
                      삭제 확인
                    </Button>
                    <Button data-mbaas-oid="vtix1yw" type="button" variant="outline" tone="neutral" size="sm" onClick={() => setConfirmingDelete(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div data-mbaas-oid="bllsf0w" className="flex flex-wrap gap-3 pt-2">
                  <Button data-mbaas-oid="fz5gb55" type="button" variant="outline" tone="brand" size="sm" onClick={() => setMode('edit')}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    수정하기
                  </Button>
                  <Button data-mbaas-oid="ppepkrl" type="button" variant="outline" tone="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
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
