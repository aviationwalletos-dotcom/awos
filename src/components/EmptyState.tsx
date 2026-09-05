import React from 'react'

export type EmptyStateSurface = 'light' | 'dark'

interface EmptyStateProps {
  /** lucide-react 아이콘 컴포넌트. 해당 화면에서 이미 쓰고 있는 아이콘과 맞춰 지정하세요. */
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  description?: string
  /** 배경 맥락. 밝은 카드(white)는 'light', 어두운 카드(navy)는 'dark'. */
  surface?: EmptyStateSurface
  className?: string
}

const SURFACE_CLASSES: Record<EmptyStateSurface, { box: string; icon: string; title: string; description: string }> = {
  light: {
    box: 'border-dashed border-white/15 bg-surface',
    icon: 'text-slate-400',
    title: 'text-ink',
    description: 'text-slate-400',
  },
  dark: {
    box: 'border-dashed border-white/15 bg-white/[0.04]',
    icon: 'text-slate-400',
    title: 'text-white',
    description: 'text-slate-400',
  },
}

/**
 * 데이터가 아직 없을 때 보여주는 공용 빈 상태 안내예요. 아이콘 + 제목 + (선택) 설명으로
 * 구성하며, 각 화면 맥락(밝은 카드/어두운 카드)에 맞춰 대비를 유지해요.
 */
export function EmptyState({ icon: Icon, title, description, surface = 'light', className = '' }: EmptyStateProps) {
  const classes = SURFACE_CLASSES[surface]
  return (
    <div className={`flex flex-col items-center gap-3 rounded-card border ${classes.box} px-6 py-10 text-center ${className}`}
    >
      <Icon className={`h-8 w-8 ${classes.icon}`} aria-hidden={true} />
      <p className={`text-sm font-semibold ${classes.title}`}>
        {title}
      </p>
      {description && (
        <p className={`max-w-sm text-xs ${classes.description}`}>
          {description}
        </p>
      )}
    </div>
  )
}
