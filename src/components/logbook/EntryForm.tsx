import React, { useRef, useState } from 'react'
import { getEntryPresets, mergePresetChips } from '../../data/entryPresets'
import { scrollToFirstError } from '../../lib/ui/scrollToFirstError'
import { PILOT_TRACK_LABEL, entryTrack, isUnmannedKind, vehicleKindsForTrack } from '../../lib/tracks'
import type { PilotTrack } from '../../lib/tracks'
import { FLIGHT_CATEGORIES, SIM_DEVICE_LABEL } from '../../types/logbook'
import type { LogbookEntry, LogbookEntryInput, SimDeviceKind } from '../../types/logbook'

import { Button } from '../Button'
import { localToday } from '../../lib/ui/localDate'
import { Minus, Plus } from 'lucide-react'
import { InfoTip } from '../InfoTip'

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
  /** v1.1 — 이 기록의 자격 구분. 상단 전환기 값이 그대로 들어오며 폼에서는 바꾸지 않는다. */
  track?: PilotTrack
  /** 신규 입력 시 "이 비행에서 나의 역할" 기본값. 보유 자격에서 LogbookPage가 계산해 전달 */
  defaultRole?: 'student' | 'pic' | 'cfi'
  /**
   * 조종사 자격증명(PPL 이상) 보유 여부. "학생" 역할의 자동채움 규칙을 가른다.
   *   - 없음(조종연습허가서): 교관 동승 → Dual만 / 단독 → PIC+단독
   *   - 있음(계기·사업용 연습): PIC + Dual
   */
  hasLicence?: boolean
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
  // 예전 기록에는 "RKPU-RKTL" 처럼 경로 전체가 한 칸에 들어간 것과 시뮬 표기(SIM/FTD)가 섞여 있다.
  // 칩은 공항 코드 하나 단위로만 보여준다.
  const SIM_TOKENS = new Set(['SIM', 'FTD', 'FFS', 'BATD', '시뮬', '시뮬레이터'])
  const airportTokens = entries
    .flatMap((e) => [e.departure, e.arrival, e.viaAirports])
    .flatMap((v) => (v ?? '').split(/[-–/,\s]+/))
    .map((v) => v.trim().toUpperCase())
    .filter((v) => v && !SIM_TOKENS.has(v))
  return {
    airports: top(airportTokens),
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
// 동일한 필드 스타일을 재사용하기 위해 export해요.
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
  defaultRole,
  hasLicence = false,
}: EntryFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [entryRole, setEntryRole] = useState<EntryRole>(initialValues ? '' : (defaultRole ?? ''))
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
  // 학생(조종연습생) 단독 비행 여부 — 교관 동승이면 교육시간(Dual)만, 단독이면 PIC+단독 시간으로 잡힌다(별표 4 단독 비행경력).
  const [studentSolo, setStudentSolo] = useState<boolean>(Boolean(initialValues?.pilotingTime?.solo))
  const applyRoleAutofill = (role: EntryRole, total: number, solo = studentSolo) => {
    if (!role || !(total > 0)) return
    const targets =
      role === 'student'
        ? hasLicence
          ? ['dualReceived', 'picTime'] // 자가용 보유 + 계기·사업용 연습: PIC와 Dual 둘 다
          : solo
            ? ['picTime', 'soloTime'] // 조종연습생 단독
            : ['dualReceived'] // 조종연습생 교관 동승: Dual만
        : role === 'pic'
          ? ['picTime']
          : ['flightInstructorTime', 'picTime']
    targets.forEach((name) => {
      if (canAutofill(name)) setField(name, fmt(total), true)
    })
  }
  const handleStudentSoloChange = (solo: boolean) => {
    setStudentSolo(solo)
    ;['dualReceived', 'picTime', 'soloTime'].forEach((name) => {
      if (autofilledRef.current.has(name)) setField(name, '')
    })
    applyRoleAutofill('student', Number(getField('blockTime')?.value), solo)
  }
  const handleTotalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (!Number.isFinite(value) || value <= 0) return
    if (e.target.name !== 'blockTime' && canAutofill('blockTime')) setField('blockTime', fmt(value), true)
    const total = Number(getField('blockTime')?.value) || value
    applyRoleAutofill(entryRole, total)
    // 주간 = 총시간, 야간 = 0 을 기본으로 채운다(야간이면 사용자가 야간 칸을 고치면 주간이 자동 보정됨).
    // 사용자가 직접 고친 값은 덮어쓰지 않는다.
    const day = Number(getField('conditionDay')?.value)
    if (canAutofill('conditionDay')) {
      setField('conditionDay', fmt(total), true)
      if (canAutofill('conditionNight')) setField('conditionNight', '0', true)
    } else if (Number.isFinite(day) && day > 0 && total - day >= 0 && canAutofill('conditionNight')) {
      setField('conditionNight', fmt(total - day), true)
    }
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
    ;['dualReceived', 'picTime', 'flightInstructorTime', 'soloTime'].forEach((name) => {
      if (autofilledRef.current.has(name)) setField(name, '')
    })
    applyRoleAutofill(role, Number(getField('blockTime')?.value))
  }

  // v1.1 — 트랙·장치 종류·시뮬 장치 구분
  const vehicleClass: PilotTrack = initialValues ? entryTrack(initialValues) : (track ?? 'aircraft')
  const [vehicleKind, setVehicleKind] = useState<string>(initialValues?.vehicleKind ?? '')
  const [simDevice, setSimDevice] = useState<SimDeviceKind>(initialValues?.simDevice ?? 'FTD')
  const kindOptions = vehicleKindsForTrack(vehicleClass)
  const isUnmanned = vehicleClass === 'ultralight' && isUnmannedKind(vehicleKind)

  const isSimKind = entryKind === 'sim'
  // 빠른 입력: 처음엔 기본 정보·출발/도착·블록타임만 보이고, 범주·자격·조건·이착륙 상세는 접어 둔다.
  // 학생 기록의 대부분은 4~5칸이면 나머지가 역할에 따라 자동으로 채워진다. 수정 모드는 펼쳐서 시작.
  const [showDetails, setShowDetails] = useState<boolean>(Boolean(initialValues))
  const presets = getEntryPresets(entryKind)
  const historyTypes = suggestions?.aircraftTypes?.filter((v) => (isSimKind ? /ftd/i.test(v) : !/ftd/i.test(v)))
  const historyRegs = suggestions?.registrations?.filter((v) => (isSimKind ? /ftd|multi|mento|frasca/i.test(v) : !/ftd|multi|mento|frasca/i.test(v)))
  const aircraftTypeChips = mergePresetChips(presets.aircraftTypes, historyTypes)
  const registrationChips = mergePresetChips(presets.registrations, historyRegs)
  const departureChips = mergePresetChips(presets.departures, suggestions?.airports)
  const arrivalChips = mergePresetChips(presets.arrivals, suggestions?.airports)
  const viaChips = mergePresetChips(presets.via, suggestions?.airports)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nextErrors: FieldErrors = {}

    const date = String(form.get('date') || '').trim()
    // "RKTL-RKPU-RKJY" 처럼 출발지 칸에 경로 전체를 넣어도 출발·경유·도착으로 자동 분해한다(실물 로그북 표기 습관).

    let departure = String(form.get('departure') || '').trim().toUpperCase()

    let arrival = String(form.get('arrival') || '').trim().toUpperCase()

    let viaAirportsRaw = String(form.get('viaAirports') || '').trim().toUpperCase()

    {

      const tokens = departure.split(/[-–/]/).map((t) => t.trim()).filter(Boolean)

      if (tokens.length >= 2) {

        departure = tokens[0]

        if (!arrival) arrival = tokens[tokens.length - 1]

        const middle = tokens.slice(1, -1)

        if (middle.length > 0 && !viaAirportsRaw) viaAirportsRaw = middle.join(', ')

      }

    }
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
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setShowDetails(true)
      // 접혀 있던 상세 섹션이 펼쳐진 뒤(다음 프레임) 첫 오류로 스크롤해야 hidden 요소를 건너뛰지 않는다
      window.setTimeout(() => scrollToFirstError(formRef.current), 0)
      return
    }

    setErrors({})

    // 연도(year)는 사용자가 입력하지 않고 비행 날짜(date)에서 자동으로 추출해요.
    const year = date ? Number(date.slice(0, 4)) : undefined

    onSubmit({
      year,
      date,
      departure: isSim ? 'SIM' : departure,
      arrival: isSim ? 'SIM' : arrival,
      viaAirports: viaAirportsRaw || undefined,
      aircraftType,
      aircraftIdentification: String(form.get('aircraftIdentification') || '').trim() || undefined,
      blockTime: isSim ? 0 : blockTime,
      // 대표 비행 종류(flightCategory)는 더 이상 폼에서 입력받지 않고 기본값으로 채웁니다.
      // 목록/필터의 실제 배지는 EntryList.tsx의 deriveBadges()가 기록된 시간 값을 기준으로 다시 계산해요.
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
      twoPilotAircraft: form.get('twoPilotAircraft') === 'on' ? true : undefined,
      // 본인 서명은 제77조 증명이 아니라 v45에서 제거. 예전 기록에 붙은 값만 유지.
      pilotCertification: initialValues?.pilotCertification,
      instructorSignature: initialValues?.instructorSignature,
      signatureRequestPostId: initialValues?.signatureRequestPostId,
      origin: initialValues?.origin ?? 'manual',
      legacySourceNote: initialValues?.legacySourceNote,
    })

    if (mode === 'create') {
      e.currentTarget.reset()
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-8">
      {/* v1.1 — 자격 구분은 상단 전환기 값을 그대로 쓴다(중복 선택 제거). 경량·초경량만 종류를 고른다. */}
      {kindOptions.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <label htmlFor="vehicleKind" className={`${labelClass} inline-flex items-center gap-1`}>
            종류
            <InfoTip label="종류 안내">
              {PILOT_TRACK_LABEL[vehicleClass]} 기록이에요. 종류는 자격 한정 단위라 응시경력 계산에 쓰여요. 경량·초경량은 야간 시간이 저장되지 않아요.
              {isUnmanned ? ' 무인비행장치 기록은 참고·보조 자료이고, 응시·등록용 경력은 지도조종자 확인과 교육기관 증명으로만 인정돼요.' : ''}
            </InfoTip>
          </label>
          <select
            id="vehicleKind"
            name="vehicleKind"
            value={vehicleKind}
            onChange={(e) => setVehicleKind(e.target.value)}
            className={inputClass}
          >
            <option value="">선택</option>
            {kindOptions.map((k) => (
              <option key={k.key} value={k.key}>{k.label}</option>
            ))}
          </select>

        </div>
      )}

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
          <option value="student">{hasLicence ? '학생 (교육 비행 · 자격 보유, PIC+Dual)' : '학생 (교육 비행 · 조종연습생, Dual)'}</option>
          <option value="pic">기장 (PIC)</option>
          <option value="cfi">교관 (CFI)</option>
        </select>
        <p className="mt-1.5 text-xs text-slate-400">
          {(() => {
            // 역할별로 "무엇이 채워지는지"를 그대로 적는다.
            // (예전 문구는 "교육·PIC·교관 시간이 자동으로 채워져요"라 자격증 없는 학생도
            //  PIC가 채워지는 것처럼 오해할 수 있었다)
            if (entryRole === 'student' && !hasLicence) {
              return studentSolo
                ? '비행시간을 넣으면 PIC 시간 + 단독 시간에 채워져요. 교육 받은 시간(Dual)은 0이에요.'
                : '비행시간을 넣으면 교육 받은 시간(Dual)에만 채워져요. PIC는 0이에요.'
            }
            if (entryRole === 'student' && hasLicence) {
              return '비행시간을 넣으면 PIC 시간 + 교육 받은 시간(Dual)에 함께 채워져요.'
            }
            if (entryRole === 'pic') return '비행시간을 넣으면 PIC 시간에 채워져요.'
            if (entryRole === 'cfi') return '비행시간을 넣으면 PIC 시간 + 교관 시간에 채워져요.'
            return '역할을 고르면 그 역할에 맞는 시간이 자동으로 채워져요.'
          })()}
          {' '}직접 고친 값은 덮어쓰지 않아요.
        </p>
        {entryRole === 'student' && hasLicence && (
          <p className="mt-2 text-[11px] text-slate-400">
            자가용 조종사 자격을 이미 보유해서, 교육 비행이라도 기장 자격으로 탑승한 것으로 봐요. 그래서 PIC와 교육 받은 시간에 함께 기록돼요(계기비행증명·사업용 연습).
          </p>
        )}
        {entryRole === 'student' && !hasLicence && (
          <div className="mt-3 rounded-control border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <label className="flex items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                name="studentSolo"
                checked={studentSolo}
                onChange={(e) => handleStudentSoloChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-sky"
              />
              <span className="inline-flex items-center gap-1">
                <span className="font-semibold">단독 비행(Solo)이었어요</span>
                <InfoTip label="단독 비행 기록 방식">
                  체크하면 PIC 시간 + 단독 시간으로 기록돼요(자가용 응시경력의 "단독 10시간"에 합산). 체크 안 하면 교관 동승 교육 비행으로 보고 교육 받은 시간(Dual)에만 기록되고 PIC는 0이에요.
                </InfoTip>
              </span>
            </label>
            <input type="hidden" name="soloTime" defaultValue={initialValues?.pilotingTime?.solo ?? ''} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="inline-flex rounded-control border border-white/15 p-1">
          {(['flight', 'sim'] as const).map((kind) => (
            <button key={kind}
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
          <div className="mt-3">
            <label htmlFor="simDevice" className={`${labelClass} inline-flex items-center gap-1`}>
              모의비행훈련장치 구분
              <InfoTip label="시뮬레이터 기록 안내">
                시뮬레이터 기록은 <span className="font-semibold text-slate-100">시뮬레이터 시간만 필수</span>예요. 모의계기·계기접근·비고는 선택이고, 출발/도착지와 비행시간 칸은 자동으로 처리돼요.
                <br />
                별표 4 인정 상한은 장치별로 달라요(예: 운송용 FFS 100 / FTD 25 / BATD 5, FTD+BATD 합산 25). 울진 FTD는 지방항공청 지정 장치예요.
              </InfoTip>
            </label>
            <select id="simDevice" name="simDevice" value={simDevice} onChange={(e) => setSimDevice(e.target.value as SimDeviceKind)} className={inputClass}>
              {(['FFS', 'FTD', 'BATD'] as SimDeviceKind[]).map((d) => (
                <option key={d} value={d}>{SIM_DEVICE_LABEL[d]}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {/* 기본 정보 */}
      <fieldset>
        <legend className={sectionTitleClass}>기본 정보</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className={labelClass}>
              비행 날짜
            </label>
            <input id="date"
              name="date"
              type="date"
              defaultValue={initialValues?.date ?? (mode === 'create' ? localToday() : undefined)}
              className={inputClass}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'date-error' : undefined}
            />
            {errors.date && (
              <p id="date-error" className="mt-1.5 text-xs text-rose-600">
                {errors.date}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="aircraftType" className={labelClass}>
              {aircraftTypeLabel}
            </label>
            <input id="aircraftType"
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
              <p id="aircraftType-error" className="mt-1.5 text-xs text-rose-600">
                {errors.aircraftType}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="aircraftIdentification" className={labelClass}>
              {aircraftIdLabel}
            </label>
            <input id="aircraftIdentification"
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

      <hr className="border-white/[0.08]" />

      {/* 출발/도착지 */}
      {entryKind === 'flight' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>출발/도착지</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="departure" className={labelClass}>
              출발지
            </label>
            <input id="departure"
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
              <p id="departure-error" className="mt-1.5 text-xs text-rose-600">
                {errors.departure}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="arrival" className={labelClass}>
              도착지
            </label>
            <input id="arrival"
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
              <p id="arrival-error" className="mt-1.5 text-xs text-rose-600">
                {errors.arrival}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="viaAirports" className={labelClass}>
              경유 공항 (선택)
            </label>
            <input id="viaAirports"
              name="viaAirports"
              type="text"
              defaultValue={initialValues?.viaAirports}
              placeholder="예: RKTN, RKNY"
              className={`${inputClass} font-mono-data`}
            />
            <Chips items={viaChips} onPick={(v) => setField('viaAirports', v)} />
            <p className={sectionHintClass}>여러 곳이면 쉼표로 구분해 입력해 주세요.</p>
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr className="border-white/[0.08]" />

      <hr className="border-white/[0.08]" />

      {/* 블록타임 · 비고 */}
      {entryKind === 'flight' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>블록타임 · 비고</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="blockTime" className={labelClass}>
              블록타임(시간)
            </label>
            <input id="blockTime"
              name="blockTime"
              onChange={handleTotalInput}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              defaultValue={initialValues?.blockTime}
              placeholder="예: 1.5"
              className={numberInputClass}
              aria-invalid={Boolean(errors.blockTime)}
              aria-describedby={errors.blockTime ? 'blockTime-error' : undefined}
            />
            {errors.blockTime && (
              <p id="blockTime-error" className="mt-1.5 text-xs text-rose-600">
                {errors.blockTime}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5">
          <label htmlFor="notes" className={labelClass}>
            비고 (선택)
          </label>
          <textarea id="notes"
            name="notes"
            rows={3}
            defaultValue={initialValues?.notes}
            placeholder="특이사항, 기동, 훈련과목, 단독비행 승인 등을 남겨 주세요."
            className={inputClass}
          />
        </div>
      </fieldset>
      </>)}


      {entryKind === 'flight' && (
        <button type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          aria-controls="entry-details"
          data-testid="entry-details-toggle"
          className={`flex w-full items-center justify-between gap-3 rounded-control border px-4 py-3 text-left text-sm font-semibold transition-colors
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
            ${showDetails ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-sky/40 bg-sky/10 text-sky hover:bg-sky/15'}`}
        >
          <span className="inline-flex items-center gap-2">
            {showDetails ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {showDetails ? '상세 시간 입력 접기' : '상세 시간 입력'}
          </span>
          <span className="text-xs font-normal text-slate-400">범주·자격·조건·이착륙 — 비워 두면 역할에 따라 자동</span>
        </button>
      )}

      {/* 상세 섹션(3·4·6·7)은 접어도 unmount 하지 않는다 — 자동 채움 값이 그대로 제출되어야 하므로 hidden 만 쓴다 */}
      <div id="entry-details" hidden={!showDetails && entryKind === 'flight'}>
      {/* 3. 항공기 범주/등급별 시간 */}
      {entryKind === 'flight' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>항공기 범주/등급별 시간 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="singleEngineLand" className={labelClass}>
              단발육상(시간)
            </label>
            <input id="singleEngineLand"
              name="singleEngineLand"
              onChange={handleTotalInput}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.categoryHours?.singleEngineLand}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="multiEngineLand" className={labelClass}>
              다발육상(시간)
            </label>
            <input id="multiEngineLand"
              name="multiEngineLand"
              onChange={handleTotalInput}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.categoryHours?.multiEngineLand}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="rotorcraftHelicopter" className={labelClass}>
              회전익(헬리콥터, 시간)
            </label>
            <input id="rotorcraftHelicopter"
              name="rotorcraftHelicopter"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.categoryHours?.rotorcraftHelicopter}
              className={numberInputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="categoryOtherLabel" className={labelClass}>
                기타 명칭
              </label>
              <input id="categoryOtherLabel"
                name="categoryOtherLabel"
                type="text"
                defaultValue={initialValues?.categoryHours?.otherLabel}
                placeholder="예: 활공기"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="categoryOtherHours" className={labelClass}>
                기타 시간
              </label>
              <input id="categoryOtherHours"
                name="categoryOtherHours"
                type="number"
              inputMode="decimal"
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

      

      <hr className="border-white/[0.08]" />

      {/* 4. 비행 자격 시간 종류 */}
      {entryKind === 'flight' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>비행 자격 시간 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="dualReceived" className={labelClass}>
              DUAL RECEIVED(시간)
            </label>
            <input id="dualReceived"
              name="dualReceived"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.dualReceived}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="picTime" className={labelClass}>
              PILOT-IN-COMMAND(PIC, 시간)
            </label>
            <input id="picTime"
              name="picTime"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.pic}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="sicTime" className={labelClass}>
              SECOND-IN-COMMAND(SIC, 시간)
            </label>
            <input id="sicTime"
              name="sicTime"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.sic}
              className={numberInputClass}
            />
            <label className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-400">
              <input type="checkbox" name="twoPilotAircraft" defaultChecked={initialValues?.twoPilotAircraft ?? false} className="mt-0.5 h-3.5 w-3.5 accent-sky" />
              <span className="inline-flex items-center gap-1">
                2인 조종 항공기(비행교범 기준)
                <InfoTip label="2인 조종 항공기 설명">
                  체크하지 않으면 응시경력 산정 때 SIC 시간이 1/2만 인정돼요(시행규칙 제78조).
                </InfoTip>
              </span>
            </label>
          </div>
          <div>
            <label htmlFor="flightInstructorTime" className={labelClass}>
              AS FLIGHT INSTRUCTOR(시간)
            </label>
            <input id="flightInstructorTime"
              name="flightInstructorTime"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.pilotingTime?.flightInstructor}
              className={numberInputClass}
            />
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr className="border-white/[0.08]" />

      {/* 5. 지상훈련장비 */}
      {entryKind === 'sim' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>시뮬레이터 시간 (필수)</legend>
        <div className="mt-3 max-w-xs">
          <label htmlFor="groundTrainerTime" className={labelClass}>
            시뮬레이터 시간
          </label>
          <input id="groundTrainerTime"
            name="groundTrainerTime"
            type="number"
              inputMode="decimal"
            step="0.1"
            min="0"
            defaultValue={initialValues?.groundTrainerTime}
            className={numberInputClass}
          />
        </div>
      
          {errors.groundTrainerTime && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.groundTrainerTime}</p>
          )}
          {/* 시뮬레이터 전용 입력 — 실비행 섹션(6·7·8)이 숨겨져 있어 이름 충돌이 없다 */}
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="sim-instrument" className={labelClass}>모의계기 시간 (선택)</label>
              <input id="sim-instrument" name="simulatedInstrument" type="number"
              inputMode="decimal" step="0.1" min="0" className={numberInputClass} />
            </div>
            <div>
              <label htmlFor="sim-approaches" className={labelClass}>계기 접근 횟수 (선택)</label>
              <input id="sim-approaches" name="instrumentApproaches" type="number"
              inputMode="decimal" step="1" min="0" placeholder="예: 2" className={numberInputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="sim-notes" className={labelClass}>비고 (선택)</label>
            <textarea id="sim-notes" name="notes" rows={2} defaultValue={initialValues?.notes} className={inputClass} />
          </div>
        </fieldset>
      </>)}

      

      <hr className="border-white/[0.08]" />

      {/* 6. 비행 조건별 시간 */}
      {entryKind === 'flight' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>비행 조건별 시간 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="conditionDay" className={labelClass}>
              주간(시간)
            </label>
            <input id="conditionDay"
              name="conditionDay"
              onChange={handleDayNight}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.day}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="conditionNight" className={labelClass}>
              야간(시간)
            </label>
            <input id="conditionNight"
              name="conditionNight"
              onChange={handleDayNight}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.night}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="crossCountry" className={`${labelClass} inline-flex items-center gap-1`}>
              크로스컨트리(시간)
              <InfoTip label="크로스컨트리 정의">
                출발지 외 1개 지점 착륙을 포함한 비행시간(운항기술기준 정의 43). 자가용·사업용·계기비행증명 응시경력용은 출발지에서 직선 50NM 이상 떨어진 공항 착륙을 포함해야 해요.
              </InfoTip>
            </label>
            <input id="crossCountry"
              name="crossCountry"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.crossCountry}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="actualInstrument" className={labelClass}>
              실제계기(시간)
            </label>
            <input id="actualInstrument"
              name="actualInstrument"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.actualInstrument}
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="simulatedInstrument" className={labelClass}>
              모의계기(시간)
            </label>
            <input id="simulatedInstrument"
              name="simulatedInstrument"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={initialValues?.conditions?.simulatedInstrument}
              className={numberInputClass}
            />
          </div>
        </div>
      </fieldset>
      </>)}

      

      <hr className="border-white/[0.08]" />

      {/* 7. 접근/이착륙 횟수 */}
      {entryKind === 'flight' && (<>

      <fieldset>
        <legend className={sectionTitleClass}>접근/이착륙 횟수 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="instrumentApproaches" className={labelClass}>
              계기 접근 횟수
            </label>
            <input id="instrumentApproaches"
              name="instrumentApproaches"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              defaultValue={initialValues?.instrumentApproaches}
              placeholder="예: 2"
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="dayLandings" className={labelClass}>
              주간 이착륙 횟수
            </label>
            <input id="dayLandings"
              name="dayLandings"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              defaultValue={initialValues?.dayLandings ?? 0}
              placeholder="예: 3"
              className={numberInputClass}
            />
          </div>
          <div>
            <label htmlFor="nightLandings" className={labelClass}>
              야간 이착륙 횟수
            </label>
            <input id="nightLandings"
              name="nightLandings"
              type="number"
              inputMode="decimal"
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
      </div>


      

      <hr className="border-white/[0.08]" />



      <div
        className="sticky bottom-0 -mx-cardpad -mb-cardpad mt-8 flex flex-wrap gap-3 border-t border-white/10 bg-navy/95 px-cardpad py-4 backdrop-blur-sm"
      >
        <Button type="submit" name="formAction" value="save" size="md" data-testid="entry-submit">
          {mode === 'create' ? '저장' : '수정 내용 저장하기'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" tone="neutral" size="md" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
}
