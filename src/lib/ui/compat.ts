// 구형 기기 호환 보정 — 앱 시작 전에 한 번 실행한다.
//
// 1) <dialog>.showModal/close: iOS 15.3 이하·구형 안드로이드 WebView 에는 없다.
//    없으면 open 속성 토글로 대체해 상세 다이얼로그가 아예 안 열리는 사고를 막는다(배경 흐림만 없다).
// 2) AbortSignal.timeout: 없으면 fetch 시간 제한을 건너뛴다(supabaseTransport 에서 체크) — 여기선 폴리필만.

export function installCompatShims(): void {
  if (typeof window === 'undefined') return

  const dialogProto: { showModal?: () => void; close?: (v?: string) => void } | undefined =
    typeof HTMLDialogElement !== 'undefined' ? (HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void }) : undefined
  if (!dialogProto || typeof dialogProto.showModal !== 'function') {
    const target = (dialogProto ?? (HTMLElement.prototype as unknown as { showModal?: () => void; close?: () => void }))
    target.showModal = function (this: HTMLElement) {
      this.setAttribute('open', '')
    }
    target.close = function (this: HTMLElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }

  if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as unknown as { timeout?: unknown }).timeout !== 'function') {
    ;(AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = (ms: number) => {
      const c = new AbortController()
      window.setTimeout(() => c.abort(new DOMException('timeout', 'TimeoutError')), ms)
      return c.signal
    }
  }
}
