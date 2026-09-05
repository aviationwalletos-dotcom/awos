// 인앱 브라우저 안내 배너 — 구글 로그인이 막히는 환경에서 외부 브라우저로 유도한다.
import { ExternalLink, Info } from 'lucide-react'
import React, { useState } from 'react'

import { IN_APP_BROWSER_LABEL, copyCurrentUrl, detectInAppBrowser, isAndroid, isIOS, openInExternalBrowser } from '../lib/ui/inAppBrowser'

export function InAppBrowserNotice({ compact = false }: { compact?: boolean }) {
  const kind = detectInAppBrowser()
  const [copied, setCopied] = useState(false)
  if (!kind) return null
  const label = IN_APP_BROWSER_LABEL[kind]

  return (
    <div role="status" className={`rounded-control border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-100 ${compact ? '' : 'mb-4'}`}>
      <p className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        <span>
          지금 <span className="font-semibold">{label} 안의 브라우저</span>로 열려 있어요. 여기서는 <span className="font-semibold">구글 로그인이 막혀요</span>(구글 정책).
          {kind === 'kakaotalk' ? ' 카카오 로그인은 그대로 돼요.' : ''} 구글로 로그인하려면 크롬·사파리 같은 일반 브라우저로 여세요.
        </span>
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {isAndroid() && (
          <button type="button"
            onClick={() => openInExternalBrowser()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-control bg-amber-300 px-3 text-xs font-bold text-navy hover:bg-amber-200"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            크롬으로 열기
          </button>
        )}
        <button type="button"
          onClick={() => void copyCurrentUrl().then(setCopied)}
          className="inline-flex min-h-[40px] items-center rounded-control border border-amber-300/40 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-400/10"
        >
          {copied ? '주소를 복사했어요' : '주소 복사'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-amber-200/80">
        {isIOS()
          ? '아이폰: 오른쪽 아래 공유(⋯ 또는 ⬆) → "Safari로 열기". 또는 주소를 복사해 Safari 주소창에 붙여넣기.'
          : '안드로이드: 오른쪽 위 ⋮ → "다른 브라우저로 열기". 또는 주소를 복사해 크롬에 붙여넣기.'}
      </p>
    </div>
  )
}
