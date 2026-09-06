// InfoTip — 설명글을 ⓘ 아이콘 뒤로 숨기는 공용 부품.
//  - 데스크톱: 마우스를 올리면 풍선. 키보드 포커스에도 열린다.
//  - 폰: 터치하면 열리고, 다시 터치하거나 바깥을 누르면 닫힌다.
//  - 스크린리더: aria-describedby 로 본문을 읽어 준다.
// 폰에서 회색 설명이 본문보다 많아 산만해지는 걸 줄이기 위해 도입(2026-09-06).

import { Info } from 'lucide-react'
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
      const t = e.target as Node
      if (!rootRef.current?.contains(t) && !tipRef.current?.contains(t)) {
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

  // [폰 화면 잘림 방지] 풍선을 화면 좌표(fixed)로 두고, 아이콘 위치를 재서 화면 안(좌우 8px 여백)에 들어오게 자리를 잡는다.
  // 아이콘이 화면 왼쪽 가장자리에 있을 때 가운데 정렬 풍선이 왼쪽으로 잘려 나가던 문제(2026-09-06).
  // 스크롤/회전하면 위치가 어긋나므로 닫는다.
  const tipRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null)
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const place = () => {
      const anchor = rootRef.current?.getBoundingClientRect()
      const tip = tipRef.current?.getBoundingClientRect()
      if (!anchor || !tip) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const margin = 8
      const width = tip.width
      let left = anchor.left + anchor.width / 2 - width / 2
      left = Math.max(margin, Math.min(left, vw - width - margin))
      const preferAbove = side === 'top' || anchor.bottom + tip.height + 12 > vh
      const above = preferAbove && anchor.top - tip.height - 6 > margin
      const top = above ? anchor.top - tip.height - 6 : anchor.bottom + 6
      setPos({ left, top, above })
    }
    place()
    const close = () => {
      setOpen(false)
      setPinned(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', close, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', close, { capture: true } as EventListenerOptions)
    }
  }, [open, side])

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
      {/* 풍선은 body 에 포털로 띄운다 — 부모에 transform(Reveal 애니메이션 등)이 있으면 fixed 좌표가 어긋나
          엉뚱한 곳에 뜨거나 화면 밖으로 나가던 문제(2026-09-06) */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span id={id}
            ref={tipRef}
            role="tooltip"
            style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
            className="fixed z-[60] w-[min(calc(100vw-16px),320px)] rounded-control border border-white/15 bg-panel px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]"
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  )
}
