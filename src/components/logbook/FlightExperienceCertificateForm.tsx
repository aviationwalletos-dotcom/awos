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
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!file.type.startsWith('image/') && !isPdf) {
      setImageError('이미지 또는 PDF 파일만 첨부할 수 있습니다.')
      return
    }
    setImageError(null)
    setImageFile(file)
    if (isPdf) {
      // PDF는 <img> 미리보기가 불가능하므로 데이터URL을 만들지 않는다(파일명 배지로 표시).
      setImageDataUrl(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.onerror = () => setImageError('사진을 읽는 중 오류가 발생했습니다. 다시 시도해 주세요.')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // await 이후에는 리액트 이벤트의 currentTarget이 null이 될 수 있으므로 미리 잡아둔다.
    // (제출 후 무한 로딩 버그의 원인 — reset()에서 예외가 나며 로딩 해제 코드에 도달하지 못했음)
    const formEl = e.currentTarget
    const form = new FormData(formEl)
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
    try {

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

    formEl.reset()
    setImageDataUrl(null)
    setImageFile(null)
    setImageError(null)
    setSubmitted(true)
    setSyncNotice(
      certificateRequestPostId
        ? { tone: 'success', message: '관리자에게 인증 요청을 제출했습니다. "내 비행 기록" 상세 화면에서 승인/반려 여부를 확인할 수 있습니다.' }
        : {
            tone: 'warning',
            message:
              '기록은 이 브라우저에 저장되었지만, 관리자 인증 요청 제출에는 실패했습니다(네트워크 오류 등). 상세 화면에서 "학교/교관에게 확인받았습니다" 버튼으로 자기 확인할 수 있습니다.',
          },
    )
    } finally {
      // 어떤 경로로 끝나든 제출 버튼의 로딩 상태는 반드시 해제된다(무한 로딩 구조적 차단).
      setIsSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-start gap-3 rounded-control border border-white/10 bg-surface p-4">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <p className="text-xs text-slate-400">
          이 폼은 "비행 1건"이 아니라, 비행경력증명서에 적힌 <strong>누적 비행경력 총합</strong>을 항목별로 옮겨 적는
          용도입니다. 출발/도착지나 기종처럼 개별 비행에만 해당하는 값은 입력하지 않습니다. 저장하면 관리자에게 실제
          인증 요청을 제출하는 "인증 대기중" 상태의 비행기록 1건으로 등록되며, 관리자가 원본과 대조해 승인/반려하면 자동으로
          반영됩니다.
        </p>
      </div>

      {/* 1. 기준 정보 */}
      <fieldset>
        <legend className={sectionTitleClass}>1. 증명서 기준 정보</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="cert-date" className={labelClass}>
              기준일 (증명서 발급일 등)
            </label>
            <input id="cert-date"
              name="date"
              type="date"
              className={inputClass}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'cert-date-error' : undefined}
            />
            {errors.date && (
              <p id="cert-date-error" className="mt-1.5 text-xs text-rose-600">
                {errors.date}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="cert-issuer" className={labelClass}>
              발급기관명
            </label>
            <input id="cert-issuer"
              name="certificateIssuer"
              type="text"
              placeholder="예: OO비행교육원"
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 2. 항공기 범주/등급별 누적 시간 */}
      <fieldset>
        <legend className={sectionTitleClass}>2. 항공기 범주/등급별 누적 시간 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="cert-singleEngineLand" className={labelClass}>
              단발육상(시간)
            </label>
            <input id="cert-singleEngineLand" name="singleEngineLand" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-multiEngineLand" className={labelClass}>
              다발육상(시간)
            </label>
            <input id="cert-multiEngineLand" name="multiEngineLand" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-rotorcraftHelicopter" className={labelClass}>
              회전익(헬리콥터, 시간)
            </label>
            <input id="cert-rotorcraftHelicopter" name="rotorcraftHelicopter" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="cert-categoryOtherLabel" className={labelClass}>
                기타 명칭
              </label>
              <input id="cert-categoryOtherLabel" name="categoryOtherLabel" type="text" placeholder="예: 활공기" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cert-categoryOtherHours" className={labelClass}>
                기타 시간
              </label>
              <input id="cert-categoryOtherHours" name="categoryOtherHours" type="number" step="0.1" min="0" className={numberInputClass} />
            </div>
          </div>
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 3. 비행 자격 시간 종류 */}
      <fieldset>
        <legend className={sectionTitleClass}>3. 비행 자격 시간 종류별 누적 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="cert-dualReceived" className={labelClass}>
              DUAL RECEIVED(시간)
            </label>
            <input id="cert-dualReceived" name="dualReceived" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-picTime" className={labelClass}>
              PILOT-IN-COMMAND(PIC, 시간)
            </label>
            <input id="cert-picTime" name="picTime" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-sicTime" className={labelClass}>
              SECOND-IN-COMMAND(SIC, 시간)
            </label>
            <input id="cert-sicTime" name="sicTime" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-flightInstructorTime" className={labelClass}>
              AS FLIGHT INSTRUCTOR(시간)
            </label>
            <input id="cert-flightInstructorTime" name="flightInstructorTime" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 4. 지상훈련장비 */}
      <fieldset>
        <legend className={sectionTitleClass}>4. 지상훈련장비 누적 (선택)</legend>
        <div className="mt-3 max-w-xs">
          <label htmlFor="cert-groundTrainerTime" className={labelClass}>
            시뮬레이터 시간
          </label>
          <input id="cert-groundTrainerTime" name="groundTrainerTime" type="number" step="0.1" min="0" className={numberInputClass} />
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 5. 비행 조건별 누적 시간 */}
      <fieldset>
        <legend className={sectionTitleClass}>5. 비행 조건별 누적 시간 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="cert-conditionDay" className={labelClass}>
              주간(시간)
            </label>
            <input id="cert-conditionDay" name="conditionDay" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-conditionNight" className={labelClass}>
              야간(시간)
            </label>
            <input id="cert-conditionNight" name="conditionNight" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-crossCountry" className={labelClass}>
              크로스컨트리(시간)
            </label>
            <input id="cert-crossCountry" name="crossCountry" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-actualInstrument" className={labelClass}>
              실제계기(시간)
            </label>
            <input id="cert-actualInstrument" name="actualInstrument" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-simulatedInstrument" className={labelClass}>
              모의계기(시간)
            </label>
            <input id="cert-simulatedInstrument" name="simulatedInstrument" type="number" step="0.1" min="0" className={numberInputClass} />
          </div>
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 6. 접근/이착륙 누적 횟수 */}
      <fieldset>
        <legend className={sectionTitleClass}>6. 접근/이착륙 누적 횟수 (선택)</legend>
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="cert-instrumentApproaches" className={labelClass}>
              계기 접근 횟수
            </label>
            <input id="cert-instrumentApproaches" name="instrumentApproaches" type="number" step="1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-dayLandings" className={labelClass}>
              주간 이착륙 횟수
            </label>
            <input id="cert-dayLandings" name="dayLandings" type="number" step="1" min="0" className={numberInputClass} />
          </div>
          <div>
            <label htmlFor="cert-nightLandings" className={labelClass}>
              야간 이착륙 횟수
            </label>
            <input id="cert-nightLandings" name="nightLandings" type="number" step="1" min="0" className={numberInputClass} />
          </div>
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 7. 총 블록타임 */}
      <fieldset>
        <legend className={sectionTitleClass}>7. 총 블록타임</legend>
        <div className="mt-3 max-w-xs">
          <label htmlFor="cert-blockTime" className={labelClass}>
            총 블록타임(시간)
          </label>
          <input id="cert-blockTime"
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
            <p id="cert-blockTime-error" className="mt-1.5 text-xs text-rose-600">
              {errors.blockTime}
            </p>
          )}
        </div>
      </fieldset>

      <hr className="border-white/[0.08]" />

      {/* 8. 증명서 사진 */}
      <fieldset>
        <legend className={sectionTitleClass}>8. 비행경력증명서 사진</legend>
        <p className={sectionHintClass}>
          이 브라우저에 미리보기로 표시되며, 제출 시 관리자 인증 요청 게시글의 첨부파일로 함께 업로드되어
          담당자가 확인할 수 있습니다(선택 입력).
        </p>
        <label htmlFor="cert-image"
          className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm font-medium text-ink
            hover:bg-white/[0.06] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky"
        >
          <Camera className="h-4 w-4 text-slate-400" aria-hidden="true" />
          사진 선택
        </label>
        <input id="cert-image" type="file" accept="image/*,application/pdf,.pdf" onChange={handleImageChange} className="sr-only" />
        {imageError && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {imageError}
          </p>
        )}
        {imageFile && !imageDataUrl && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-control border border-white/15 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
            📄 {imageFile.name} <span className="text-xs text-slate-500">(PDF 첨부됨)</span>
          </p>
        )}
        {imageDataUrl && (
          <img src={imageDataUrl}
            alt="첨부한 비행경력증명서 사진 미리보기"
            className="mt-3 max-h-64 w-full max-w-sm rounded-control border border-white/10 object-contain"
          />
        )}
      </fieldset>

      <div className="flex items-start gap-3 rounded-control border border-sky/30 bg-sky/10 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky" aria-hidden="true" />
        <p className="text-xs font-medium text-[#00D4FF]">
          저장하면 "인증 대기중" 상태로 표시되며, 동시에 소속 기관이 실제로 검토·승인/반려할 수 있도록 "비행경력증명서"
          게시판에 인증 요청도 함께 제출됩니다. 상세 화면에서 승인/반려 결과가 자동으로 반영됩니다. 요청 제출 자체에
          실패한 경우에만 본인이 직접 "학교/교관에게 확인받았습니다" 버튼으로 확인 처리할 수 있습니다.
        </p>
      </div>

      {submitted && syncNotice && (
        <p role="status"
          className={`text-sm font-medium ${syncNotice.tone === 'success' ? 'text-go' : 'text-amber-300'}`}
        >
          {syncNotice.message}
        </p>
      )}

      <div
        className="sticky bottom-0 -mx-cardpad -mb-cardpad mt-2 flex flex-wrap gap-3 border-t border-white/10 bg-navy/95 px-cardpad py-4 backdrop-blur-sm"
      >
        <Button type="submit" size="md" loading={isSubmitting} disabled={isSubmitting}>
          비행경력증명서 기록 저장하기
        </Button>
      </div>
    </form>
  )
}
