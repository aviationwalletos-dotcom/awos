// InfoTip — 설명글을 ⓘ 아이콘 뒤로 숨기는 공용 부품.
//  - 데스크톱: 마우스를 올리면 풍선. 키보드 포커스에도 열린다.
//  - 폰: 터치하면 열리고, 다시 터치하거나 바깥을 누르면 닫힌다.
//  - 스크린리더: aria-describedby 로 본문을 읽어 준다.
// 폰에서 회색 설명이 본문보다 많아 산만해지는 걸 줄이기 위해 도입(2026-09-06).

import { Info } from 'lucide-react'
import React, { useEffect, useId, useRef, useState } from 'react'

interface InfoTipProps {
  /** 풍선 안 내용(문장 또는 짧은 목록) */
  children: React.ReactNode
  /** 아이콘의 접근성 이름. 기본 "설명 보기" */
  label?: string
  /** 아이콘 크기 */
  size?: 'sm' | 'md'
  /** 풍선이 열리는 방향. 기본 아래 */
  side?: 'top' | 'bottom'
  /** 아이콘 옆에 붙이는 짧은 텍스트(예: "참고") */
  hint?: string
  className?: string
}

export function InfoTip({ children, label = '설명 보기', size = 'sm', side = 'bottom', hint, className = '' }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false) // 터치/클릭으로 연 상태(마우스가 떠나도 유지)
  const rootRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setPinned(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setPinned(false)
      }
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iconClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <span ref={rootRef} className={`relative inline-flex items-center align-middle ${className}`}>
      <button type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          const next = !(open && pinned)
          setOpen(next)
          setPinned(next)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned) setOpen(false)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false)
        }}
        className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center gap-1 rounded-full text-slate-400 hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        <Info className={iconClass} aria-hidden="true" />
        {hint && <span className="text-[11px] font-medium">{hint}</span>}
      </button>
      {open && (
        <span id={id}
          role="tooltip"
          className={`absolute left-1/2 z-40 w-[min(78vw,320px)] -translate-x-1/2 rounded-control border border-white/15 bg-panel px-3 py-2.5 text-left text-xs leading-relaxed text-slate-200 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]
            ${side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {children}
        </span>
      )}
    </span>
  )
}
