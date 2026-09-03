// v1.1 — 초경량 기체 카드. 비행경력증명서(별지 제2호)에 필요한 기체 고정값을 한 번만 등록한다.

import React, { useState } from 'react'
import { Plane, Trash2 } from 'lucide-react'

import { Button } from '../Button'
import { ULTRALIGHT_KINDS, isUnmannedKind, vehicleKindLabel } from '../../lib/tracks'
import { daysUntil } from '../../types/certificate'
import { inferUasClass, vehicleDisplayName } from '../../types/vehicle'
import type { Vehicle, VehicleInput } from '../../types/vehicle'

const inputClass =
  'w-full rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'
const labelClass = 'mb-1 block text-xs font-medium text-slate-300'

interface VehicleCardsProps {
  vehicles: Vehicle[]
  onAdd: (input: VehicleInput) => void
  onDelete: (id: string) => void
}

function numOrUndef(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? '').trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

export function VehicleCards({ vehicles, onAdd, onDelete }: VehicleCardsProps) {
  const [open, setOpen] = useState(vehicles.length === 0)
  const [kindKey, setKindKey] = useState(ULTRALIGHT_KINDS[2].key) // 무인멀티콥터 기본
  const [exempt, setExempt] = useState(false)
  const [mtow, setMtow] = useState('')
  const unmanned = isUnmannedKind(kindKey)
  const autoClass = unmanned ? inferUasClass(Number(mtow) || undefined) : undefined

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const model = String(f.get('model') || '').trim()
    if (!model) return
    onAdd({
      kindKey,
      model,
      registrationNo: String(f.get('registrationNo') || '').trim() || undefined,
      emptyWeightKg: numOrUndef(f.get('emptyWeightKg')),
      mtowKg: numOrUndef(f.get('mtowKg')),
      inspectionExempt: exempt,
      lastInspectionDate: exempt ? undefined : String(f.get('lastInspectionDate') || '').trim() || undefined,
      inspectionValidUntil: exempt ? undefined : String(f.get('inspectionValidUntil') || '').trim() || undefined,
      classLabel: autoClass,
      notes: String(f.get('notes') || '').trim() || undefined,
    })
    e.currentTarget.reset()
    setMtow('')
    setExempt(false)
    setOpen(false)
  }

  return (
    <div data-mbaas-oid="vehwrap" className="rounded-card border border-white/10 bg-white/[0.04] p-4">
      <div data-mbaas-oid="vehhead" className="flex items-center justify-between gap-3">
        <div>
          <p data-mbaas-oid="vehttl" className="text-xs font-semibold uppercase tracking-wide text-sky">내 기체</p>
          <p data-mbaas-oid="vehsub" className="mt-0.5 text-sm text-slate-400">비행경력증명서에 들어가는 기체 정보. 한 번 등록하면 기록마다 자동으로 채워져요.</p>
        </div>
        <Button data-mbaas-oid="vehtog" type="button" size="sm" variant="outline" tone="neutral" onClick={() => setOpen((o) => !o)}>
          {open ? '닫기' : '기체 추가'}
        </Button>
      </div>

      {vehicles.length > 0 && (
        <ul data-mbaas-oid="vehlist" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {vehicles.map((v) => {
            const d = v.inspectionValidUntil ? daysUntil(v.inspectionValidUntil) : null
            const tone = v.inspectionExempt ? 'text-slate-400' : d === null ? 'text-slate-500' : d < 0 ? 'text-rose-300' : d <= 30 ? 'text-amber-300' : 'text-go'
            return (
              <li data-mbaas-oid="vehitem" key={v.id} className="flex items-start justify-between gap-2 rounded-control border border-white/10 bg-navy px-3 py-2">
                <div className="min-w-0">
                  <p data-mbaas-oid="vehname" className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                    <Plane className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
                    {vehicleDisplayName(v)}
                  </p>
                  <p data-mbaas-oid="vehmeta" className="mt-0.5 text-[11px] text-slate-400">
                    {vehicleKindLabel(v.kindKey)}{v.classLabel ? ` · ${v.classLabel}` : ''}
                    {v.mtowKg != null ? ` · MTOW ${v.mtowKg}kg` : ''}
                  </p>
                  <p data-mbaas-oid="vehinsp" className={`mt-0.5 text-[11px] font-semibold ${tone}`}>
                    {v.inspectionExempt
                      ? '안전성인증 면제'
                      : v.inspectionValidUntil
                        ? d! < 0 ? `인증 만료 ${Math.abs(d!)}일 경과 — 이후 비행은 경력 제외` : `인증 유효 D-${d}`
                        : '인증 만료일 미입력'}
                  </p>
                </div>
                <button
                  data-mbaas-oid="vehdel"
                  type="button"
                  onClick={() => { if (window.confirm(`${vehicleDisplayName(v)} 기체를 삭제할까요? 기록은 남고 기체 연결만 끊깁니다.`)) onDelete(v.id) }}
                  className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/10 hover:text-rose-300"
                  aria-label="기체 삭제"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <form data-mbaas-oid="vehform" onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
          <div>
            <label htmlFor="veh-kind" className={labelClass}>종류</label>
            <select id="veh-kind" value={kindKey} onChange={(e) => setKindKey(e.target.value)} className={inputClass}>
              {ULTRALIGHT_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="veh-model" className={labelClass}>형식(모델명)</label>
            <input id="veh-model" name="model" required placeholder="예: DJI Matrice 300 RTK" className={inputClass} />
          </div>
          <div>
            <label htmlFor="veh-reg" className={labelClass}>신고번호 <span className="text-slate-500">(면제 기체면 비워 두세요)</span></label>
            <input id="veh-reg" name="registrationNo" placeholder="예: LM12-034567" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="veh-empty" className={labelClass}>자체중량(kg)</label>
              <input id="veh-empty" name="emptyWeightKg" type="number" step="0.1" min="0" placeholder="연료 제외" className={inputClass} />
            </div>
            <div>
              <label htmlFor="veh-mtow" className={labelClass}>최대이륙중량(kg)</label>
              <input id="veh-mtow" name="mtowKg" type="number" step="0.1" min="0" value={mtow} onChange={(e) => setMtow(e.target.value)} className={inputClass} />
              {autoClass && <p className="mt-1 text-[11px] text-sky">→ {autoClass} 판정</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 sm:col-span-2">
            <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} className="h-4 w-4 accent-sky" />
            안전성인증검사 면제 대상 기체 (증명서에 "면제"로 출력)
          </label>
          {!exempt && (
            <>
              <div>
                <label htmlFor="veh-insp" className={labelClass}>최종인증검사일</label>
                <input id="veh-insp" name="lastInspectionDate" type="date" className={inputClass} />
              </div>
              <div>
                <label htmlFor="veh-valid" className={labelClass}>인증 유효기간 만료일</label>
                <input id="veh-valid" name="inspectionValidUntil" type="date" className={inputClass} />
                <p className="mt-1 text-[11px] text-slate-500">이 날짜 이후 비행은 경력에서 자동 제외돼요(기재요령 주의사항 2).</p>
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="veh-notes" className={labelClass}>메모 (선택)</label>
            <input id="veh-notes" name="notes" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" tone="brand">기체 등록</Button>
          </div>
        </form>
      )}
    </div>
  )
}
