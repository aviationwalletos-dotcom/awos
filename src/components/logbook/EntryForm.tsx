import React, { useRef, useState } from 'react'
import { getEntryPresets, mergePresetChips } from '../../data/entryPresets'
import { PILOT_TRACK_LABEL, PILOT_TRACK_SHORT, entryTrack, isUnmannedKind, vehicleKindsForTrack } from '../../lib/tracks'
import type { PilotTrack } from '../../lib/tracks'
import { FLIGHT_CATEGORIES, SIM_DEVICE_LABEL } from '../../types/logbook'
import type { LogbookEntry, LogbookEntryInput, SimDeviceKind } from '../../types/logbook'

import { Button } from '../Button'
import { SignaturePad } from './SignaturePad'

interface FieldErrors {
  date?: string
  departure?: string
  arrival?: string
  aircraftType?: string
  blockTime?: string
  groundTrainerTime?: string
  certification?: string
}

interface EntryFormProps {
  mode: 'create' | 'edit'
  initialValues?: LogbookEntry
  onSubmit: (input: LogbookEntryInput) => void
  onCancel?: () => void
  /** 드론 조종자 등 항공기 개념이 다른 역할을 위한 라벨/플레이스홀더 커스터마이즈 (미지정 시 조종사 기본값 사용) */
  aircraftTypeLabel?: string
  aircraftTypePlaceholder?: string
  aircraftIdLabel?: string
  aircraftIdPlaceholder?: string
  /** 자주 쓰는 공항·기종 칩 (LogbookPage가 기존 기록에서 계산해 전달) */
  suggestions?: EntrySuggestions
  /** v1.1 — 이 기록이 속할 트랙. 신규 입력의 기본값이며, 사용자가 폼에서 바꿀 수 있다. */
  track?: PilotTrack
}

export interface EntrySuggestions {
  airports?: string[]
  aircraftTypes?: string[]
  registrations?: string[]
}

/** 기존 기록에서 자주 쓰는 공항·기종·등록기호를 빈도순으로 뽑는다(최대 6개). */
export function buildEntrySuggestions(entries: LogbookEntry[]): EntrySuggestions {
  const top = (values: (string | undefined)[]) => {
    const count = new Map<string, number>()
    values.forEach((v) => {
      const key = (v ?? '').trim()
      if (key) count.set(key, (count.get(key) ?? 0) + 1)
    })
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)
  }
  return {
    airports: top(entries.flatMap((e) => [e.departure, e.arrival]).filter((v) => v !== 'SIM')),
    aircraftTypes: top(entries.map((e) => e.aircraftType)),
    registrations: top(entries.map((e) => e.aircraftIdentification)),
  }
}

type EntryRole = '' | 'student' | 'pic' | 'cfi'

function Chips({ items, onPick }: { items?: string[]; onPick: (value: string) => void }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="빠른 입력">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="inline-flex items-center rounded border border-sky/30 bg-sky/5 px-2 py-0.5 font-mono-data text-[11px] tracking-wide text-sky transition hover:bg-sky/15"
        >
          {item}
        </button>
      ))}
    </div>
  )
}

// 아래 스타일 상수/헬퍼는 FlightExperienceCertificateForm.tsx(비행경력증명서로 가져오기)에서도
// 동일한 필드 스타일을 재사용하기 위해 export합니다.
export const inputClass =
  'w-full rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

export const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

export const numberInputClass = `${inputClass} font-mono-data tabular-nums`

export const sectionTitleClass = 'text-sm font-bold text-ink'
export const sectionHintClass = 'mt-1 text-xs text-slate-400'

