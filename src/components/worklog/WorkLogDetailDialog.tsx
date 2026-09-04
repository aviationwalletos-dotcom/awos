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
    <dialog ref={dialogRef}
      aria-labelledby="worklog-detail-title"
      onClose={handleNativeClose}
      onCancel={handleNativeClose}
      className="w-full max-w-lg rounded-card border border-white/10 bg-panel p-0 shadow-2xl backdrop:bg-ink/50"
    >
      {entry && (
        <div className="p-cardpad">
          <div className="flex items-start justify-between gap-4">
            <h3 id="worklog-detail-title" className="font-display text-lg font-bold text-ink">
              {mode === 'edit' ? '기록 수정' : '기록 상세'}
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
            <div className="mt-5 space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.dateLabel}</dt>
                  <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.date}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.targetLabel}</dt>
                  <dd className="mt-0.5 text-ink">{entry.targetLabel}</dd>
                </div>
                {typeof entry.hours === 'number' && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.hoursLabel}</dt>
                    <dd className="mt-0.5 font-mono-data tabular-nums text-ink">{entry.hours.toFixed(1)}시간</dd>
                  </div>
                )}
                {copy.showVerified && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">정비확인서</dt>
                    <dd className="mt-0.5 text-ink">{entry.verified ? '발급 완료' : '미발급'}</dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.detailLabel}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{entry.taskDetail}</p>
              </div>

              {entry.notes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">메모</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{entry.notes}</p>
                </div>
              )}

              {confirmingDelete ? (
                <div role="alert" className="rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
                  <p className="text-sm font-medium text-rose-300">이 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
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
