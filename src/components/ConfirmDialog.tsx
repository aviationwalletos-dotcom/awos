// 앱 내 확인 대화상자. window.confirm 대체 — 모바일·PWA에서 OS 기본 창(제목에 도메인이 붙음) 대신 앱 톤으로.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => setPending({ ...opts, resolve }))
  }, [])

  const close = (value: boolean) => {
    pending?.resolve(value)
    setPending(null)
  }

  useEffect(() => {
    if (!pending) return
    confirmBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cfm-title"
            aria-describedby="cfm-msg"
            className="w-full max-w-sm rounded-card border border-white/10 bg-[#0B1220] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cfm-title" className="font-display text-base font-extrabold text-white">{pending.title ?? '확인'}</h2>
            <p id="cfm-msg" className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{pending.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="min-h-[40px] rounded-control border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:border-white/30"
              >
                {pending.cancelLabel ?? '취소'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => close(true)}
                className={`min-h-[40px] rounded-control px-4 text-sm font-semibold ${pending.danger ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-sky text-navy hover:opacity-90'}`}
              >
                {pending.confirmLabel ?? '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) {
    // Provider 밖에서 쓰였을 때의 안전한 폴백
    return (options) => Promise.resolve(window.confirm(typeof options === 'string' ? options : options.message))
  }
  return fn
}
