import React, { useState } from 'react'

import { Button } from '../Button'
import type { WorkLogEntry, WorkLogEntryInput, WorkLogRoleCopy } from '../../types/workLog'

interface FieldErrors {
  date?: string
  targetLabel?: string
  taskDetail?: string
}

interface WorkLogFormProps {
  mode: 'create' | 'edit'
  copy: WorkLogRoleCopy
  initialValues?: WorkLogEntry
  onSubmit: (input: WorkLogEntryInput) => void
  onCancel?: () => void
}

const inputClass =
  'w-full rounded-control border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

function numOrUndef(value: FormDataEntryValue | null): number | undefined {
  const s = String(value ?? '').trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

export function WorkLogForm({ mode, copy, initialValues, onSubmit, onCancel }: WorkLogFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [verified, setVerified] = useState(Boolean(initialValues?.verified))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nextErrors: FieldErrors = {}

    const date = String(form.get('date') || '').trim()
    const targetLabel = String(form.get('targetLabel') || '').trim()
    const taskDetail = String(form.get('taskDetail') || '').trim()

    if (!date) nextErrors.date = `${copy.dateLabel}를 입력해 주세요.`
    if (!targetLabel) nextErrors.targetLabel = `${copy.targetLabel}을(를) 입력해 주세요.`
    if (!taskDetail) nextErrors.taskDetail = `${copy.detailLabel}을(를) 입력해 주세요.`

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    onSubmit({
      date,
      targetLabel,
      taskDetail,
      hours: numOrUndef(form.get('hours')),
      verified: copy.showVerified ? verified : undefined,
      notes: String(form.get('notes') || '').trim() || undefined,
    })

    if (mode === 'create') {
      e.currentTarget.reset()
      setVerified(false)
    }
  }

  return (
    <form data-mbaas-oid="wlgfrm1" noValidate onSubmit={handleSubmit} className="space-y-5">
      <div data-mbaas-oid="wlgfrm2" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div data-mbaas-oid="wlgfrm3">
          <label data-mbaas-oid="wlgfrm4" htmlFor="wl-date" className={labelClass}>
            {copy.dateLabel}
          </label>
          <input
            data-mbaas-oid="wlgfrm5" id="wl-date"
            name="date"
            type="date"
            defaultValue={initialValues?.date}
            className={inputClass}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'wl-date-error' : undefined}
          />
          {errors.date && (
            <p data-mbaas-oid="wlgfrm6" id="wl-date-error" className="mt-1.5 text-xs text-rose-600">
              {errors.date}
            </p>
          )}
        </div>

        <div data-mbaas-oid="wlgfrm7">
          <label data-mbaas-oid="wlgfrm8" htmlFor="wl-hours" className={labelClass}>
            {copy.hoursLabel}
          </label>
          <input
            data-mbaas-oid="wlgfrm9" id="wl-hours"
            name="hours"
            type="number"
            step="0.1"
            min="0"
            defaultValue={initialValues?.hours}
            className={`${inputClass} font-mono-data tabular-nums`}
          />
        </div>
      </div>

      <div data-mbaas-oid="wlgfrma">
        <label data-mbaas-oid="wlgfrmb" htmlFor="wl-target" className={labelClass}>
          {copy.targetLabel}
        </label>
        <input
          data-mbaas-oid="wlgfrmc" id="wl-target"
          name="targetLabel"
          type="text"
          defaultValue={initialValues?.targetLabel}
          placeholder={copy.targetPlaceholder}
          className={inputClass}
          aria-invalid={Boolean(errors.targetLabel)}
          aria-describedby={errors.targetLabel ? 'wl-target-error' : undefined}
        />
        {errors.targetLabel && (
          <p data-mbaas-oid="wlgfrmd" id="wl-target-error" className="mt-1.5 text-xs text-rose-600">
            {errors.targetLabel}
          </p>
        )}
      </div>

      <div data-mbaas-oid="wlgfrme">
        <label data-mbaas-oid="wlgfrmf" htmlFor="wl-detail" className={labelClass}>
          {copy.detailLabel}
        </label>
        <textarea
          data-mbaas-oid="wlgfrmg" id="wl-detail"
          name="taskDetail"
          rows={3}
          defaultValue={initialValues?.taskDetail}
          placeholder={copy.detailPlaceholder}
          className={inputClass}
          aria-invalid={Boolean(errors.taskDetail)}
          aria-describedby={errors.taskDetail ? 'wl-detail-error' : undefined}
        />
        {errors.taskDetail && (
          <p data-mbaas-oid="wlgfrmh" id="wl-detail-error" className="mt-1.5 text-xs text-rose-600">
            {errors.taskDetail}
          </p>
        )}
      </div>

      {copy.showVerified && (
        <label data-mbaas-oid="wlgfrmi" className="flex min-h-[44px] items-start gap-2 text-sm text-slate-600">
          <input
 data-mbaas-oid="wlgfrmj" type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          />
          <span data-mbaas-oid="wlgfrmk">{copy.verifiedLabel}</span>
        </label>
      )}

      <div data-mbaas-oid="wlgfrml">
        <label data-mbaas-oid="wlgfrmm" htmlFor="wl-notes" className={labelClass}>
          비고 (선택)
        </label>
        <textarea
          data-mbaas-oid="wlgfrmn" id="wl-notes"
          name="notes"
          rows={2}
          defaultValue={initialValues?.notes}
          placeholder="특이사항을 남겨 주세요."
          className={inputClass}
        />
      </div>

      <div data-mbaas-oid="wlgfrmo" className="flex flex-wrap gap-3">
        <Button data-mbaas-oid="wlgfrmp" type="submit" size="md">
          {mode === 'create' ? '기록 추가하기' : '수정 내용 저장하기'}
        </Button>
        {onCancel && (
          <Button data-mbaas-oid="wlgfrmq" type="button" variant="outline" tone="neutral" size="md" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
}
