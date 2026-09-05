// 짧은 확인 알림("추가됐어요" 등). 화면 하단 중앙에 2.5초 떠 있다가 사라진다.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function useToast(): { toast: React.ReactNode; showToast: (message: string) => void } {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const showToast = useCallback((next: string) => {
    setMessage(next)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setMessage(null), 2500)
  }, [])

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  const toast = message ? (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center gap-2 rounded-control border border-go/40 bg-[#0B1220]/95 px-4 py-2.5 text-sm font-semibold text-go shadow-lg backdrop-blur">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {message}
      </div>
    </div>
  ) : null

  return { toast, showToast }
}
