import React, { useEffect, useState } from 'react'

import { INSTITUTION_OPTIONS, INSTITUTION_OTHER_VALUE } from '../data/institutions'

interface InstitutionSelectProps {
  /** id/htmlFor 충돌을 피하기 위한 접두어 (예: 'signup-affiliation') */
  idPrefix: string
  /** 최종 선택/입력된 소속 기관 문자열. 목록에 없는 값이면 자동으로 '기타'로 처리된다. */
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  helperText?: string
}

/**
 * 소속 기관을 고정 목록에서 선택하는 컴포넌트. '기타' 선택 시 보조 텍스트 입력이 나타나
 * 목록에 없는 기관명도 직접 등록할 수 있다. 회원가입/계정정보 화면에서 공통으로 사용한다.
 */
export function InstitutionSelect({
  idPrefix,
  value,
  onChange,
  label = '소속 기관',
  required = false,
  helperText,
}: InstitutionSelectProps) {
  const knownOptions: readonly string[] = INSTITUTION_OPTIONS

  function deriveSelected(v: string): string {
    if (!v) return ''
    return knownOptions.includes(v) ? v : INSTITUTION_OTHER_VALUE
  }
  function deriveCustom(v: string): string {
    if (!v) return ''
    return knownOptions.includes(v) ? '' : v
  }

  const [selected, setSelected] = useState<string>(() => deriveSelected(value))
  const [customValue, setCustomValue] = useState<string>(() => deriveCustom(value))

  // 외부에서 value가 바뀌면(예: 계정 저장값 로드) 내부 상태를 동기화한다.
  useEffect(() => {
    setSelected(deriveSelected(value))
    setCustomValue(deriveCustom(value))
  }, [value])

  function handleSelectChange(next: string) {
    setSelected(next)
    if (next === INSTITUTION_OTHER_VALUE) {
      onChange(customValue.trim())
    } else {
      setCustomValue('')
      onChange(next)
    }
  }

  function handleCustomChange(next: string) {
    setCustomValue(next)
    onChange(next.trim())
  }

  const selectId = `${idPrefix}-select`
  const customId = `${idPrefix}-custom`

  return (
    <div data-mbaas-oid="insts01" className="flex flex-col gap-1.5">
      <label data-mbaas-oid="insts02" htmlFor={selectId} className="text-xs font-semibold text-slate-300">
        {label}
        {!required && ' (선택)'}
      </label>
      <select
        data-mbaas-oid="insts03" id={selectId}
        value={selected}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        <option data-mbaas-oid="insts04" value="" disabled>
          소속 기관을 선택해주세요
        </option>
        {INSTITUTION_OPTIONS.map((option) => (
          <option data-mbaas-oid="insts05" key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {selected === INSTITUTION_OTHER_VALUE && (
        <div data-mbaas-oid="insts06" className="flex flex-col gap-1.5">
          <label data-mbaas-oid="insts07" htmlFor={customId} className="text-xs font-semibold text-slate-300">
            기관명 직접 입력
          </label>
          <input
            data-mbaas-oid="insts08" id={customId}
            type="text"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="예: OO비행교육원"
            className="rounded-control border border-white/15 bg-navy px-4 py-3 text-sm text-white placeholder:text-slate-500
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          />
        </div>
      )}

      {helperText && (
        <p data-mbaas-oid="insts09" className="text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
