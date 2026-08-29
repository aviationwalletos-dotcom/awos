import React from 'react'

// 코너 브래킷 프레임 — 업로드된 컨셉의 시그니처 모티프.
// 패널 네 모서리에 14px 눈금을 그려 관제 HUD/설계도면의 기술 문서 감각을 만든다.
// 랜딩 전용: 앱 내부(운영 화면)는 부드러운 라운드 카드를 유지한다는 원칙에 따라
// 이 컴포넌트는 랜딩 섹션에서만 사용한다.

interface TechFrameProps {
  children: React.ReactNode
  className?: string
}

const CORNER_BASE = 'pointer-events-none absolute h-3.5 w-3.5 border-white/25'

export function TechFrame({ children, className = '' }: TechFrameProps) {
  return (
    <div className={`relative border border-white/10 ${className}`}>
      <span aria-hidden="true" className={`${CORNER_BASE} -left-px -top-px border-l border-t`} />
      <span aria-hidden="true" className={`${CORNER_BASE} -right-px -top-px border-r border-t`} />
      <span aria-hidden="true" className={`${CORNER_BASE} -bottom-px -left-px border-b border-l`} />
      <span aria-hidden="true" className={`${CORNER_BASE} -bottom-px -right-px border-b border-r`} />
      {children}
    </div>
  )
}
