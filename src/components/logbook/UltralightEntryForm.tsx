// v1.1 — 초경량비행장치 기록 입력 폼. "붙임2 비행 로그기록지" 항목 순서를 그대로 따른다.
//   ① 연월일 ② 비행장소 ③ 이륙·착륙 시각 → 비행시간(분) ④ 임무별(기장·훈련·교관) ⑤ 비행목적/훈련내용
//   ⑥ 교육생 ⑦ 지도조종자(성명·자격번호)  + 아워미터(이륙·착륙 시점)
// 무인은 "비행 횟수", 유인(동력비행장치·회전익 등)은 "착륙 횟수"와 FROM/TO 경로를 쓴다(별지 제2호 차이).
// 저장 단위는 앱 전체와 맞춰 "시간"으로 하되, 입력은 로그기록지처럼 "분"으로 받는다(48분 → 0.8h, 둘째자리 버림).

import React, { useMemo, useState } from 'react'

import { Button } from '../Button'
import { isUnmannedKind, vehicleKindLabel } from '../../lib/tracks'
import { FLIGHT_CATEGORIES } from '../../types/logbook'
import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'
import { isInspectionValidOn, vehicleDisplayName } from '../../types/vehicle'
import type { Vehicle } from '../../types/vehicle'

const inputClass =
  'w-full rounded-control border border-white/10 bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink'
const sectionTitleClass = 'text-sm font-bold text-sky'

/** 분 → 시간(소수 첫째자리, 둘째자리부터 버림) — 별지 제2호 기재요령 7 */
export function minutesToHours(min: number): number {
  return Math.floor((min / 60) * 10) / 10
}
export function hoursToMinutes(h: number | undefined): number | '' {
  return h == null ? '' : Math.round(h * 60)
}

function diffMinutes(t1: string, t2: string): number | null {
  const m = (t: string) => {
    const mm = /^(\d{1,2}):(\d{2})$/.exec(t)
    return mm ? Number(mm[1]) * 60 + Number(mm[2]) : null
  }
  const a = m(t1)
  const b = m(t2)
  if (a === null || b === null) return null
  let d = b - a
  if (d < 0) d += 24 * 60 // 자정 넘김
  return d
}

interface UltralightEntryFormProps {
  mode: 'create' | 'edit'
  initialValues?: LogbookEntry
  vehicles: Vehicle[]
  onSubmit: (input: LogbookEntryInput) => void
  onCancel?: () => void
  /** 계정 이름 — 교육생 성명 기본값 */
  holderName?: string
}

interface Errors {
  date?: string
  vehicle?: string
  minutes?: string
  place?: string
}

