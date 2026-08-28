import React, { useState } from 'react'

import { Button } from '../Button'
import { FLIGHT_CATEGORIES } from '../../types/logbook'
import { SignaturePad } from './SignaturePad'
import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

interface FieldErrors {
  date?: string
  departure?: string
  arrival?: string
  aircraftType?: string
  blockTime?: string
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
}

// 아래 스타일 상수/헬퍼는 FlightExperienceCertificateForm.tsx(비행경력증명서로 가져오기)에서도
// 동일한 필드 스타일을 재사용하기 위해 export합니다.
export const inputClass =
  'w-full rounded-control border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

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
  aircraftTypeLabel = '항공기 제작사 및 모델',
  aircraftTypePlaceholder = '예: Cessna C172, Boeing 737',
  aircraftIdLabel = '항공기 등록번호 / 테일넘버 (선택)',
  aircraftIdPlaceholder = '예: HL1234',
}: EntryFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({})
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

    if (!date) nextErrors.date = '비행 날짜를 입력해 주세요.'
    if (!departure) nextErrors.departure = '출발지를 입력해 주세요.'
    if (!arrival) nextErrors.arrival = '도착지를 입력해 주세요.'
    if (!aircraftType) nextErrors.aircraftType = '기종을 입력해 주세요.'
    if (!blockTimeRaw || Number.isNaN(blockTime) || blockTime <= 0) {
      nextErrors.blockTime = '블록타임을 0보다 큰 숫자로 입력해 주세요.'
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
      departure,
      arrival,
      viaAirports: String(form.get('viaAirports') || '').trim() || undefined,
      aircraftType,
      aircraftIdentification: String(form.get('aircraftIdentification') || '').trim() || undefined,
      blockTime,
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
      pilotingTime: {
        dualReceived: numOrUndef(form.get('dualReceived')),
        pic: numOrUndef(form.get('picTime')),
        sic: numOrUndef(form.get('sicTime')),
        flightInstructor: numOrUndef(form.get('flightInstructorTime')),
      },
      groundTrainerTime: numOrUndef(form.get('groundTrainerTime')),
      conditions: {
        day: numOrUndef(form.get('conditionDay')),
        night: numOrUndef(form.get('conditionNight')),
        crossCountry: numOrUndef(form.get('crossCountry')),
        actualInstrument: numOrUndef(form.get('actualInstrument')),
        simulatedInstrument: numOrUndef(form.get('simulatedInstrument')),
      },
      instrumentApproaches: numOrUndef(form.get('instrumentApproaches')),
      dayLandings: Number.isFinite(dayLandings) && dayLandings > 0 ? dayLandings : 0,
      nightLandings: Number.isFinite(nightLandings) && nightLandings > 0 ? nightLandings : 0,
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
    <form data-mbaas-oid="lgbfrm1" noValidate onSubmit={handleSubmit} className="space-y-8">
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
              defaultValue={initialValues?.date}
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
              placeholder={aircraftTypePlaceholder}
              className={inputClass}
              aria-invalid={Boolean(errors.aircraftType)}
              aria-describedby={errors.aircraftType ? 'aircraftType-error' : undefined}
            />
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
              placeholder={aircraftIdPlaceholder}
              className={`${inputClass} font-mono-data`}
            />
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="kc5iv2c" className="border-slate-100" />

      {/* 2. 출발/도착지 */}
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
              placeholder="예: RKSI"
              className={`${inputClass} font-mono-data`}
              aria-invalid={Boolean(errors.departure)}
              aria-describedby={errors.departure ? 'departure-error' : undefined}
            />
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
              placeholder="예: RKPC"
              className={`${inputClass} font-mono-data`}
              aria-invalid={Boolean(errors.arrival)}
              aria-describedby={errors.arrival ? 'arrival-error' : undefined}
            />
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
              placeholder="예: RKPU, RKTN"
              className={`${inputClass} font-mono-data`}
            />
            <p data-mbaas-oid="6uzo4cg" className={sectionHintClass}>여러 곳이면 쉼표로 구분해 입력해 주세요.</p>
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="ky79b2k" className="border-slate-100" />

      {/* 3. 항공기 범주/등급별 시간 */}
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

      <hr data-mbaas-oid="7hct34q" className="border-slate-100" />

      {/* 4. 비행 자격 시간 종류 */}
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

      <hr data-mbaas-oid="aa5e0u7" className="border-slate-100" />

      {/* 5. 지상훈련장비 */}
      <fieldset data-mbaas-oid="ktbegxv">
        <legend data-mbaas-oid="87l6119" className={sectionTitleClass}>5. 지상훈련장비 (선택)</legend>
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
      </fieldset>

      <hr data-mbaas-oid="19wzhue" className="border-slate-100" />

      {/* 6. 비행 조건별 시간 */}
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

      <hr data-mbaas-oid="1d2ng39" className="border-slate-100" />

      {/* 7. 접근/이착륙 횟수 */}
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

      <hr data-mbaas-oid="480rj37" className="border-slate-100" />

      {/* 8. 총 비행시간 및 비고 */}
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

      <hr data-mbaas-oid="obc1elg" className="border-slate-100" />

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
        className="sticky bottom-0 -mx-cardpad -mb-cardpad mt-8 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-cardpad py-4 backdrop-blur-sm"
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
