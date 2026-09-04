import React from 'react'

export type StatusBadgeTone = 'success' | 'pending' | 'danger' | 'neutral'
export type StatusBadgeSurface = 'light' | 'dark'

interface StatusBadgeProps {
  tone: StatusBadgeTone
  label: string
  /** lucide-react 아이콘 컴포넌트 (선택). 지정하지 않으면 텍스트만 표시합니다. */
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  /** icon 대신 작은 상태 점(dot)을 표시합니다(GO/NO-GO 등 상태 표시에 사용). */
  dot?: boolean
  /** 배지가 올라가는 배경 맥락. 밝은 카드(white)는 'light', 어두운 카드(navy)는 'dark'. */
  surface?: StatusBadgeSurface
  /** 테두리를 함께 표시할지 여부 (일부 화면은 테두리가 있는 스타일을 사용합니다). */
  bordered?: boolean
  className?: string
}

const DOT_TONE_CLASS: Record<StatusBadgeTone, string> = {
  success: 'bg-go',
  pending: 'bg-amber-400',
  danger: 'bg-rose-500/100',
  neutral: 'bg-slate-400',
}

const FILL_CLASSES: Record<StatusBadgeSurface, Record<StatusBadgeTone, string>> = {
  light: {
    success: 'bg-go/10 text-go',
    pending: 'bg-amber-400/15 text-amber-300',
    danger: 'bg-rose-500/100/15 text-rose-300',
    neutral: 'bg-white/[0.07] text-slate-400',
  },
  dark: {
    success: 'bg-go/10 text-go',
    pending: 'bg-amber-400/10 text-amber-300',
    danger: 'bg-rose-500/100/10 text-rose-300',
    neutral: 'bg-white/10 text-slate-400',
  },
}

const BORDER_CLASSES: Record<StatusBadgeSurface, Record<StatusBadgeTone, string>> = {
  light: {
    success: 'border border-go/30 bg-go/10 text-go',
    pending: 'border border-amber-400/40 bg-amber-400/15 text-amber-300',
    danger: 'border border-rose-400/40 bg-rose-500/100/15 text-rose-300',
    neutral: 'border border-white/10 text-slate-400',
  },
  dark: {
    success: 'border border-go/30 bg-go/10 text-go',
    pending: 'border border-amber-400/30 bg-amber-400/10 text-amber-300',
    danger: 'border border-rose-500/30 bg-rose-500/100/10 text-rose-300',
    neutral: 'border border-white/15 text-slate-400',
  },
}

/**
 * 승인/대기/반려 등 상태 의미를 화면 전반에서 통일해 표시하는 공용 배지입니다.
 * tone은 항상 success=완료/승인/GO(초록), pending=대기중(주황), danger=반려/NO-GO/오류(빨강),
 * neutral=중립 상태를 의미합니다. 배경 맥락(밝은 카드/어두운 카드)에 따라 surface를 지정해
 * 대비를 유지하세요.
 */
export function StatusBadge({ tone, label, icon: Icon, dot = false, surface = 'light', bordered = false, className = '' }: StatusBadgeProps) {
  const toneClass = (bordered ? BORDER_CLASSES : FILL_CLASSES)[surface][tone]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-bold ${toneClass} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONE_CLASS[tone]}`} aria-hidden="true" />}
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden={true} />}
      {label}
    </span>
  )
}
