// 접었다 펴는 섹션. 기본은 접힘. 헤더에 제목·요약(상태 배지 등)을 두고, 펼치면 본문이 보인다.
import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleProps {
  title: React.ReactNode
  /** 접힌 상태에서도 보이는 요약(오른쪽) */
  summary?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  id?: string
}

export function Collapsible({ title, summary, defaultOpen = false, children, className = '', id }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = id ? `${id}-body` : undefined
  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-3 rounded-control py-2 text-left hover:bg-white/[0.03]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="min-w-0 font-display text-base font-extrabold text-ink sm:text-lg">{title}</span>
        </span>
        {summary && <span className="flex shrink-0 items-center gap-2 text-xs">{summary}</span>}
      </button>
      {open && (
        <div id={bodyId} className="mt-2">
          {children}
        </div>
      )}
    </section>
  )
}
