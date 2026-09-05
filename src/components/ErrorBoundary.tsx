// 라우트 단위 에러 경계. 한 컴포넌트가 예외를 던져도 화면 전체가 하얘지지 않고 복구 버튼을 보여준다.
import React from 'react'

interface Props {
  children: React.ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AWOS] 화면 오류', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-300">문제가 생겼어요</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-white">화면을 그리는 중 오류가 발생했어요</h1>
        <p className="mt-3 text-sm text-slate-400">
          기록은 이 브라우저에 그대로 남아 있어요. 새로고침하면 대부분 해결되고, 반복되면 문의함으로 아래 내용을 보내주세요.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-control border border-white/10 bg-white/[0.04] p-3 text-left text-[11px] text-slate-400">
          {this.state.error.message}
        </pre>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-control bg-sky px-4 py-2 text-sm font-semibold text-navy hover:opacity-90"
          >
            새로고침
          </button>
          <a href="/" className="rounded-control border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/30">
            홈으로
          </a>
        </div>
      </div>
    )
  }
}
