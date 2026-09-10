// 오류 모니터링(Sentry). 사용자 화면에서 오류가 나면 관리자 이메일로 알려 준다.
//
// 켜는 법: Netlify 환경변수 VITE_SENTRY_DSN 에 Sentry 프로젝트 DSN 을 넣고 다시 배포. 없으면 아무것도 안 한다(무료 계정 안 만들어도 앱은 그대로).
// 개인정보: 이름·이메일·비행기록은 보내지 않는다. 오류 내용·브라우저·화면 주소만. (개인정보처리방침 4-1에 국외 이전으로 고지됨)
// 요청 본문·응답은 수집하지 않는다(sendDefaultPii=false, 기본 breadcrumb 의 fetch 본문 없음).

import * as Sentry from '@sentry/react'

let installed = false

export function installMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn || installed || !import.meta.env.PROD) return
  installed = true
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: 'production',
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined,
    tracesSampleRate: 0, // 성능 추적은 끔(무료 한도 절약). 오류만.
    beforeSend(event) {
      // 이메일·전화번호처럼 보이는 문자열은 지운다(오류 메시지에 섞여 들어올 수 있음)
      const scrub = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/01[016789]-?\d{3,4}-?\d{4}/g, '[phone]')
      if (event.message) event.message = scrub(event.message)
      for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrub(ex.value)
      if (event.request?.url) event.request.url = event.request.url.replace(/\?.*$/, '')
      delete event.user
      return event
    },
    ignoreErrors: [
      'ResizeObserver loop', // 브라우저 잡음
      'Failed to fetch', // 오프라인·네트워크 끊김은 앱이 자체 처리
      'Load failed',
      'AbortError',
    ],
  })
}

/** 앱 코드에서 잡은 오류를 수동으로 보낼 때 */
export function reportError(err: unknown, context?: Record<string, string | number | boolean>) {
  if (!installed) return
  Sentry.captureException(err, context ? { extra: context } : undefined)
}
