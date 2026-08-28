import { AlertTriangle, Camera, FileCheck2, Info } from 'lucide-react'
import React, { useState } from 'react'

import { Button } from '../Button'
import {
  inputClass,
  labelClass,
  numOrUndef,
  numberInputClass,
  sectionHintClass,
  sectionTitleClass,
} from './EntryForm'
import { useAuth } from '../../contexts/AuthContext'
import { useCreateFlightExperienceCertificatePost } from '../../hooks/baas/useCreateFlightExperienceCertificatePost'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import { useUploadBoardFile } from '../../hooks/baas/useUploadBoardFile'
import {
  buildFlightExperienceCertificateContent,
  buildFlightExperienceCertificateTitle,
} from '../../lib/flightExperienceCertificateSync'
import { FLIGHT_CATEGORIES } from '../../types/logbook'
import type { LogbookEntryInput } from '../../types/logbook'

interface FieldErrors {
  date?: string
  blockTime?: string
}

interface FlightExperienceCertificateFormProps {
  onSubmit: (input: LogbookEntryInput) => void
}

interface SyncNotice {
  tone: 'success' | 'warning'
  message: string
}

/**
 * 엑셀 로그북 파일이 없는 사용자를 위한 대안 이관 방법입니다. "특정 비행 1건"이 아니라 발급받은
 * 비행경력증명서에 적힌 "누적 비행경력 총합"을 항목별로 입력받고, 증명서 사진을 함께 첨부해
 * 비행기록 1건으로 저장합니다. 제출 시 "비행경력증명서" 게시판(동적 게시판)에 실제 기관 인증
 * 요청 게시글을 생성해(사진은 정식 첨부파일로 업로드) 소속 기관 계정의 실제 검토를 받을 수
 * 있으며, 요청 제출에 실패한 경우에만 본인이 직접 확인 완료로 표시하는 로컬 폴백이 남아 있습니다.
 */
