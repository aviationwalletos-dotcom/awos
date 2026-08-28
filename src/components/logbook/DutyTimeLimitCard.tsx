import React, { useMemo } from 'react'
import { Info, TimerReset } from 'lucide-react'

import type { LogbookEntry } from '../../types/logbook'
import { computeDutyTimeLimits } from '../../lib/dutyTimeLimits'

interface DutyTimeLimitCardProps {
  entries: LogbookEntry[]
  /** true면 히어로 등 좁은 영역에 맞춘 축약형으로 렌더링합니다. */
  compact?: boolean
}

/**
 * 항공안전법상 조종사 누적 승무시간 법정 한도(하루 8h / 7일 35h / 30일 100h / 365일 1,000h)를
 * 계산해 "지금 비행해도 괜찮은지"와 "오늘 몇 시간 더 비행 가능한지"만 간단히 보여주는 카드.
 */
export function DutyTimeLimitCard({ entries, compact = false }: DutyTimeLimitCardProps) {
  const limits = useMemo(() => computeDutyTimeLimits(entries), [entries])
  const hasData = entries.length > 0

  const remainingHours = useMemo(() => {
    const remainders = [
      limits.today8h.limit - limits.today8h.used,
      limits.last7d35h.limit - limits.last7d35h.used,
      limits.last30d100h.limit - limits.last30d100h.used,
      limits.last365d1000h.limit - limits.last365d1000h.used,
    ]
    const min = Math.min(...remainders)
    return min > 0 ? min : 0
  }, [limits])

  const isGo = remainingHours > 0

  return (
    <div
      data-mbaas-oid="dtlwrap"
      className={`rounded-card border border-white/10 bg-white/[0.04] backdrop-blur ${
        compact ? 'p-4' : 'p-cardpad'
      }`}
    >
      <div data-mbaas-oid="dtlhead" className="flex items-center gap-2">
        <TimerReset className="h-4 w-4 text-sky" aria-hidden="true" />
        <p data-mbaas-oid="bkzxabl" className="text-xs font-semibold uppercase tracking-wide text-sky">
          승무시간 한도
        </p>
      </div>

      {!hasData ? (
        <p data-mbaas-oid="7does0q" className="mt-3 text-xs text-slate-400">
          비행 기록을 등록하면 오늘 비행 가능 여부와 남은 비행 가능 시간이 표시됩니다.
        </p>
      ) : (
        <div data-mbaas-oid="dtlbody" className={compact ? 'mt-3' : 'mt-6'}>
          <span

            data-mbaas-oid="6089ypr" role="status"
            className={`inline-flex items-center rounded-control px-2.5 py-1 text-xs font-bold ${
              isGo ? 'bg-go/15 text-go' : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            {isGo ? 'GO' : 'NO-GO'}
          </span>
          <p data-mbaas-oid="oksqvds" className="mt-2 text-sm text-slate-200">
            오늘 최대{' '}
            <span data-mbaas-oid="39z1g32" className="font-mono-data font-bold text-white">
              {remainingHours.toFixed(1)}시간
            </span>{' '}
            더 비행 가능합니다.
          </p>
        </div>
      )}

      <DutyTimeDisclaimer compact={compact} />
    </div>
  )
}

function DutyTimeDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p data-mbaas-oid="dtlnote" className={`${compact ? 'mt-3' : 'mt-6'} flex items-start gap-1.5 text-[11px] text-slate-500`}>
      <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      이 계산은 항공안전법상 승무시간 제한 규정을 참고한 자동 계산이며, 실제 법적 판단은 소속 기관/관련 규정을 통해
      확인해야 합니다.
    </p>
  )
}
