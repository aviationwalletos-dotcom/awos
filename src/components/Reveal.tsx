import React from 'react'

import { useRevealOnIntersect } from '../hooks/useRevealOnIntersect'

interface RevealProps {
  className?: string
  children: React.ReactNode
}

export function Reveal({ className = '', children }: RevealProps) {
  const ref = useRevealOnIntersect<HTMLDivElement>()

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  )
}
