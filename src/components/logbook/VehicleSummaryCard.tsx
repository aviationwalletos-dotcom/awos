// 로그북 첫 화면(초경량 구분)의 오른쪽 칸 — 내 기체 요약. 등록·삭제는 "기록 입력·가져오기" 탭의 내 기체에서.
import { Plane } from 'lucide-react'

import { vehicleKindLabel } from '../../lib/tracks'
import { daysUntil } from '../../types/certificate'
import { vehicleDisplayName } from '../../types/vehicle'
import type { Vehicle } from '../../types/vehicle'

interface Props {
  vehicles: Vehicle[]
  onManage?: () => void
}

export function VehicleSummaryCard({ vehicles, onManage }: Props) {
  return (
    <div data-mbaas-oid="vehsum" className="flex h-full flex-col rounded-card border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky">내 기체</p>
          <p className="mt-0.5 text-sm text-slate-400">{vehicles.length > 0 ? `${vehicles.length}대 등록` : '등록된 기체가 없어요'}</p>
        </div>
        {onManage && (
          <button type="button" onClick={onManage} className="rounded-control border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:border-white/30">
            관리
          </button>
        )}
      </div>
      {vehicles.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          기록 입력 탭의 "내 기체"에서 종류·신고번호·인증검사일을 한 번 등록하면 기록과 증명서에 자동으로 붙어요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {vehicles.slice(0, 4).map((v) => {
            const d = v.inspectionValidUntil ? daysUntil(v.inspectionValidUntil) : null
            const tone = v.inspectionExempt ? 'text-slate-400' : d === null ? 'text-slate-500' : d < 0 ? 'text-rose-300' : d <= 30 ? 'text-amber-300' : 'text-go'
            return (
              <li key={v.id} className="flex items-start justify-between gap-2 rounded-control border border-white/10 bg-navy px-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                    <Plane className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
                    {vehicleDisplayName(v)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{vehicleKindLabel(v.kindKey)}{v.classLabel ? ` · ${v.classLabel}` : ''}</p>
                </div>
                <p className={`shrink-0 text-[11px] font-semibold ${tone}`}>
                  {v.inspectionExempt ? '인증 면제' : v.inspectionValidUntil ? (d! < 0 ? `인증 만료 ${Math.abs(d!)}일` : `인증 D-${d}`) : '인증 미입력'}
                </p>
              </li>
            )
          })}
          {vehicles.length > 4 && <li className="text-[11px] text-slate-500">외 {vehicles.length - 4}대</li>}
        </ul>
      )}
    </div>
  )
}
