// 구글·카카오 소셜 로그인 버튼 (로그인·가입 화면 공용)
import React from 'react'

import { startOAuthLogin } from '../lib/supabase/oauth'

function GoogleIcon() {
  return (
    <svg data-mbaas-oid="gicon" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC04" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg data-mbaas-oid="kicon" viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#191919"
        d="M12 3C6.48 3 2 6.55 2 10.93c0 2.82 1.87 5.29 4.68 6.69l-.95 3.53c-.08.31.27.56.54.38l4.18-2.79c.51.06 1.03.1 1.55.1 5.52 0 10-3.55 10-7.91C22 6.55 17.52 3 12 3Z"
      />
    </svg>
  )
}

/**
 * 소셜 로그인 노출 제어 — Supabase에서 아직 Enable 하지 않은 provider의 버튼을 누르면
 * 오류 페이지로 튕기므로, 준비된 것만 켠다. Netlify 환경변수로 켤 수 있다.
 *   VITE_ENABLE_GOOGLE_LOGIN=true / VITE_ENABLE_KAKAO_LOGIN=false
 * (미설정 시 기본값: 구글 OFF, 카카오 ON)
 */
const GOOGLE_ENABLED = import.meta.env?.VITE_ENABLE_GOOGLE_LOGIN === 'true'
const KAKAO_ENABLED = import.meta.env?.VITE_ENABLE_KAKAO_LOGIN !== 'false'

export function SocialLoginButtons() {
  if (!GOOGLE_ENABLED && !KAKAO_ENABLED) return null
  return (
    <div data-mbaas-oid="soc01" className="flex flex-col gap-2.5">
      {GOOGLE_ENABLED && (
      <button
        data-mbaas-oid="soc02" type="button"
        onClick={() => startOAuthLogin('google')}
        className="flex items-center justify-center gap-2.5 rounded-control border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-[#1F1F1F] transition hover:bg-slate-100
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        <GoogleIcon data-mbaas-oid="soc03" />
        구글로 계속하기
      </button>
      )}
      {KAKAO_ENABLED && (
      <button
        data-mbaas-oid="soc04" type="button"
        onClick={() => startOAuthLogin('kakao')}
        className="flex items-center justify-center gap-2.5 rounded-control bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] transition hover:brightness-95
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        <KakaoIcon data-mbaas-oid="soc05" />
        카카오로 계속하기
      </button>
      )}
      <div data-mbaas-oid="soc06" className="my-1 flex items-center gap-3">
        <span data-mbaas-oid="soc07" className="h-px flex-1 bg-white/10" />
        <span data-mbaas-oid="soc08" className="text-xs text-slate-500">또는 이메일로</span>
        <span data-mbaas-oid="soc09" className="h-px flex-1 bg-white/10" />
      </div>
      <p data-mbaas-oid="soc10" className="text-center text-[11px] leading-relaxed text-slate-500">
        소셜 로그인 시 <a data-mbaas-oid="soc11" href="/terms.html" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">이용약관</a>과{' '}
        <a data-mbaas-oid="soc12" href="/privacy.html" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">개인정보처리방침</a>에 동의한 것으로 간주됩니다.
      </p>
    </div>
  )
}
