// 계정정보 화면의 접이식 섹션. 자주 안 쓰는 항목(비밀번호 변경·로그인 연결·생년월일·탈퇴)은 접어 두고,
// 제목 줄만 보이게 해 페이지를 짧게 만든다(2026-09-06).

import { ChevronDown, type LucideIcon } from 'lucide-react'
import React, { useState } from 'react'

interface AccountSectionProps {
  title: string
  icon?: LucideIcon
  /** 제목 옆 짧은 상태(예: "연결됨 2개", "승인 대기중") */
  status?: React.ReactNode
  defaultOpen?: boolean
  /** 위험 섹션(탈퇴) */
  tone?: 'default' | 'danger'
  id?: string
  children: React.ReactNode
  className?: string
}

export function AccountSection({ title, icon: Icon, status, defaultOpen = false, tone = 'default', id, children, className = '' }: AccountSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = id ? `${id}-body` : undefined
  const border = tone === 'danger' ? 'border-rose-500/25 bg-rose-500/5' : 'border-white/10 bg-white/5'
  return (
    <section id={id} className={`mt-6 rounded-card border ${border} ${className}`}>
      <button type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-cardpad py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className={`h-4 w-4 shrink-0 ${tone === 'danger' ? 'text-rose-300' : 'text-sky'}`} aria-hidden="true" />}
          <span className={`font-display text-lg font-extrabold ${tone === 'danger' ? 'text-rose-300' : 'text-white'}`}>{title}</span>
          {status && <span className="ml-1 truncate text-xs font-medium text-slate-400">{status}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={bodyId} className="px-cardpad pb-cardpad">
          {children}
        </div>
      )}
    </section>
  )
}
