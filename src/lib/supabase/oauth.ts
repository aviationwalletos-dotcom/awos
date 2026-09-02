// 소셜 로그인 — Supabase OAuth 인가 주소로 이동시킨다.
// 로그인 완료 후 /auth/callback 으로 돌아오며, 그 페이지가 세션을 채택한다.

import { SUPABASE_URL } from './env'

export type OAuthProvider = 'google' | 'kakao'

/**
 * provider별 요청 동의 범위.
 * 카카오는 비즈 앱이 아니면 account_email 권한이 없어, 기본 범위로 요청하면 KOE205가 발생한다.
 * 따라서 닉네임만 요청한다(비즈 앱 전환 후에는 'profile_nickname account_email'로 넓히면 된다).
 */
const SCOPES: Partial<Record<OAuthProvider, string>> = {
  kakao: 'profile_nickname',
}

export function startOAuthLogin(provider: OAuthProvider): void {
  const redirectTo = `${window.location.origin}/auth/callback`
  const scope = SCOPES[provider]
  const scopeParam = scope ? `&scope=${encodeURIComponent(scope)}` : ''
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}${scopeParam}`
}