export function UltralightEntryForm({ mode, initialValues, vehicles, onSubmit, onCancel, holderName }: UltralightEntryFormProps) {
  const [errors, setErrors] = useState<Errors>({})
  const [vehicleId, setVehicleId] = useState(initialValues?.vehicleId ?? vehicles[0]?.id ?? '')
  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const unmanned = vehicle ? isUnmannedKind(vehicle.kindKey) : true

  const [date, setDate] = useState(
    initialValues?.date ?? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
  )
  const [takeoff, setTakeoff] = useState(initialValues?.takeoffTime ?? '')
  const [landing, setLanding] = useState(initialValues?.landingTime ?? '')
  const [minutes, setMinutes] = useState<string>(initialValues ? String(hoursToMinutes(initialValues.blockTime)) : '')
  const [picMin, setPicMin] = useState<string>(String(hoursToMinutes(initialValues?.pilotingTime?.pic)))
  const [trainMin, setTrainMin] = useState<string>(String(hoursToMinutes(initialValues?.pilotingTime?.training)))
  const [instrMin, setInstrMin] = useState<string>(String(hoursToMinutes(initialValues?.pilotingTime?.flightInstructor)))

  // 이륙·착륙 시각을 넣으면 비행시간(분)을 자동 계산(수정 가능)
  const autoMinutes = useMemo(() => (takeoff && landing ? diffMinutes(takeoff, landing) : null), [takeoff, landing])
  function applyAuto() {
    if (autoMinutes !== null) setMinutes(String(autoMinutes))
  }

  const dutyTotal = (Number(picMin) || 0) + (Number(trainMin) || 0) + (Number(instrMin) || 0)
  const totalMin = Number(minutes) || 0
  const inspectionOk = isInspectionValidOn(vehicle, date)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next: Errors = {}
    if (!date) next.date = '연월일을 입력해 주세요.'
    if (vehicles.length > 0 && !vehicleId) next.vehicle = '기체를 선택해 주세요.'
    if (!(totalMin > 0)) next.minutes = '비행시간(분)을 0보다 크게 입력해 주세요.'
    const place = String(f.get('place') || '').trim()
    const placeTo = String(f.get('placeTo') || '').trim()
    if (!place) next.place = '비행장소를 입력해 주세요.'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setErrors({})

    const blockTime = minutesToHours(totalMin)
    const num = (v: FormDataEntryValue | null) => {
      const s = String(v ?? '').trim()
      if (!s) return undefined
      const n = Number(s)
      return Number.isFinite(n) ? n : undefined
    }

    onSubmit({
      vehicleClass: 'ultralight',
      vehicleKind: vehicle?.kindKey ?? initialValues?.vehicleKind,
      vehicleId: vehicleId || undefined,
      date,
      departure: place,
      arrival: unmanned ? place : placeTo || place,
      aircraftType: vehicle?.model ?? initialValues?.aircraftType ?? '초경량비행장치',
      aircraftIdentification: vehicle?.registrationNo ?? initialValues?.aircraftIdentification,
      blockTime,
      flightCategory: FLIGHT_CATEGORIES[0],
      takeoffTime: takeoff || undefined,
      landingTime: landing || undefined,
      hourMeterStart: num(f.get('hourMeterStart')),
      hourMeterEnd: num(f.get('hourMeterEnd')),
      flightCount: unmanned ? num(f.get('flightCount')) : undefined,
      dayLandings: unmanned ? 0 : (num(f.get('landings')) ?? 0),
      nightLandings: 0,
      pilotingTime: {
        pic: picMin ? minutesToHours(Number(picMin)) : undefined,
        training: trainMin ? minutesToHours(Number(trainMin)) : undefined,
        flightInstructor: instrMin ? minutesToHours(Number(instrMin)) : undefined,
      },
      flightPurpose: String(f.get('flightPurpose') || '').trim() || undefined,
      traineeName: String(f.get('traineeName') || '').trim() || undefined,
      instructorLicenceNo: String(f.get('instructorLicenceNo') || '').trim() || undefined,
      notes: String(f.get('notes') || '').trim() || undefined,
      pilotCertification: initialValues?.pilotCertification,
      instructorSignature: initialValues?.instructorSignature,
      signatureRequestPostId: initialValues?.signatureRequestPostId,
      origin: initialValues?.origin ?? 'manual',
      legacySourceNote: initialValues?.legacySourceNote,
    })

    if (mode === 'create') {
      e.currentTarget.reset()
      setTakeoff('')
      setLanding('')
      setMinutes('')
      setPicMin('')
      setTrainMin('')
      setInstrMin('')
    }
  }

  return (
    <form data-mbaas-oid="ulfrm" noValidate onSubmit={handleSubmit} className="space-y-7">
      {/* 기체 */}
      <fieldset>
        <legend className={sectionTitleClass}>기체(機體) 정보</legend>
        {vehicles.length === 0 ? (
          <p className="mt-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            등록된 기체가 없어요. 위 "내 기체"에서 먼저 등록하면 종류·형식·신고번호·인증검사일이 기록에 자동으로 붙습니다.
          </p>
        ) : (
          <div className="mt-2">
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass} aria-label="기체 선택">
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{vehicleDisplayName(v)} — {vehicleKindLabel(v.kindKey)}{v.classLabel ? ` ${v.classLabel}` : ''}</option>
              ))}
            </select>
            {errors.vehicle && <p className="mt-1 text-xs text-rose-400">{errors.vehicle}</p>}
            {!inspectionOk && (
              <p className="mt-2 rounded-control border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                이 날짜엔 이 기체의 안전성인증이 만료된 상태예요. 기록은 저장되지만 <span className="font-semibold">경력 합산과 증명서에서 제외</span>됩니다(기재요령 주의사항 2).
              </p>
            )}
          </div>
        )}
      </fieldset>

      {/* ①② 연월일 · 비행장소 */}
      <fieldset>
        <legend className={sectionTitleClass}>① 연월일 · ② 비행장소</legend>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ul-date" className={labelClass}>연월일</label>
            <input id="ul-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            {errors.date && <p className="mt-1 text-xs text-rose-400">{errors.date}</p>}
          </div>
          <div>
            <label htmlFor="ul-place" className={labelClass}>{unmanned ? '비행장소' : '출발지(FROM)'}</label>
            <input id="ul-place" name="place" defaultValue={initialValues?.departure} placeholder={unmanned ? '예: 경북 김천' : '예: 김천 활공장'} className={inputClass} />
            {errors.place && <p className="mt-1 text-xs text-rose-400">{errors.place}</p>}
          </div>
          {!unmanned && (
            <div>
              <label htmlFor="ul-placeTo" className={labelClass}>도착지(TO)</label>
              <input id="ul-placeTo" name="placeTo" defaultValue={initialValues?.arrival} placeholder="같으면 비워 두세요" className={inputClass} />
            </div>
          )}
        </div>
      </fieldset>

      {/* ③ 시각·아워미터·비행시간 */}
      <fieldset>
        <legend className={sectionTitleClass}>③ 이륙·착륙 시각 → 비행시간</legend>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="ul-to" className={labelClass}>이륙 시각</label>
            <input id="ul-to" type="time" value={takeoff} onChange={(e) => setTakeoff(e.target.value)} onBlur={applyAuto} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-ld" className={labelClass}>착륙 시각</label>
            <input id="ul-ld" type="time" value={landing} onChange={(e) => setLanding(e.target.value)} onBlur={applyAuto} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-hm1" className={labelClass}>이륙시점 아워미터</label>
            <input id="ul-hm1" name="hourMeterStart" type="number" step="0.1" defaultValue={initialValues?.hourMeterStart} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-hm2" className={labelClass}>착륙시점 아워미터</label>
            <input id="ul-hm2" name="hourMeterEnd" type="number" step="0.1" defaultValue={initialValues?.hourMeterEnd} className={inputClass} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ul-min" className={labelClass}>비행시간 (분)</label>
            <input id="ul-min" type="number" min="0" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputClass} />
            <p className="mt-1 text-[11px] text-slate-500">
              {totalMin > 0 ? `→ ${minutesToHours(totalMin).toFixed(1)}시간으로 저장(둘째자리 버림)` : '시각을 넣으면 자동 계산돼요. 직접 넣어도 됩니다.'}
              {autoMinutes !== null && String(autoMinutes) !== minutes && (
                <button type="button" onClick={applyAuto} className="ml-2 text-sky underline">시각 기준 {autoMinutes}분 적용</button>
              )}
            </p>
            {errors.minutes && <p className="mt-1 text-xs text-rose-400">{errors.minutes}</p>}
          </div>
          <div>
            {unmanned ? (
              <>
                <label htmlFor="ul-cnt" className={labelClass}>비행 횟수</label>
                <input id="ul-cnt" name="flightCount" type="number" min="0" step="1" defaultValue={initialValues?.flightCount ?? 1} className={inputClass} />
              </>
            ) : (
              <>
                <label htmlFor="ul-ldg" className={labelClass}>착륙 횟수</label>
                <input id="ul-ldg" name="landings" type="number" min="0" step="1" defaultValue={initialValues?.dayLandings ?? 1} className={inputClass} />
              </>
            )}
          </div>
        </div>
      </fieldset>

      {/* ④ 임무별 */}
      <fieldset>
        <legend className={sectionTitleClass}>④ 임무별 비행시간 (분)</legend>
        <p className="mt-1 text-[11px] text-slate-500">
          기장: 자격 보유자의 단독 비행 또는 교육생이 지도조종자 감독 하에 단독으로 비행 · 훈련: 지도조종자 조종장치에 연결된 훈련용 조종장치로 비행 · 교관: 그 훈련의 지도조종자로서 비행 (운영세칙 제10조)
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="ul-pic" className={labelClass}>기장</label>
            <input id="ul-pic" type="number" min="0" step="1" value={picMin} onChange={(e) => setPicMin(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-tr" className={labelClass}>훈련</label>
            <input id="ul-tr" type="number" min="0" step="1" value={trainMin} onChange={(e) => setTrainMin(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-in" className={labelClass}>교관</label>
            <input id="ul-in" type="number" min="0" step="1" value={instrMin} onChange={(e) => setInstrMin(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className={`mt-1 text-[11px] ${dutyTotal > 0 && dutyTotal !== totalMin ? 'text-amber-300' : 'text-slate-500'}`}>
          소계 {dutyTotal}분{dutyTotal > 0 && dutyTotal !== totalMin ? ` — 비행시간 ${totalMin}분과 달라요. 로그기록지에서는 보통 같아야 합니다.` : ''}
        </p>
      </fieldset>

      {/* ⑤⑥⑦ */}
      <fieldset>
        <legend className={sectionTitleClass}>⑤ 비행목적(훈련내용) · ⑥ 교육생 · ⑦ 지도조종자</legend>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ul-purpose" className={labelClass}>비행목적 / 훈련내용</label>
            <input id="ul-purpose" name="flightPurpose" defaultValue={initialValues?.flightPurpose} placeholder="자격 보유자는 비행목적, 교육생은 훈련내용" className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-trainee" className={labelClass}>교육생 성명 <span className="text-slate-500">(본인이면 비워 두세요)</span></label>
            <input id="ul-trainee" name="traineeName" defaultValue={initialValues?.traineeName} placeholder={holderName ?? ''} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ul-lic" className={labelClass}>지도조종자 자격번호</label>
            <input id="ul-lic" name="instructorLicenceNo" defaultValue={initialValues?.instructorLicenceNo} placeholder="예: 91-XXXXXX" className={inputClass} />
            <p className="mt-1 text-[11px] text-slate-500">성명·서명은 저장 후 "교관 서명 요청"으로 받습니다.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ul-notes" className={labelClass}>비고 (선택)</label>
            <textarea id="ul-notes" name="notes" rows={2} defaultValue={initialValues?.notes} className={inputClass} />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="md">{mode === 'create' ? '기록 저장' : '수정 내용 저장'}</Button>
        {onCancel && <Button type="button" variant="outline" tone="neutral" size="md" onClick={onCancel}>취소</Button>}
      </div>
    </form>
  )
}
