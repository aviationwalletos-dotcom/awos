// 소셜 로그인 — Supabase OAuth 인가 주소로 이동시킨다.
// 로그인 완료 후 /auth/callback 으로 돌아오며, 그 페이지가 세션을 채택한다.

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'
import { getAuthedAccessToken } from '../baas/supabaseTransport'

export type OAuthProvider = 'google' | 'kakao'

/**
 * provider별 요청 동의 범위.
 * 카카오는 비즈 앱이 아니면 account_email 권한이 없어, 기본 범위로 요청하면 KOE205가 발생한다.
 * 따라서 닉네임만 요청한다(비즈 앱 전환 후에는 'profile_nickname account_email'로 넓히면 된다).
 */
// 비즈 앱 전환 후 Netlify 환경변수 VITE_KAKAO_EMAIL_SCOPE=true 를 추가하면 이메일까지 요청한다.
const KAKAO_EMAIL_SCOPE = import.meta.env?.VITE_KAKAO_EMAIL_SCOPE === 'true'
const SCOPES: Partial<Record<OAuthProvider, string>> = {
  // 카카오: 이메일 플래그가 꺼져 있으면 scopes 를 보내지 않는다 → 카카오 앱에 설정된 기본 동의항목으로 요청된다.
  // (명시 scope 가 앱 동의항목과 조금이라도 어긋나면 KOE205 가 나므로, 비즈 앱 전환 전에는 기본값이 가장 안전하다)
  ...(KAKAO_EMAIL_SCOPE ? { kakao: 'profile_nickname account_email' } : {}),
}

export function startOAuthLogin(provider: OAuthProvider): void {
  const redirectTo = `${window.location.origin}/auth/callback`
  const scope = SCOPES[provider]
  // [BUGFIX] Supabase(GoTrue) /authorize 가 인식하는 파라미터 이름은 'scopes'(복수)다.
  // 이전에는 'scope'(단수)로 보내 값이 통째로 무시됐고, 그 결과
  //  - 카카오는 항상 대시보드 기본 범위로 요청되어 닉네임 제한이 걸리지 않았으며
  //  - VITE_KAKAO_EMAIL_SCOPE=true 로 바꿔도 아무 변화가 없었다.
  // 아래 startLinkProvider()는 처음부터 'scopes'를 쓰고 있어 두 함수의 동작이 서로 달랐다.
  const scopeParam = scope ? `&scopes=${encodeURIComponent(scope)}` : ''
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}${scopeParam}`
}

/** 현재 계정에 연결된 로그인 방법(provider) 목록 — 'email' | 'google' | 'kakao' ... */
export async function fetchLinkedProviders(): Promise<string[]> {
  const token = getAuthedAccessToken()
  if (!token) return []
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const body = (await res.json()) as { identities?: Array<{ provider: string }> }
  return [...new Set((body.identities ?? []).map((i) => i.provider))]
}

/**
 * 로그인한 기존 계정에 소셜 로그인 방법을 연결한다(Supabase 수동 연결).
 * 완료 후 /auth/callback → next 경로로 돌아온다.
 * 사전 조건: Supabase 대시보드 Sign In / Providers → "Allow manual linking" ON
 */
export async function startLinkProvider(provider: OAuthProvider, next = '/account?linked=1'): Promise<void> {
  const token = getAuthedAccessToken()
  if (!token) throw new Error('로그인이 필요합니다.')
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
  const scope = SCOPES[provider]
  const url = new URL(`${SUPABASE_URL}/auth/v1/user/identities/authorize`)
  url.searchParams.set('provider', provider)
  url.searchParams.set('redirect_to', redirectTo)
  url.searchParams.set('skip_http_redirect', 'true')
  if (scope) url.searchParams.set('scopes', scope)
  const res = await fetch(url.toString(), { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } })
  const body = (await res.json().catch(() => null)) as { url?: string; msg?: string; error_description?: string } | null
  if (!res.ok || !body?.url) {
    throw new Error(body?.msg || body?.error_description || '계정 연결을 시작하지 못했습니다. 관리자 설정(Allow manual linking)을 확인해 주세요.')
  }
  window.location.href = body.url
}