export function FlightExperienceCertificateForm({ onSubmit }: FlightExperienceCertificateFormProps) {
  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? (account?.data?.organization_affiliation as string | undefined)

  const { uploadFile } = useUploadBoardFile()
  const { createCertificateRequestPost } = useCreateFlightExperienceCertificatePost()

  const [errors, setErrors] = useState<FieldErrors>({})
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [syncNotice, setSyncNotice] = useState<SyncNotice | null>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('이미지 파일만 첨부할 수 있습니다.')
      return
    }
    setImageError(null)
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.onerror = () => setImageError('사진을 읽는 중 오류가 발생했습니다. 다시 시도해 주세요.')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nextErrors: FieldErrors = {}

    const date = String(form.get('date') || '').trim()
    const blockTimeRaw = String(form.get('blockTime') || '').trim()
    const blockTime = Number(blockTimeRaw)
    const dayLandingsRaw = String(form.get('dayLandings') || '').trim()
    const nightLandingsRaw = String(form.get('nightLandings') || '').trim()
    const dayLandings = dayLandingsRaw ? Number(dayLandingsRaw) : 0
    const nightLandings = nightLandingsRaw ? Number(nightLandingsRaw) : 0

    if (!date) nextErrors.date = '기준일을 입력해 주세요.'
    if (!blockTimeRaw || Number.isNaN(blockTime) || blockTime <= 0) {
      nextErrors.blockTime = '총 블록타임을 0보다 큰 숫자로 입력해 주세요.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

    const issuer = String(form.get('certificateIssuer') || '').trim()
    const year = Number(date.slice(0, 4))

    const categoryHours = {
      singleEngineLand: numOrUndef(form.get('singleEngineLand')),
      multiEngineLand: numOrUndef(form.get('multiEngineLand')),
      rotorcraftHelicopter: numOrUndef(form.get('rotorcraftHelicopter')),
      otherLabel: String(form.get('categoryOtherLabel') || '').trim() || undefined,
      otherHours: numOrUndef(form.get('categoryOtherHours')),
    }
    const pilotingTime = {
      dualReceived: numOrUndef(form.get('dualReceived')),
      pic: numOrUndef(form.get('picTime')),
      sic: numOrUndef(form.get('sicTime')),
      flightInstructor: numOrUndef(form.get('flightInstructorTime')),
    }
    const groundTrainerTime = numOrUndef(form.get('groundTrainerTime'))
    const conditions = {
      day: numOrUndef(form.get('conditionDay')),
      night: numOrUndef(form.get('conditionNight')),
      crossCountry: numOrUndef(form.get('crossCountry')),
      actualInstrument: numOrUndef(form.get('actualInstrument')),
      simulatedInstrument: numOrUndef(form.get('simulatedInstrument')),
    }
    const instrumentApproaches = numOrUndef(form.get('instrumentApproaches'))
    const normalizedDayLandings = Number.isFinite(dayLandings) && dayLandings > 0 ? dayLandings : 0
    const normalizedNightLandings = Number.isFinite(nightLandings) && nightLandings > 0 ? nightLandings : 0

    setIsSubmitting(true)
    setSyncNotice(null)

    // 1. 사진이 있으면 먼저 presigned 업로드로 file_id를 확보한다(게시글 첨부용).
    let fileId: number | undefined
    if (imageFile) {
      try {
        const uploaded = await uploadFile(imageFile, {
          filename: imageFile.name,
          contentType: imageFile.type || 'image/jpeg',
        })
        fileId = uploaded.fileId
      } catch (err) {
        console.warn('[비행경력증명서 사진 업로드 실패]', err)
      }
    }

    // 2. "비행경력증명서" 게시판에 인증 요청 게시글을 생성한다(제목에 소속 포함, file_ids 포함).
    let certificateRequestPostId: string | undefined
    if (account?.user_id) {
      try {
        const post = await createCertificateRequestPost({
          title: buildFlightExperienceCertificateTitle(account.name || account.user_id, account.user_id, myAffiliation),
          content: buildFlightExperienceCertificateContent({
            date,
            issuer,
            blockTime,
            categoryHours,
            pilotingTime,
            groundTrainerTime,
            conditions,
            instrumentApproaches,
            dayLandings: normalizedDayLandings,
            nightLandings: normalizedNightLandings,
          }),
          file_ids: fileId ? [fileId] : undefined,
        })
        certificateRequestPostId = post.id
      } catch (err) {
        console.warn('[비행경력증명서 인증 요청 게시글 생성 실패]', err)
      }
    }

    // 3. 생성된 게시글 id를 로컬 기록에 저장해 상세 화면에서 승인/반려를 자동 감지할 수 있게 한다.
    // 4. 업로드/게시글 생성이 실패해도 로컬 저장 자체는 유지한다(기존 "인증 대기중" 로컬 흐름 폴백).
    onSubmit({
      year,
      date,
      departure: '-',
      arrival: '-',
      aircraftType: '비행경력증명서(누적 기록)',
      blockTime,
      flightCategory: FLIGHT_CATEGORIES[0],
      categoryHours,
      pilotingTime,
      groundTrainerTime,
      conditions,
      instrumentApproaches,
      dayLandings: normalizedDayLandings,
      nightLandings: normalizedNightLandings,
      notes: issuer ? `비행경력증명서 누적 기록 (발급기관: ${issuer})` : '비행경력증명서 누적 기록',
      origin: 'flight_experience_certificate',
      legacySourceNote: issuer ? `비행경력증명서 - ${issuer}` : '비행경력증명서',
      certificateIssuer: issuer || undefined,
      certificateImageDataUrl: imageDataUrl ?? undefined,
      certificateApprovalStatus: 'pending',
      certificateRequestPostId,
    })

    e.currentTarget.reset()
    setImageDataUrl(null)
    setImageFile(null)
    setImageError(null)
    setIsSubmitting(false)
    setSubmitted(true)
    setSyncNotice(
      certificateRequestPostId
        ? { tone: 'success', message: '기관에 인증 요청을 제출했습니다. "내 비행 기록" 상세 화면에서 승인/반려 여부를 확인할 수 있습니다.' }
        : {
            tone: 'warning',
            message:
              '기록은 이 브라우저에 저장되었지만, 기관 인증 요청 제출에는 실패했습니다(네트워크 오류 등). 상세 화면에서 "학교/교관에게 확인받았습니다" 버튼으로 자기 확인할 수 있습니다.',
          },
    )
  }

  return (
    <form data-mbaas-oid="h8ha9h1" noValidate onSubmit={handleSubmit} className="space-y-8">
      <div data-mbaas-oid="s0yt7by" className="flex items-start gap-3 rounded-control border border-white/10 bg-surface p-4">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <p data-mbaas-oid="05w8a88" className="text-xs text-slate-400">
          이 폼은 "비행 1건"이 아니라, 비행경력증명서에 적힌 <strong data-mbaas-oid="z6rdqzu">누적 비행경력 총합</strong>을 항목별로 옮겨 적는
          용도입니다. 출발/도착지나 기종처럼 개별 비행에만 해당하는 값은 입력하지 않습니다. 저장하면 소속 기관에 실제
          인증 요청을 제출하는 "인증 대기중" 상태의 비행기록 1건으로 등록되며, 기관 담당자가 승인/반려하면 자동으로
          반영됩니다.
        </p>
      </div>

      {/* 1. 기준 정보 */}
      <fieldset data-mbaas-oid="hcczrwe">
        <legend data-mbaas-oid="m0fdwr6" className={sectionTitleClass}>1. 증명서 기준 정보</legend>
        <div data-mbaas-oid="fmcnltl" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div data-mbaas-oid="iqietvj">
            <label data-mbaas-oid="ome10ch" htmlFor="cert-date" className={labelClass}>
              기준일 (증명서 발급일 등)
            </label>
            <input
              data-mbaas-oid="5qskukf" id="cert-date"
              name="date"
              type="date"
              className={inputClass}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'cert-date-error' : undefined}
            />
            {errors.date && (
              <p data-mbaas-oid="6t0v6qv" id="cert-date-error" className="mt-1.5 text-xs text-rose-600">
                {errors.date}
              </p>
            )}
          </div>
          <div data-mbaas-oid="sa6u7av">
            <label data-mbaas-oid="yn4683h" htmlFor="cert-issuer" className={labelClass}>
              발급기관명
            </label>
            <input
              data-mbaas-oid="774at6v" id="cert-issuer"
              name="certificateIssuer"
              type="text"
              placeholder="예: OO비행교육원"
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="oimtxga" className="border-white/[0.08]" />

      {/* 2. 항공기 범주/등급별 누적 시간 */}
      <fieldset data-mbaas-oid="zrm1tat">
        <legend data-mbaas-oid="tjup3jb" className={sectionTitleClass}>2. 항공기 범주/등급별 누적 시간 (선택)</legend>
        <div data-mbaas-oid="d99t9z1" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div data-mbaas-oid="85q4bqw">
            <label data-mbaas-oid="uyoykws" htmlFor="cert-singleEngineLand" className={labelClass}>
              단발육상(시간)
            </label>
            <input data-mbaas-oid="crsyij7" id="cert-singleEngineLand" name="singleEngineLand" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="wt20n52">
            <label data-mbaas-oid="w8lza9i" htmlFor="cert-multiEngineLand" className={labelClass}>
              다발육상(시간)
            </label>
            <input data-mbaas-oid="ok9s46s" id="cert-multiEngineLand" name="multiEngineLand" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="h67kkla">
            <label data-mbaas-oid="aux5lsv" htmlFor="cert-rotorcraftHelicopter" className={labelClass}>
              회전익(헬리콥터, 시간)
            </label>
            <input data-mbaas-oid="uebsken" id="cert-rotorcraftHelicopter" name="rotorcraftHelicopter" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="e16jf97" className="grid grid-cols-2 gap-2">
            <div data-mbaas-oid="jhbul8e">
              <label data-mbaas-oid="gjx7gxp" htmlFor="cert-categoryOtherLabel" className={labelClass}>
                기타 명칭
              </label>
              <input data-mbaas-oid="ue16t5d" id="cert-categoryOtherLabel" name="categoryOtherLabel" type="text" placeholder="예: 활공기" className={inputClass} />
            </div>
            <div data-mbaas-oid="0n5yz09">
              <label data-mbaas-oid="pv3txe0" htmlFor="cert-categoryOtherHours" className={labelClass}>
                기타 시간
              </label>
              <input data-mbaas-oid="wp5mbi2" id="cert-categoryOtherHours" name="categoryOtherHours" type="number" step="0.1" min="0" className={numberInputClass} />
            </div>
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="sx0xwrl" className="border-white/[0.08]" />

      {/* 3. 비행 자격 시간 종류 */}
      <fieldset data-mbaas-oid="rhumxem">
        <legend data-mbaas-oid="2gj3uby" className={sectionTitleClass}>3. 비행 자격 시간 종류별 누적 (선택)</legend>
        <div data-mbaas-oid="4g9m2yh" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div data-mbaas-oid="bfjocjv">
            <label data-mbaas-oid="neulphs" htmlFor="cert-dualReceived" className={labelClass}>
              DUAL RECEIVED(시간)
            </label>
            <input data-mbaas-oid="yttsje5" id="cert-dualReceived" name="dualReceived" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="7dvofip">
            <label data-mbaas-oid="6ylfsp1" htmlFor="cert-picTime" className={labelClass}>
              PILOT-IN-COMMAND(PIC, 시간)
            </label>
            <input data-mbaas-oid="etg41rs" id="cert-picTime" name="picTime" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="741u55d">
            <label data-mbaas-oid="ul6xxy6" htmlFor="cert-sicTime" className={labelClass}>
              SECOND-IN-COMMAND(SIC, 시간)
            </label>
            <input data-mbaas-oid="4xbedih" id="cert-sicTime" name="sicTime" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="z9j7by2">
            <label data-mbaas-oid="2lsm0rg" htmlFor="cert-flightInstructorTime" className={labelClass}>
              AS FLIGHT INSTRUCTOR(시간)
            </label>
            <input data-mbaas-oid="ag1jzop" id="cert-flightInstructorTime" name="flightInstructorTime" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="5qg5wir" className="border-white/[0.08]" />

      {/* 4. 지상훈련장비 */}
      <fieldset data-mbaas-oid="8f3rf3d">
        <legend data-mbaas-oid="80gsv4d" className={sectionTitleClass}>4. 지상훈련장비 누적 (선택)</legend>
        <div data-mbaas-oid="wchzn2e" className="mt-3 max-w-xs">
          <label data-mbaas-oid="x1j2rwy" htmlFor="cert-groundTrainerTime" className={labelClass}>
            시뮬레이터 시간
          </label>
          <input data-mbaas-oid="626gx5g" id="cert-groundTrainerTime" name="groundTrainerTime" type="number" step="0.1" min="0" className={numberInputClass} />
        </div>
      </fieldset>

      <hr data-mbaas-oid="uzbmacn" className="border-white/[0.08]" />

      {/* 5. 비행 조건별 누적 시간 */}
      <fieldset data-mbaas-oid="x7aw6ng">
        <legend data-mbaas-oid="3f8m86r" className={sectionTitleClass}>5. 비행 조건별 누적 시간 (선택)</legend>
        <div data-mbaas-oid="dpwpx78" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div data-mbaas-oid="2movpuu">
            <label data-mbaas-oid="qqd24ci" htmlFor="cert-conditionDay" className={labelClass}>
              주간(시간)
            </label>
            <input data-mbaas-oid="lgjh5qz" id="cert-conditionDay" name="conditionDay" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="q8xlty0">
            <label data-mbaas-oid="rlsszug" htmlFor="cert-conditionNight" className={labelClass}>
              야간(시간)
            </label>
            <input data-mbaas-oid="t4yeekf" id="cert-conditionNight" name="conditionNight" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="mzytl1n">
            <label data-mbaas-oid="mojdtx0" htmlFor="cert-crossCountry" className={labelClass}>
              크로스컨트리(시간)
            </label>
            <input data-mbaas-oid="l4ep8a1" id="cert-crossCountry" name="crossCountry" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="qiavnpz">
            <label data-mbaas-oid="0lquuqg" htmlFor="cert-actualInstrument" className={labelClass}>
              실제계기(시간)
            </label>
            <input data-mbaas-oid="983v2is" id="cert-actualInstrument" name="actualInstrument" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="3kmbxul">
            <label data-mbaas-oid="zz32217" htmlFor="cert-simulatedInstrument" className={labelClass}>
              모의계기(시간)
            </label>
            <input data-mbaas-oid="55inyog" id="cert-simulatedInstrument" name="simulatedInstrument" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="gyn222u" className="border-white/[0.08]" />

      {/* 6. 접근/이착륙 누적 횟수 */}
      <fieldset data-mbaas-oid="9k4aesw">
        <legend data-mbaas-oid="tqwpgsp" className={sectionTitleClass}>6. 접근/이착륙 누적 횟수 (선택)</legend>
        <div data-mbaas-oid="daadss6" className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div data-mbaas-oid="8g3ick3">
            <label data-mbaas-oid="5y26emu" htmlFor="cert-instrumentApproaches" className={labelClass}>
              계기 접근 횟수
            </label>
            <input data-mbaas-oid="fltj798" id="cert-instrumentApproaches" name="instrumentApproaches" type="number" step="1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="0pgj7x0">
            <label data-mbaas-oid="k4uki0g" htmlFor="cert-dayLandings" className={labelClass}>
              주간 이착륙 횟수
            </label>
            <input data-mbaas-oid="m6bccjh" id="cert-dayLandings" name="dayLandings" type="number" step="1" min="0" className={numberInputClass} />
          </div>
          <div data-mbaas-oid="9x2msc1">
            <label data-mbaas-oid="u2098kn" htmlFor="cert-nightLandings" className={labelClass}>
              야간 이착륙 횟수
            </label>
            <input data-mbaas-oid="2hvyhsg" id="cert-nightLandings" name="nightLandings" type="number" step="1" min="0" className={numberInputClass} />
          </div>
        </div>
      </fieldset>

      <hr data-mbaas-oid="d5jylrh" className="border-white/[0.08]" />

      {/* 7. 총 블록타임 */}
      <fieldset data-mbaas-oid="rdlvij6">
        <legend data-mbaas-oid="3d5kupn" className={sectionTitleClass}>7. 총 블록타임</legend>
        <div data-mbaas-oid="0azjhne" className="mt-3 max-w-xs">
          <label data-mbaas-oid="jp142il" htmlFor="cert-blockTime" className={labelClass}>
            총 블록타임(시간)
          </label>
          <input
            data-mbaas-oid="yqmcna9" id="cert-blockTime"
            name="blockTime"
            type="number"
            step="0.1"
            min="0.1"
            placeholder="예: 152.3"
            className={numberInputClass}
            aria-invalid={Boolean(errors.blockTime)}
            aria-describedby={errors.blockTime ? 'cert-blockTime-error' : undefined}
          />
          {errors.blockTime && (
            <p data-mbaas-oid="f9u517i" id="cert-blockTime-error" className="mt-1.5 text-xs text-rose-600">
              {errors.blockTime}
            </p>
          )}
        </div>
      </fieldset>

      <hr data-mbaas-oid="yy3gr7b" className="border-white/[0.08]" />

      {/* 8. 증명서 사진 */}
      <fieldset data-mbaas-oid="zv4o5j5">
        <legend data-mbaas-oid="l07pu5w" className={sectionTitleClass}>8. 비행경력증명서 사진</legend>
        <p data-mbaas-oid="mifhaxb" className={sectionHintClass}>
          이 브라우저에 미리보기로 표시되며, 제출 시 기관 인증 요청 게시글의 첨부파일로 함께 업로드되어
          담당자가 확인할 수 있습니다(선택 입력).
        </p>
        <label
          data-mbaas-oid="gsh0pzp" htmlFor="cert-image"
          className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm font-medium text-ink
            hover:bg-white/[0.06] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky"
        >
          <Camera className="h-4 w-4 text-slate-400" aria-hidden="true" />
          사진 선택
        </label>
        <input data-mbaas-oid="rj7wdha" id="cert-image" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
        {imageError && (
          <p data-mbaas-oid="efbref5" role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {imageError}
          </p>
        )}
        {imageDataUrl && (
          <img
            data-mbaas-oid="aopmpa8" src={imageDataUrl}
            alt="첨부한 비행경력증명서 사진 미리보기"
            className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain"
          />
        )}
      </fieldset>

      <div data-mbaas-oid="klj11ft" className="flex items-start gap-3 rounded-control border border-sky/30 bg-sky/10 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky" aria-hidden="true" />
        <p data-mbaas-oid="e78kbgj" className="text-xs font-medium text-[#00D4FF]">
          저장하면 "인증 대기중" 상태로 표시되며, 동시에 소속 기관이 실제로 검토·승인/반려할 수 있도록 "비행경력증명서"
          게시판에 인증 요청도 함께 제출됩니다. 상세 화면에서 승인/반려 결과가 자동으로 반영됩니다. 요청 제출 자체에
          실패한 경우에만 본인이 직접 "학교/교관에게 확인받았습니다" 버튼으로 확인 처리할 수 있습니다.
        </p>
      </div>

      {submitted && syncNotice && (
        <p
          data-mbaas-oid="vq88owf" role="status"
          className={`text-sm font-medium ${syncNotice.tone === 'success' ? 'text-go' : 'text-amber-300'}`}
        >
          {syncNotice.message}
        </p>
      )}

      <div
        data-mbaas-oid="z3x9bkb"
        className="sticky bottom-0 -mx-cardpad -mb-cardpad mt-2 flex flex-wrap gap-3 border-t border-white/10 bg-navy/95 px-cardpad py-4 backdrop-blur-sm"
      >
        <Button data-mbaas-oid="u204fe2" type="submit" size="md" loading={isSubmitting} disabled={isSubmitting}>
          비행경력증명서 기록 저장하기
        </Button>
      </div>
    </form>
  )
}
