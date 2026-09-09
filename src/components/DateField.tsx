// DateField — 날짜 입력 부품.
// 폰의 네이티브 달력이 느리고 직관적이지 않다는 피드백(지훈)으로, 숫자 8자리 입력을 기본으로 한다:
//   "20260907" 을 치면 "2026-09-07" 로 자동 정리. "2026-09-07" 처럼 이미 정리된 값도 그대로 받는다.
// 옆의 달력 버튼은 브라우저 달력을 연다(지원 브라우저). 값은 항상 YYYY-MM-DD 문자열로 부모/폼에 전달된다.
// name 이 있으면 FormData 로도 읽힌다(폼 제출 방식과 상태 방식 모두 지원).

import { CalendarDays } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

interface DateFieldProps {
  id: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  disabled?: boolean
  min?: string
  max?: string
}

/** 입력 문자열을 YYYY-MM-DD 로 정리한다. 미완성이면 정리 중인 부분 문자열을 돌려준다. */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export function isCompleteDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

export function DateField({ id, name, value, defaultValue, onChange, className = '', placeholder = '예: 20260907', disabled, min, max, ...aria }: DateFieldProps) {
  const isControlled = value !== undefined
  const [inner, setInner] = useState(defaultValue ?? '')
  const current = isControlled ? (value ?? '') : inner
  const pickerRef = useRef<HTMLInputElement>(null)

  // 부모가 defaultValue 를 바꿔 주는 경우(예: 카테고리 바꿀 때 발급일 자동 채움)
  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) setInner(defaultValue)
  }, [defaultValue, isControlled])

  const commit = (next: string) => {
    if (!isControlled) setInner(next)
    onChange?.(next)
  }

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    try {
      if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
        ;(el as HTMLInputElement & { showPicker: () => void }).showPicker()
      } else {
        el.focus()
        el.click()
      }
    } catch {
      el.focus()
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        onChange={(e) => commit(formatDateInput(e.target.value))}
        onBlur={(e) => {
          // 흐트러진 값(예: 2026-9-7)은 blur 때 한 번 더 정리
          const fixed = formatDateInput(e.target.value)
          if (fixed !== e.target.value) commit(fixed)
        }}
        className={`${className} pr-11 font-mono-data tabular-nums`}
        aria-invalid={aria['aria-invalid']}
        aria-describedby={aria['aria-describedby']}
      />
      {/* 브라우저 달력 — 화면엔 안 보이고 버튼으로만 연다 */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={isCompleteDate(current) ? current : ''}
        min={min}
        max={max}
        onChange={(e) => commit(e.target.value)}
        className="pointer-events-none absolute right-2 top-1/2 h-1 w-1 -translate-y-1/2 opacity-0"
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label="달력에서 날짜 고르기"
        className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-slate-400 hover:bg-white/5 hover:text-sky
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:opacity-40"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
