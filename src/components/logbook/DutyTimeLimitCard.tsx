import React, { useMemo } from 'react'
import { TimerReset } from 'lucide-react'

import { InfoTip } from '../InfoTip'

import type { LogbookEntry } from '../../types/logbook'
import { computeDutyTimeLimits } from '../../lib/dutyTimeLimits'

interface DutyTimeLimitCardProps {
  entries: LogbookEntry[]
  /** true면 히어로 등 좁은 영역에 맞춘 축약형으로 렌더링해요. */
  compact?: boolean
  /** v1.1 — 운항형태. commercial이면 승무원 편성별 한도 미반영 경고를 띄운다 */
  operationType?: 'general' | 'commercial'
}

/**
 * 시행규칙 별표 18 기장 1명 편성 기준 누적 승무시간 한도(24시간 8h / 28일 100h / 365일 1,000h)를
 * 계산해 "지금 비행해도 괜찮은지"와 "오늘 몇 시간 더 비행 가능한지"만 간단히 보여주는 카드.
 */
export function DutyTimeLimitCard({ entries, compact = false, operationType = 'general' }: DutyTimeLimitCardProps) {
  const limits = useMemo(() => computeDutyTimeLimits(entries), [entries])
  const hasData = entries.length > 0

  const remainingHours = useMemo(() => {
    const remainders = [
      limits.today8h.limit - limits.today8h.used,
      limits.last28d100h.limit - limits.last28d100h.used,
      limits.last365d1000h.limit - limits.last365d1000h.used,
    ]
    const min = Math.min(...remainders)
    return min > 0 ? min : 0
  }, [limits])

  const isGo = remainingHours > 0

  return (
    <div
      className={`rounded-card border border-white/10 bg-white/[0.04] backdrop-blur ${
        compact ? 'p-4' : 'p-cardpad'
      }`}
    >
      <div className="flex items-center gap-2">
        <TimerReset className="h-4 w-4 text-sky" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide text-sky">
          승무시간 한도
        </p>
      </div>

      {operationType === 'commercial' ? (
        <p className="mt-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-200">
          운송사업은 승무원 편성에 따라 한도가 달라요. 아래는 1인 조종 기준 참고치예요.
        </p>
      ) : null}

      {!hasData ? (
        <p className="mt-3 text-xs text-slate-400">
          비행 기록을 등록하면 오늘 비행 가능 여부와 남은 시간이 표시돼요.
          <DutyTimeDisclaimer compact operationType={operationType} />
        </p>
      ) : (
        <div className={compact ? 'mt-3' : 'mt-6'}>
          <span role="status"
            className={`inline-flex items-center rounded-control px-2.5 py-1 text-xs font-bold ${
              isGo ? 'bg-go/15 text-go' : 'bg-rose-500/100/15 text-rose-300'
            }`}
          >
            {isGo ? 'GO' : 'NO-GO'}
          </span>
          <p className="mt-2 text-sm text-slate-200">
            오늘 최대{' '}
            <span className="font-mono-data font-bold text-white">
              {remainingHours.toFixed(1)}시간
            </span>{' '}
            더 비행 가능해요.
            <DutyTimeDisclaimer compact={compact} operationType={operationType} />
          </p>
        </div>
      )}
    </div>
  )
}

/** 면책·기준 설명은 ⓘ 아이콘 뒤로(폰에서 본문보다 설명이 길어 보이던 것 정리) */
function DutyTimeDisclaimer({ compact = false, operationType }: { compact?: boolean; operationType?: string }) {
  return (
    <span className={`${compact ? 'ml-1' : 'ml-1.5'} inline-flex align-middle`}>
      <InfoTip label="승무시간 한도 근거">
        시행규칙 별표 18(기장 1명 편성)의 한도로 계산해요: 24시간 8h · 28일 100h · 365일 1,000h.
        {operationType === 'commercial'
          ? ' 운송사업은 승무원 편성에 따라 달라지니 회사 운항규정을 우선하세요.'
          : ' 자가용·훈련 비행에는 법정 한도가 아니지만, 훈련원 규정으로 적용하는 곳이 있어요.'}
      </InfoTip>
    </span>
  )
}
