// MoreMenu — 자주 안 쓰는 동작을 "⋯" 뒤로 모으는 작은 메뉴.
// 폰에서 버튼 4~5개가 목록 위를 두 줄 차지하던 것을 줄인다. 위험한 동작(삭제)은 맨 아래 빨간 글씨로.

import { MoreHorizontal } from 'lucide-react'
import React, { useEffect, useId, useRef, useState } from 'react'

export interface MoreMenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  disabled?: boolean
  /** 삭제 등 위험 동작 — 빨간 글씨, 구분선 아래 */
  danger?: boolean
  title?: string
}

interface MoreMenuProps {
  items: MoreMenuItem[]
  ariaLabel?: string
  className?: string
}

export function MoreMenu({ items, ariaLabel = '더 보기', className = '' }: MoreMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const normal = items.filter((i) => !i.danger)
  const danger = items.filter((i) => i.danger)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-control border border-white/15 text-slate-300 hover:bg-white/5
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
        data-testid="more-menu"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[200px] overflow-hidden rounded-control border border-white/15 bg-panel py-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]"
        >
          {normal.map((item) => (
            <button key={item.key} type="button" role="menuitem"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {danger.length > 0 && normal.length > 0 && <div className="my-1 border-t border-white/10" />}
          {danger.map((item) => (
            <button key={item.key} type="button" role="menuitem"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
