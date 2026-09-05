import React, { useState } from 'react'
import { Landmark } from 'lucide-react'

import { getTsIntegrationStatus, hasRequestedTsNotify, requestTsNotify } from '../../lib/tsIntegration'

// 자격증 관리 탭 상단의 TS(한국교통안전공단) 자격 연동 카드.
//
// 연동 개통 전에도 자리를 명시해 두는 이유:
//  1) 사용자에게 "직접 입력이 최종 형태가 아니다"라는 로드맵을 알린다.
//  2) 알림 신청 수가 쌓이면 공단에 연동을 요청할 때 수요 근거가 된다.

export function TsIntegrationCard() {
  const status = getTsIntegrationStatus()
  const [requested, setRequested] = useState(hasRequestedTsNotify)

  if (status === 'linked') return null

  const unavailable = status === 'unavailable'

  return (
    <div className="rounded-card border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-control border border-sky/30 bg-sky/10">
            <Landmark className="h-4.5 w-4.5 text-sky" aria-hidden="true" />
          </span>
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink">
              자격 정보 자동 불러오기
              {unavailable && (
                <span className="rounded bg-sky/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky">준비 중</span>
              )}
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-400">
              한국교통안전공단(TS) 자격 정보 연동을 준비하고 있어요. 연동이 열리면 보유 자격과 유효기간을
              직접 입력하지 않고 불러올 수 있어요. 그때까지는 아래에서 직접 등록해 주세요.
            </p>
          </div>
        </div>

        {unavailable &&
          (requested ? (
            <span className="rounded-control border border-go/40 bg-go/10 px-3.5 py-2 text-sm font-medium text-go">
              알림 신청됨
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                requestTsNotify()
                setRequested(true)
              }}
              className="rounded-control border border-dashed border-sky/45 px-3.5 py-2 text-sm font-medium text-sky transition-colors hover:bg-sky/10"
            >
              연동 시 알림 받기
            </button>
          ))}
      </div>
    </div>
  )
}
