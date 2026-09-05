// 인앱 브라우저(카카오톡·네이버·인스타그램·페이스북·라인 등) 감지.
//
// 구글은 인앱 브라우저(WebView)에서의 OAuth 로그인을 차단한다(403 disallowed_useragent).
// 카톡으로 받은 링크를 눌러 열면 카톡 안 브라우저라서 "구글로 계속하기"가 실패한다.
// 카카오 로그인은 인앱에서도 되므로, 감지되면 안내 + 외부 브라우저로 열기 버튼을 보여준다.

export type InAppBrowser = 'kakaotalk' | 'naver' | 'instagram' | 'facebook' | 'line' | 'daum' | 'other'

export function detectInAppBrowser(): InAppBrowser | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk'
  if (/NAVER\(inapp|NAVER\//i.test(ua)) return 'naver'
  if (/Instagram/i.test(ua)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook'
  if (/Line\//i.test(ua)) return 'line'
  if (/DaumApps|DaumDevice/i.test(ua)) return 'daum'
  // 안드로이드 일반 WebView(`; wv)`)도 구글이 막는다
  if (/Android/i.test(ua) && /; wv\)/i.test(ua)) return 'other'
  return null
}

export const IN_APP_BROWSER_LABEL: Record<InAppBrowser, string> = {
  kakaotalk: '카카오톡',
  naver: '네이버',
  instagram: '인스타그램',
  facebook: '페이스북',
  line: '라인',
  daum: '다음',
  other: '앱 내부',
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * 외부 브라우저로 현재 주소 열기.
 * - 안드로이드: intent:// 로 크롬 실행(카카오톡·네이버 인앱이 지원). 실패하면 false.
 * - iOS: 앱 간 강제 이동 수단이 없어 false(안내 문구로 유도).
 */
export function openInExternalBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const url = window.location.href
  if (isAndroid()) {
    const bare = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${bare}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
    return true
  }
  return false
}

export async function copyCurrentUrl(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href)
    return true
  } catch {
    return false
  }
}
