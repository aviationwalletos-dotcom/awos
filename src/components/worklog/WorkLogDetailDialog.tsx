import React, { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'

import { Button } from '../Button'
import { WorkLogForm } from './WorkLogForm'
import type { WorkLogEntry, WorkLogEntryInput, WorkLogRoleCopy } from '../../types/workLog'

interface WorkLogDetailDialogProps {
  entry: WorkLogEntry | null
  copy: WorkLogRoleCopy
  onClose: () => void
  onUpdate: (id: string, input: WorkLogEntryInput) => void
  onDelete: (id: string) => void
}

export function WorkLogDetailDialog({ entry, copy, onClose, onUpdate, onDelete }: WorkLogDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
  }, [entry?.id])

  function handleNativeClose() {
    setMode('view')
    setConfirmingDelete(false)
    onClose()
  }

  return (
    <dialog
 data-mbaas-oid="qwxv4bq" ref={dialogRef}
      aria-labelledby="worklog-detail-title"
      onClose={handleNativeClose}
      onCancel={handleNativeClose}
      className="w-full max-w-lg rounded-card border border-white/10 bg-panel p-0 shadow-2xl backdrop:bg-ink/50"
    >
      {entry && (
        <div data-mbaas-oid="qebfta0" className="p-cardpad">
          <div data-mbaas-oid="s1d3qhh" className="flex items-start justify-between gap-4">
            <h3 data-mbaas-oid="esj3rsv" id="worklog-detail-title" className="font-display text-lg font-bold text-ink">
              {mode === 'edit' ? '기록 수정' : '기록 상세'}
            </h3>
            <button
 data-mbaas-oid="kt8hvrd" type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-slate-400 hover:bg-white/[0.08] hover:text-ink
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {mode === 'edit' ? (
            <div data-mbaas-oid="jrsn1qm" className="mt-5">
              <WorkLogForm
                mode="edit"
                copy={copy}
                initialValues={entry}
                onCancel={() => setMode('view')}
                onSubmit={(input) => {
                  onUpdate(entry.id, input)
                  setMode('view')
                }}
              />
            </div>
          ) : (
            <div data-mbaas-oid="s5pxj5t" className="mt-5 space-y-4">
              <dl data-mbaas-oid="demnkbd" className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div data-mbaas-oid="flmu4lq">
                  <dt data-mbaas-oid="x9h2tfg" className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.dateLabel}</dt>
                  <dd data-mbaas-oid="52dtaku" className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.date}</dd>
                </div>
                <div data-mbaas-oid="6xpr33x">
                  <dt data-mbaas-oid="dr1y5if" className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.targetLabel}</dt>
                  <dd data-mbaas-oid="gbo7zpl" className="mt-0.5 text-ink">{entry.targetLabel}</dd>
                </div>
                {typeof entry.hours === 'number' && (
                  <div data-mbaas-oid="537adau">
                    <dt data-mbaas-oid="wuzcksn" className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.hoursLabel}</dt>
                    <dd data-mbaas-oid="i9wzgrm" className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.hours.toFixed(1)}시간</dd>
                  </div>
                )}
                {copy.showVerified && (
                  <div data-mbaas-oid="xuxzes8">
                    <dt data-mbaas-oid="4l2a1oe" className="text-xs font-medium uppercase tracking-wide text-slate-400">정비확인서</dt>
                    <dd data-mbaas-oid="7a4xzhf" className="mt-0.5 text-ink">{entry.verified ? '발급 완료' : '미발급'}</dd>
                  </div>
                )}
              </dl>

              <div data-mbaas-oid="ap71h3w">
                <p data-mbaas-oid="dtji7ek" className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.detailLabel}</p>
                <p data-mbaas-oid="gsksi17" className="mt-1 whitespace-pre-wrap text-sm text-ink">{entry.taskDetail}</p>
              </div>

              {entry.notes && (
                <div data-mbaas-oid="44ihrqx">
                  <p data-mbaas-oid="goodxom" className="text-xs font-medium uppercase tracking-wide text-slate-400">메모</p>
                  <p data-mbaas-oid="i3umysc" className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{entry.notes}</p>
                </div>
              )}

              {confirmingDelete ? (
                <div data-mbaas-oid="qn6avlm" role="alert" className="rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                  <p data-mbaas-oid="p53174g" className="text-sm font-medium text-rose-300">이 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
                  <div data-mbaas-oid="qlxmmjy" className="mt-3 flex gap-2">
                    <Button
 data-mbaas-oid="d94rl8z" type="button" tone="danger" size="sm"
                      onClick={() => {
                        onDelete(entry.id)
                        dialogRef.current?.close()
                      }}
                    >
                      삭제 확인
                    </Button>
                    <Button data-mbaas-oid="m5u54p1" type="button" variant="outline" tone="neutral" size="sm" onClick={() => setConfirmingDelete(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div data-mbaas-oid="135gshe" className="flex flex-wrap gap-3 pt-2">
                  <Button data-mbaas-oid="ya5h48q" type="button" variant="outline" tone="brand" size="sm" onClick={() => setMode('edit')}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    수정하기
                  </Button>
                  <Button data-mbaas-oid="1x81u7t" type="button" variant="outline" tone="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
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