export function numOrUndef(value: FormDataEntryValue | null): number | undefined {
  const s = String(value ?? '').trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function formatSignedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function EntryForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  suggestions,
  aircraftTypeLabel = '항공기 제작사 및 모델',
  aircraftTypePlaceholder = '예: Cessna 172R, C172, Boeing 737',
  aircraftIdLabel = '항공기 등록번호 / 테일넘버 (선택)',
  aircraftIdPlaceholder = '예: HL1234',
  track,
}: EntryFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [entryRole, setEntryRole] = useState<EntryRole>('')
  const [entryKind, setEntryKind] = useState<'flight' | 'sim'>(
    initialValues && (initialValues.departure === 'SIM' || (initialValues.groundTrainerTime ?? 0) > 0) ? 'sim' : 'flight',
  )
  const formRef = useRef<HTMLFormElement>(null)
  /** 자동으로 채운 필드 이름 — 사용자가 직접 고친 값은 덮어쓰지 않기 위해 추적 */
  const autofilledRef = useRef<Set<string>>(new Set())

  const getField = (name: string) => formRef.current?.elements.namedItem(name) as HTMLInputElement | null
  const canAutofill = (name: string) => {
    const el = getField(name)
    return Boolean(el) && (el!.value.trim() === '' || autofilledRef.current.has(name))
  }
  const setField = (name: string, value: string, auto = false) => {
    const el = getField(name)
    if (!el) return
    el.value = value
    if (auto) autofilledRef.current.add(name)
    else autofilledRef.current.delete(name)
  }
  const fmt = (n: number) => String(Math.round(n * 10) / 10)

  /** 역할별 자동채움: 학생=dual+PIC, 기장=PIC, 교관=교관시간+PIC (비어 있거나 자동값인 칸만) */
  const applyRoleAutofill = (role: EntryRole, total: number) => {
    if (!role || !(total > 0)) return
    const targets = role === 'student' ? ['dualReceived', 'picTime'] : role === 'pic' ? ['picTime'] : ['flightInstructorTime', 'picTime']
    targets.forEach((name) => {
      if (canAutofill(name)) setField(name, fmt(total), true)
    })
  }
  const handleTotalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (!Number.isFinite(value) || value <= 0) return
    if (e.target.name !== 'blockTime' && canAutofill('blockTime')) setField('blockTime', fmt(value), true)
    const total = Number(getField('blockTime')?.value) || value
    applyRoleAutofill(entryRole, total)
    // 주간이 이미 있으면 야간 = 총시간 − 주간
    const day = Number(getField('conditionDay')?.value)
    if (Number.isFinite(day) && day > 0 && total - day >= 0 && canAutofill('conditionNight')) setField('conditionNight', fmt(total - day), true)
  }
  /** 주간↔야간 자동 보완: 하나를 넣으면 나머지 = 총시간 − 입력값 */
  const handleDayNight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const total = Number(getField('blockTime')?.value)
    const value = Number(e.target.value)
    if (!(total > 0) || !Number.isFinite(value) || value < 0) return
    const other = e.target.name === 'conditionDay' ? 'conditionNight' : 'conditionDay'
    const rest = total - value
    if (rest >= 0 && canAutofill(other)) setField(other, fmt(rest), true)
  }
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as EntryRole
    setEntryRole(role)
    // 역할을 바꾸면 이전 자동값은 비우고 새 역할 기준으로 다시 채움
    ;['dualReceived', 'picTime', 'flightInstructorTime'].forEach((name) => {
      if (autofilledRef.current.has(name)) setField(name, '')
    })
    applyRoleAutofill(role, Number(getField('blockTime')?.value))
  }

  // v1.1 — 트랙·장치 종류·시뮬 장치 구분
  const [vehicleClass, setVehicleClass] = useState<PilotTrack>(
    initialValues ? entryTrack(initialValues) : (track ?? 'aircraft'),
  )
  const [vehicleKind, setVehicleKind] = useState<string>(initialValues?.vehicleKind ?? '')
  const [simDevice, setSimDevice] = useState<SimDeviceKind>(initialValues?.simDevice ?? 'FTD')
  const kindOptions = vehicleKindsForTrack(vehicleClass)
  const isUnmanned = vehicleClass === 'ultralight' && isUnmannedKind(vehicleKind)

  const isSimKind = entryKind === 'sim'
  const presets = getEntryPresets(entryKind)
  const historyTypes = suggestions?.aircraftTypes?.filter((v) => (isSimKind ? /ftd/i.test(v) : !/ftd/i.test(v)))
  const historyRegs = suggestions?.registrations?.filter((v) => (isSimKind ? /ftd|multi|mento|frasca/i.test(v) : !/ftd|multi|mento|frasca/i.test(v)))
  const aircraftTypeChips = mergePresetChips(presets.aircraftTypes, historyTypes)
  const registrationChips = mergePresetChips(presets.registrations, historyRegs)
  const departureChips = mergePresetChips(presets.departures, suggestions?.airports)
  const arrivalChips = mergePresetChips(presets.arrivals, suggestions?.airports)
  const viaChips = mergePresetChips(presets.via, suggestions?.airports)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    initialValues?.pilotCertification?.signatureDataUrl ?? null,
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const isCertifyAction = submitter?.name === 'formAction' && submitter?.value === 'certify'
    const nextErrors: FieldErrors = {}

    const date = String(form.get('date') || '').trim()
    const departure = String(form.get('departure') || '').trim()
    const arrival = String(form.get('arrival') || '').trim()
    const aircraftType = String(form.get('aircraftType') || '').trim()
    const blockTimeRaw = String(form.get('blockTime') || '').trim()
    const blockTime = Number(blockTimeRaw)
    const dayLandingsRaw = String(form.get('dayLandings') || '').trim()
    const nightLandingsRaw = String(form.get('nightLandings') || '').trim()
    const dayLandings = dayLandingsRaw ? Number(dayLandingsRaw) : 0
    const nightLandings = nightLandingsRaw ? Number(nightLandingsRaw) : 0

    const isSim = entryKind === 'sim'
    if (!date) nextErrors.date = '비행 날짜를 입력해 주세요.'
    if (!isSim && !departure) nextErrors.departure = '출발지를 입력해 주세요.'
    if (!isSim && !arrival) nextErrors.arrival = '도착지를 입력해 주세요.'
    if (!aircraftType) nextErrors.aircraftType = '기종을 입력해 주세요.'
    if (!isSim && (!blockTimeRaw || Number.isNaN(blockTime) || blockTime <= 0)) {
      nextErrors.blockTime = '블록타임을 0보다 큰 숫자로 입력해 주세요.'
    }
    const groundTrainerRaw = String(form.get('groundTrainerTime') || '').trim()
    if (isSim && (!groundTrainerRaw || Number(groundTrainerRaw) <= 0)) {
      nextErrors.groundTrainerTime = '시뮬레이터(지상훈련장비) 시간을 0보다 큰 숫자로 입력해 주세요.'
    }
    if (isCertifyAction && !signatureDataUrl) {
      nextErrors.certification = '서명 후 확정해 주세요.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})

    // 연도(year)는 사용자가 입력하지 않고 비행 날짜(date)에서 자동으로 추출합니다.
    const year = date ? Number(date.slice(0, 4)) : undefined

    onSubmit({
      year,
      date,
      departure: isSim ? 'SIM' : departure,
      arrival: isSim ? 'SIM' : arrival,
      viaAirports: String(form.get('viaAirports') || '').trim() || undefined,
      aircraftType,
      aircraftIdentification: String(form.get('aircraftIdentification') || '').trim() || undefined,
      blockTime: isSim ? 0 : blockTime,
      // 대표 비행 종류(flightCategory)는 더 이상 폼에서 입력받지 않고 기본값으로 채웁니다.
      // 목록/필터의 실제 배지는 EntryList.tsx의 deriveBadges()가 기록된 시간 값을 기준으로 다시 계산합니다.
      flightCategory: FLIGHT_CATEGORIES[0] as LogbookEntryInput['flightCategory'],
      categoryHours: {
        singleEngineLand: numOrUndef(form.get('singleEngineLand')),
        multiEngineLand: numOrUndef(form.get('multiEngineLand')),
        rotorcraftHelicopter: numOrUndef(form.get('rotorcraftHelicopter')),
        otherLabel: String(form.get('categoryOtherLabel') || '').trim() || undefined,
        otherHours: numOrUndef(form.get('categoryOtherHours')),
      },
      vehicleClass,
      vehicleKind: vehicleClass === 'aircraft' ? undefined : vehicleKind || undefined,
      simDevice: isSim ? simDevice : undefined,
      pilotingTime: {
        dualReceived: numOrUndef(form.get('dualReceived')),
        pic: numOrUndef(form.get('picTime')),
        sic: numOrUndef(form.get('sicTime')),
        flightInstructor: numOrUndef(form.get('flightInstructorTime')),
        solo: numOrUndef(form.get('soloTime')),
        picSupervised: numOrUndef(form.get('picSupervisedTime')),
      },
      groundTrainerTime: numOrUndef(form.get('groundTrainerTime')),
      conditions: {
        day: numOrUndef(form.get('conditionDay')),
        // 경량·초경량은 야간비행 금지 — 값이 있어도 저장하지 않는다
        night: vehicleClass === 'aircraft' ? numOrUndef(form.get('conditionNight')) : undefined,
        crossCountry: numOrUndef(form.get('crossCountry')),
        actualInstrument: numOrUndef(form.get('actualInstrument')),
        simulatedInstrument: numOrUndef(form.get('simulatedInstrument')),
        soloCrossCountry: numOrUndef(form.get('soloCrossCountry')),
        crossCountryDistanceKm: numOrUndef(form.get('crossCountryDistanceKm')),
      },
      instrumentApproaches: numOrUndef(form.get('instrumentApproaches')),
      dayLandings: Number.isFinite(dayLandings) && dayLandings > 0 ? dayLandings : 0,
      nightLandings: vehicleClass === 'aircraft' && Number.isFinite(nightLandings) && nightLandings > 0 ? nightLandings : 0,
      nightTakeoffs: vehicleClass === 'aircraft' ? numOrUndef(form.get('nightTakeoffs')) : undefined,
      notes: String(form.get('notes') || '').trim() || undefined,
      pilotCertification: isCertifyAction
        ? { signatureDataUrl: signatureDataUrl ?? undefined, certifiedAt: Date.now() }
        : initialValues?.pilotCertification,
      instructorSignature: initialValues?.instructorSignature,
      signatureRequestPostId: initialValues?.signatureRequestPostId,
      origin: initialValues?.origin ?? 'manual',
      legacySourceNote: initialValues?.legacySourceNote,
    })

    if (mode === 'create' && !isCertifyAction) {
      e.currentTarget.reset()
      setSignatureDataUrl(null)
    }
  }

  return (
    <form data-mbaas-oid="lgbfrm1" ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-8">
      {/* v1.1 — 트랙·장치 종류. 여기서 고른 트랙의 집계에만 이 기록이 들어간다. */}
      <div data-mbaas-oid="trkblk" className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <p className={labelClass}>이 기록의 자격 구분</p>
        <div data-mbaas-oid="trkchips" className="mt-2 flex flex-wrap gap-2">
          {(['aircraft', 'lsa', 'ultralight'] as PilotTrack[]).map((t) => (
            <button
              data-mbaas-oid="trkchip"
              key={t}
              type="button"
              onClick={() => {
                setVehicleClass(t)
                setVehicleKind('')
              }}
              className={`rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors ${
                vehicleClass === t ? 'border-sky bg-sky/15 text-[#00D4FF]' : 'border-white/15 text-slate-300 hover:border-white/30'
              }`}
              aria-pressed={vehicleClass === t}
            >
              {PILOT_TRACK_SHORT[t]}
            </button>
          ))}
          <span data-mbaas-oid="trkname" className="self-center text-[11px] text-slate-500">{PILOT_TRACK_LABEL[vehicleClass]}</span>
        </div>
        {kindOptions.length > 0 && (
          <div data-mbaas-oid="kindblk" className="mt-3">
            <label htmlFor="vehicleKind" className={labelClass}>장치 종류</label>
            <select
              id="vehicleKind"
              name="vehicleKind"
              value={vehicleKind}
              onChange={(e) => setVehicleKind(e.target.value)}
              className={inputClass}
            >
              <option value="">선택 (자격 한정 단위라 남겨두면 응시경력 계산에 쓰여요)</option>
              {kindOptions.map((k) => (
                <option key={k.key} value={k.key}>{k.label}</option>
              ))}
            </select>
            {isUnmanned && (
              <p data-mbaas-oid="uasntc" className="mt-2 text-[11px] leading-relaxed text-slate-400">
                무인비행장치 기록은 참고·보조 자료예요. 응시·등록용 비행경력은 지도조종자 확인과 교육기관 증명(비행경력증명서)으로만 인정됩니다.
              </p>
            )}
          </div>
        )}
        {vehicleClass !== 'aircraft' && (
          <p data-mbaas-oid="nonightntc" className="mt-2 text-[11px] text-slate-500">
            경량·초경량은 야간비행이 금지되어 야간 시간·야간 이착륙은 저장되지 않습니다.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-sky/30 bg-sky/5 p-4">
        <label htmlFor="entryRole" className={labelClass}>
          이 비행에서 나의 역할
        </label>
        <select
          id="entryRole"
          name="entryRole"
          value={entryRole}
          onChange={handleRoleChange}
          className={inputClass}
        >
          <option value="">선택 안 함</option>
          <option value="student">학생 (교육 비행)</option>
          <option value="pic">기장 (PIC)</option>
          <option value="cfi">교관 (CFI)</option>
        </select>
        <p className="mt-1.5 text-xs text-slate-400">
          역할을 고르고 비행시간을 넣으면 교육·PIC·교관 시간과 야간 시간이 자동으로 채워져요. 직접 고친 값은 덮어쓰지 않아요.
        </p>
      </div>

      <div data-mbaas-oid="kindwrap" className="space-y-3">
        <div data-mbaas-oid="kindtgl" className="inline-flex rounded-control border border-white/15 p-1">
          {(['flight', 'sim'] as const).map((kind) => (
            <button
              data-mbaas-oid="kindbtn" key={kind}
              type="button"
              onClick={() => setEntryKind(kind)}
              className={`rounded-[7px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                entryKind === kind ? 'bg-sky text-navy' : 'text-slate-300 hover:text-white'
              }`}
            >
              {kind === 'flight' ? '✈️ 실비행' : '🖥️ 시뮬레이터 (FTD)'}
            </button>
          ))}
        </div>
        {entryKind === 'sim' && (
          <>
            <p data-mbaas-oid="simntc" className="rounded-card border border-orange-400/30 bg-orange-400/10 p-3 text-xs leading-relaxed text-orange-200">
              시뮬레이터 기록 모드: <span data-mbaas-oid="simntc2" className="font-semibold">시뮬레이터 시간은 필수</span>, 모의계기·계기접근·비고는 선택이에요. 출발/도착지와 비행시간 칸은 자동으로 처리됩니다.
            </p>
            <div data-mbaas-oid="simdev" className="mt-3">
              <label htmlFor="simDevice" className={labelClass}>모의비행훈련장치 구분</label>
              <select id="simDevice" name="simDevice" value={simDevice} onChange={(e) => setSimDevice(e.target.value as SimDeviceKind)} className={inputClass}>
                {(['FFS', 'FTD', 'BATD'] as SimDeviceKind[]).map((d) => (
                  <option key={d} value={d}>{SIM_DEVICE_LABEL[d]}</option>
                ))}
              </select>
              <p data-mbaas-oid="simdevntc" className="mt-1 text-[11px] text-slate-500">
                별표 4 인정 상한이 장치별로 달라요(예: 운송용 FFS 100 / FTD 25 / BATD 5, FTD+BATD 합산 25). 울진 FTD는 지방항공청 지정 장치입니다.
              </p>
            </div>
          </>
        )}
      </div>
      {/* 1. 기본 비행 정보 */}
      <fieldset data-mbaas-oid="upndrix">
        <legend data-mbaas-oid="2hufkaa" className={sectionTitleClass}>1. 기본 비행 정보</legend>
        <div data-mbaas-oid="v7hl9id" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div data-mbaas-oid="griq25e">
            <label data-mbaas-oid="kupuhfh" htmlFor="date" className={labelClass}>
              비행 날짜
            </label>
            <input
              data-mbaas-oid="xsva53y" id="date"
              name="date"
              type="date"
              defaultValue={initialValues?.date ?? (mode === 'create' ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : undefined)}
              className={inputClass}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'date-error' : undefined}
            />
            {errors.date && (
              <p data-mbaas-oid="m4gespv" id="date-error" className="mt-1.5 text-xs text-rose-600">
                {errors.date}
              </p>
            )}
          </div>

          <div data-mbaas-oid="ixip8uu">
            <label data-mbaas-oid="8vsw9v3" htmlFor="aircraftType" className={labelClass}>
              {aircraftTypeLabel}
            </label>
            <input
              data-mbaas-oid="i45irse" id="aircraftType"
              name="aircraftType"
              type="text"
              defaultValue={initialValues?.aircraftType}
              placeholder={isSimKind ? '예: FTD, FTD-Multi' : aircraftTypePlaceholder}
              className={inputClass}
              aria-invalid={Boolean(errors.aircraftType)}
              aria-describedby={errors.aircraftType ? 'aircraftType-error' : undefined}
            />
            <Chips items={aircraftTypeChips} onPick={(v) => setField('aircraftType', v)} />
            {errors.aircraftType && (
              <p data-mbaas-oid="obspykq" id="aircraftType-error" className="mt-1.5 text-xs text-rose-600">
                {errors.aircraftType}
              </p>
            )}
          </div>

          <div data-mbaas-oid="uu2wexc">
            <label data-mbaas-oid="ziiht3t" htmlFor="aircraftIdentification" className={labelClass}>
              {aircraftIdLabel}
            </label>
            <input
              data-mbaas-oid="4oqcuzn" id="aircraftIdentification"
              name="aircraftIdentification"
              type="text"
              defaultValue={initialValues?.aircraftIdentification}
              placeholder={isSimKind ? '예: FTD-Multi' : aircraftIdPlaceholder}
              className={`${inputClass} font-mono-data`}
            />
            <Chips items={registrationChips} onPick={(v) => setField('aircraftIdentification', v)} />
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="kc5iv2c" className="border-white/[0.08]" />

      {/* 2. 출발/도착지 */}
      {entryKind === 'flight' && (<>

      <fieldset data-mbaas-oid="ud2btp7">
        <legend data-mbaas-oid="bqc9cm6" className={sectionTitleClass}>2. 출발/도착지</legend>
        <div data-mbaas-oid="ks18sv8" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div data-mbaas-oid="vxwacz6">
            <label data-mbaas-oid="xmsexzz" htmlFor="departure" className={labelClass}>
              출발지
            </label>
            <input
              data-mbaas-oid="ls169tq" id="departure"
              name="departure"
              type="text"
              defaultValue={initialValues?.departure}
              placeholder="예: RKPU"
              className={`${inputClass} font-mono-data`}
              aria-invalid={Boolean(errors.departure)}
              aria-describedby={errors.departure ? 'departure-error' : undefined}
            />
            <Chips items={departureChips} onPick={(v) => setField('departure', v)} />
            {errors.departure && (
              <p data-mbaas-oid="cdhrbb8" id="departure-error" className="mt-1.5 text-xs text-rose-600">
                {errors.departure}
              </p>
            )}
          </div>

          <div data-mbaas-oid="ska526m">
            <label data-mbaas-oid="idsvgjt" htmlFor="arrival" className={labelClass}>
              도착지
            </label>
            <input
              data-mbaas-oid="opgw01k" id="arrival"
              name="arrival"
              type="text"
              defaultValue={initialValues?.arrival}
              placeholder="예: RKNY"
              className={`${inputClass} font-mono-data`}
              aria-invalid={Boolean(errors.arrival)}
              aria-describedby={errors.arrival ? 'arrival-error' : undefined}
            />
            <Chips items={arrivalChips} onPick={(v) => setField('arrival', v)} />
            {errors.arrival && (
              <p data-mbaas-oid="7pw8fvp" id="arrival-error" className="mt-1.5 text-xs text-rose-600">
                {errors.arrival}
              </p>
            )}
          </div>

          <div data-mbaas-oid="akojhu9">
            <label data-mbaas-oid="rordo4b" htmlFor="viaAirports" className={labelClass}>
              경유 공항 (선택)
            </label>
            <input
              data-mbaas-oid="wbmb7je" id="viaAirports"
              name="viaAirports"
              type="text"
              defaultValue={initialValues?.viaAirports}
              placeholder="예: RKTN, RKNY"
              className={`${inputClass} font-mono-data`}
            />
            <Chips items={viaChips} onPick={(v) => setField('viaAirports', v)} />
            <p data-mbaas-oid="6uzo4cg" className={sectionHintClass}>여러 곳이면 쉼표로 구분해 입력해 주세요.</p>
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr data-mbaas-oid="ky79b2k" className="border-white/[0.08]" />

      {/* 3. 항공기 범주/등급별 시간 */}
      {entryKind === 'flight' && (<>

      <fieldset data-mbaas-oid="6j33a7s">
        <legend data-mbaas-oid="ekb97da" className={sectionTitleClass}>3. 항공기 범주/등급별 시간 (선택)</legend>
        <div data-mbaas-oid="qzkj8cz" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div data-mbaas-oid="l9y4wvw">
            <label data-mbaas-oid="ypwxy5g" htmlFor="singleEngineLand" className={labelClass}>
              단발육상(시간)
            </label>
            <input
              data-mbaas-oid="cuozs2e" id="singleEngineLand"
              name="singleEngineLand"
              onChange={handleTotalInput}
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.categoryHours?.singleEngineLand}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="gcopqp5">
            <label data-mbaas-oid="od26cij" htmlFor="multiEngineLand" className={labelClass}>
              다발육상(시간)
            </label>
            <input
              data-mbaas-oid="jw2zdea" id="multiEngineLand"
              name="multiEngineLand"
              onChange={handleTotalInput}
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.categoryHours?.multiEngineLand}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="owg28b4">
            <label data-mbaas-oid="vnngu2f" htmlFor="rotorcraftHelicopter" className={labelClass}>
              회전익(헬리콥터, 시간)
            </label>
            <input
              data-mbaas-oid="ohvt2oc" id="rotorcraftHelicopter"
              name="rotorcraftHelicopter"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.categoryHours?.rotorcraftHelicopter}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="6qxc3ww" className="grid grid-cols-2 gap-2">
            <div data-mbaas-oid="jeffjqw">
              <label data-mbaas-oid="y4mtrj7" htmlFor="categoryOtherLabel" className={labelClass}>
                기타 명칭
              </label>
              <input
                data-mbaas-oid="rlfyob9" id="categoryOtherLabel"
                name="categoryOtherLabel"
                type="text"
                defaultValue={initialValues?.categoryHours?.otherLabel}
                placeholder="예: 활공기"
                className={inputClass}
              />
            </div>
            <div data-mbaas-oid="ks1df44">
              <label data-mbaas-oid="4ojor5l" htmlFor="categoryOtherHours" className={labelClass}>
                기타 시간
              </label>
              <input
                data-mbaas-oid="q8pj8en" id="categoryOtherHours"
                name="categoryOtherHours"
                type="number"
                step="0.1"
                min="0"
                defaultValue={initialValues?.categoryHours?.otherHours}
                className={numberInputClass}
              />
            </div>
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr data-mbaas-oid="7hct34q" className="border-white/[0.08]" />

      {/* 4. 비행 자격 시간 종류 */}
      {entryKind === 'flight' && (<>

      <fieldset data-mbaas-oid="lh27m71">
        <legend data-mbaas-oid="946bltl" className={sectionTitleClass}>4. 비행 자격 시간 종류 (선택)</legend>
        <div data-mbaas-oid="0ly6doh" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div data-mbaas-oid="x7g70vw">
            <label data-mbaas-oid="ge1kezt" htmlFor="dualReceived" className={labelClass}>
              DUAL RECEIVED(시간)
            </label>
            <input
              data-mbaas-oid="o1tmt4a" id="dualReceived"
              name="dualReceived"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.dualReceived}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="kpv04dy">
            <label data-mbaas-oid="4byndak" htmlFor="picTime" className={labelClass}>
              PILOT-IN-COMMAND(PIC, 시간)
            </label>
            <input
              data-mbaas-oid="yqfkcm6" id="picTime"
              name="picTime"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.pic}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="sq6xtpe">
            <label data-mbaas-oid="1zf5lyl" htmlFor="sicTime" className={labelClass}>
              SECOND-IN-COMMAND(SIC, 시간)
            </label>
            <input
              data-mbaas-oid="bltt8tv" id="sicTime"
              name="sicTime"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.sic}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="cv2aa5o">
            <label data-mbaas-oid="k0jccao" htmlFor="flightInstructorTime" className={labelClass}>
              AS FLIGHT INSTRUCTOR(시간)
            </label>
            <input
              data-mbaas-oid="vj6bjl3" id="flightInstructorTime"
              name="flightInstructorTime"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.flightInstructor}
              className={numberInputClass}
            />
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr data-mbaas-oid="aa5e0u7" className="border-white/[0.08]" />

      {/* 5. 지상훈련장비 */}
      {entryKind === 'sim' && (<>

      <fieldset data-mbaas-oid="ktbegxv">
        <legend data-mbaas-oid="87l6119" className={sectionTitleClass}>5. 지상훈련장비 — 시뮬레이터 시간 (필수)</legend>
        <div data-mbaas-oid="sd8q38m" className="mt-3 max-w-xs">
          <label data-mbaas-oid="g0ys0t0" htmlFor="groundTrainerTime" className={labelClass}>
            시뮬레이터 시간
          </label>
          <input
            data-mbaas-oid="emnngbk" id="groundTrainerTime"
            name="groundTrainerTime"
            type="number"
            step="0.1"
            min="0"
            defaultValue={initialValues?.groundTrainerTime}
            className={numberInputClass}
          />
        </div>
      
          {errors.groundTrainerTime && (
            <p data-mbaas-oid="simerr1" className="mt-1.5 text-xs text-rose-400">{errors.groundTrainerTime}</p>
          )}
          {/* 시뮬레이터 전용 입력 — 실비행 섹션(6·7·8)이 숨겨져 있어 이름 충돌이 없다 */}
          <div data-mbaas-oid="simx0" className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div data-mbaas-oid="simx1">
              <label data-mbaas-oid="simx1l" htmlFor="sim-instrument" className={labelClass}>모의계기 시간 (선택)</label>
              <input data-mbaas-oid="simx1i" id="sim-instrument" name="simulatedInstrument" type="number" step="0.1" min="0" className={numberInputClass} />
            </div>
            <div data-mbaas-oid="simx2">
              <label data-mbaas-oid="simx2l" htmlFor="sim-approaches" className={labelClass}>계기 접근 횟수 (선택)</label>
              <input data-mbaas-oid="simx2i" id="sim-approaches" name="instrumentApproaches" type="number" step="1" min="0" placeholder="예: 2" className={numberInputClass} />
            </div>
          </div>
          <div data-mbaas-oid="simx3" className="mt-4">
            <label data-mbaas-oid="simx3l" htmlFor="sim-notes" className={labelClass}>비고 (선택)</label>
            <textarea data-mbaas-oid="simx3t" id="sim-notes" name="notes" rows={2} defaultValue={initialValues?.notes} className={inputClass} />
          </div>
        </fieldset>
      </>)}

      

      <hr data-mbaas-oid="19wzhue" className="border-white/[0.08]" />

      {/* 6. 비행 조건별 시간 */}
      {entryKind === 'flight' && (<>

      <fieldset data-mbaas-oid="qq8v6t4">
        <legend data-mbaas-oid="1n59dl8" className={sectionTitleClass}>6. 비행 조건별 시간 (선택)</legend>
        <div data-mbaas-oid="i8ktosd" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div data-mbaas-oid="4akbre4">
            <label data-mbaas-oid="xogq4u2" htmlFor="conditionDay" className={labelClass}>
              주간(시간)
            </label>
            <input
              data-mbaas-oid="wkof340" id="conditionDay"
              name="conditionDay"
              onChange={handleDayNight}
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.day}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="gy5vv2p">
            <label data-mbaas-oid="o8640xn" htmlFor="conditionNight" className={labelClass}>
              야간(시간)
            </label>
            <input
              data-mbaas-oid="h9nuzl6" id="conditionNight"
              name="conditionNight"
              onChange={handleDayNight}
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.night}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="bpt6isu">
            <label data-mbaas-oid="c02y50b" htmlFor="crossCountry" className={labelClass}>
              크로스컨트리(시간)
            </label>
            <input
              data-mbaas-oid="0bxpjci" id="crossCountry"
              name="crossCountry"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.crossCountry}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="wuq65u4">
            <label data-mbaas-oid="u7mk23b" htmlFor="actualInstrument" className={labelClass}>
              실제계기(시간)
            </label>
            <input
              data-mbaas-oid="7nugf96" id="actualInstrument"
              name="actualInstrument"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.actualInstrument}
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="yzazr21">
            <label data-mbaas-oid="ql854k0" htmlFor="simulatedInstrument" className={labelClass}>
              모의계기(시간)
            </label>
            <input
              data-mbaas-oid="urhqju6" id="simulatedInstrument"
              name="simulatedInstrument"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.simulatedInstrument}
              className={numberInputClass}
            />
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr data-mbaas-oid="1d2ng39" className="border-white/[0.08]" />

      {/* 7. 접근/이착륙 횟수 */}
      {entryKind === 'flight' && (<>

      <fieldset data-mbaas-oid="2teo0y3">
        <legend data-mbaas-oid="2qd2300" className={sectionTitleClass}>7. 접근/이착륙 횟수 (선택)</legend>
        <div data-mbaas-oid="1ro3o3q" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div data-mbaas-oid="2cfdt0z">
            <label data-mbaas-oid="p7qd6mw" htmlFor="instrumentApproaches" className={labelClass}>
              계기 접근 횟수
            </label>
            <input
              data-mbaas-oid="pex20g9" id="instrumentApproaches"
              name="instrumentApproaches"
              type="number"
              step="1"
              min="0"
              defaultValue={initialValues?.instrumentApproaches}
              placeholder="예: 2"
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="bbwf7tg">
            <label data-mbaas-oid="9okm7hp" htmlFor="dayLandings" className={labelClass}>
              주간 이착륙 횟수
            </label>
            <input
              data-mbaas-oid="bkci7jm" id="dayLandings"
              name="dayLandings"
              type="number"
              step="1"
              min="0"
              defaultValue={initialValues?.dayLandings ?? 0}
              placeholder="예: 3"
              className={numberInputClass}
            />
          </div>
          <div data-mbaas-oid="4kfxf1i">
            <label data-mbaas-oid="ivdnn4u" htmlFor="nightLandings" className={labelClass}>
              야간 이착륙 횟수
            </label>
            <input
              data-mbaas-oid="ops9fvh" id="nightLandings"
              name="nightLandings"
              type="number"
              step="1"
              min="0"
              defaultValue={initialValues?.nightLandings ?? 0}
              placeholder="예: 0"
              className={numberInputClass}
            />
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr data-mbaas-oid="480rj37" className="border-white/[0.08]" />

      {/* 8. 총 비행시간 및 비고 */}
      {entryKind === 'flight' && (<>

      <fieldset data-mbaas-oid="ge236y0">
        <legend data-mbaas-oid="73qnd0k" className={sectionTitleClass}>8. 총 비행시간 및 비고</legend>
        <div data-mbaas-oid="ehklpel" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div data-mbaas-oid="5f1c259">
            <label data-mbaas-oid="mbkyyx4" htmlFor="blockTime" className={labelClass}>
              블록타임(시간)
            </label>
            <input
              data-mbaas-oid="l1zf2xs" id="blockTime"
              name="blockTime"
              onChange={handleTotalInput}
              type="number"
              step="0.1"
              min="0.1"
              defaultValue={initialValues?.blockTime}
              placeholder="예: 1.5"
              className={numberInputClass}
              aria-invalid={Boolean(errors.blockTime)}
              aria-describedby={errors.blockTime ? 'blockTime-error' : undefined}
            />
            {errors.blockTime && (
              <p data-mbaas-oid="pvk2o4q" id="blockTime-error" className="mt-1.5 text-xs text-rose-600">
                {errors.blockTime}
              </p>
            )}
          </div>
        </div>
        <div data-mbaas-oid="069dg67" className="mt-5">
          <label data-mbaas-oid="r3tw3sq" htmlFor="notes" className={labelClass}>
            비고 (선택)
          </label>
          <textarea
            data-mbaas-oid="isnf0e3" id="notes"
            name="notes"
            rows={3}
            defaultValue={initialValues?.notes}
            placeholder="특이사항, 기동, 훈련과목, 단독비행 승인 등을 남겨 주세요."
            className={inputClass}
          />
        </div>
      </fieldset>
      </>)}

      

      <hr data-mbaas-oid="obc1elg" className="border-white/[0.08]" />

      {/* 9. 조종사 서명(자기 인증) */}
      <fieldset data-mbaas-oid="rcl7tn3">
        <legend data-mbaas-oid="po864wo" className={sectionTitleClass}>9. 조종사 서명 (자기 인증)</legend>
        <p data-mbaas-oid="4h206k1" className={sectionHintClass}>
          "I certify that the statements made by me on this form are true." 이 기록에 기재된 내용이 사실임을 본인이 직접 서명해 확정합니다.
        </p>

        {initialValues?.pilotCertification?.certifiedAt && (
          <p data-mbaas-oid="3ui8vr9" className="mt-2 text-xs font-medium text-go">
            최근 확정 서명: {formatSignedAt(initialValues.pilotCertification.certifiedAt)}
          </p>
        )}

        <div data-mbaas-oid="3j7gjsc" className="mt-3 max-w-sm">
          <SignaturePad onChange={setSignatureDataUrl} />
        </div>
        {errors.certification && <p data-mbaas-oid="to5ua9s" className="mt-1.5 text-xs text-rose-600">{errors.certification}</p>}

        <div data-mbaas-oid="xpa33ex" className="mt-3">
          <Button data-mbaas-oid="ozt4m42" type="submit" name="formAction" value="certify" variant="outline" tone="brand" size="sm">
            기록 확정 (서명)
          </Button>
        </div>
      </fieldset>

      <div
        data-mbaas-oid="rdre8ib"
        className="sticky bottom-0 -mx-cardpad -mb-cardpad mt-8 flex flex-wrap gap-3 border-t border-white/10 bg-navy/95 px-cardpad py-4 backdrop-blur-sm"
      >
        <Button data-mbaas-oid="ucr1gf5" type="submit" name="formAction" value="save" size="md">
          {mode === 'create' ? '비행 기록 추가하기' : '수정 내용 저장하기'}
        </Button>
        {onCancel && (
          <Button data-mbaas-oid="n2992jg" type="button" variant="outline" tone="neutral" size="md" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
}
