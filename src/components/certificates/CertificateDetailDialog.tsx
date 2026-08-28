import React, { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'

import { Button } from '../Button'
import { CertificateForm } from './CertificateForm'
import { CERTIFICATE_STATUS_LABEL, daysUntil, getCertificateStatus } from '../../types/certificate'
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
