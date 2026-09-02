// 소셜 로그인 — Supabase OAuth 인가 주소로 이동시킨다.
// 로그인 완료 후 /auth/callback 으로 돌아오며, 그 페이지가 세션을 채택한다.

import { SUPABASE_URL } from './env'

export type OAuthProvider = 'google' | 'kakao'

export function startOAuthLogin(provider: OAuthProvider): void {
  const redirectTo = `${window.location.origin}/auth/callback`
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`
}
