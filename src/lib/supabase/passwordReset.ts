// 비밀번호 재설정 — Supabase GoTrue의 /recover(메일 발송)와 /user(새 비밀번호 저장)를 직접 호출한다.
// 메일의 링크는 Supabase 대시보드 Auth → URL Configuration의 Site URL/Redirect URLs 설정을 따른다.

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

const AUTH_BASE = `${SUPABASE_URL}/auth/v1`

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/reset-password`
  const response = await fetch(`${AUTH_BASE}/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { msg?: string; error_description?: string } | null
    throw new Error(body?.msg || body?.error_description || '재설정 메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/** 메일 링크로 돌아온 URL 해시(#access_token=...)에서 복구 토큰을 꺼낸다. */
export function parseRecoveryToken(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('access_token')
}

export async function updatePasswordWithToken(accessToken: string, newPassword: string): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/user`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password: newPassword }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { msg?: string } | null
    throw new Error(body?.msg || '비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있으니 재설정 메일을 다시 요청해 주세요.')
  }
}
