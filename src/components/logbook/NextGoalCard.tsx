// 로그북 첫 화면 오른쪽 칸 — 다음 목표(응시경력 진척도 요약). 기록이 없으면 제목만.
import { useMemo } from 'react'
import { CheckCircle2, Target } from 'lucide-react'

import { computeNextGoals } from '../../lib/eligibility/nextGoal'
import type { PilotTrack } from '../../lib/tracks'
import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'
import type { Vehicle } from '../../types/vehicle'

interface Props {
  track: PilotTrack
  entries: LogbookEntry[]
  certificates: Certificate[]
  vehicles?: Vehicle[]
  onOpenDetail?: () => void
}

export function NextGoalCard({ track, entries, certificates, vehicles = [], onOpenDetail }: Props) {
  const goals = useMemo(() => {
    if (track !== 'lsa' && track !== 'ultralight') return []
    const byId = Object.fromEntries(vehicles.map((v) => [v.id, v.classLabel]))
    return computeNextGoals(track, entries, certificates, byId)
  }, [track, entries, certificates, vehicles])
  const hasRef = goals.some((g) => g.referenceOnly)
  return (
    <div className="flex h-full flex-col rounded-card border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky">
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          응시경력 진척도
        </p>
        {onOpenDetail && goals.length > 0 && (
          <button type="button" onClick={onOpenDetail} className="text-[11px] text-slate-400 underline hover:text-sky">
            자세히
          </button>
        )}
      </div>
      {goals.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">비행기록이 쌓이면 다음 목표(조종자증명 → 지도조종자 → 실기평가조종자)가 여기 표시돼요.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {goals.map((g) => {
            const pct = g.primary && g.primary.required > 0 ? Math.min(100, Math.round((g.primary.current / g.primary.required) * 100)) : 0
            return (
              <li key={g.id} className="rounded-control border border-white/10 bg-navy px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-ink">{g.title}</p>
                  {g.done ? (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-go">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      완료
                    </span>
                  ) : g.primary ? (
                    <span className="shrink-0 font-mono-data text-[11px] tabular-nums text-slate-300">
                      {g.primary.current.toFixed(1)} / {g.primary.required}
                      {g.primary.unit}
                    </span>
                  ) : null}
                </div>
                {!g.done && g.primary && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${pct >= 100 ? 'bg-go' : 'bg-sky'}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                {g.hint && !g.done && <p className="mt-1 text-[10px] text-slate-500">{g.hint}</p>}
              </li>
            )
          })}
        </ul>
      )}
      {hasRef && <p className="mt-3 text-[10px] leading-relaxed text-slate-500">무인은 앱 기록 기준 참고치예요. 응시경력은 교육기관 증명서로만 인정돼요.</p>}
    </div>
  )
}
