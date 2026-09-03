import React, { useMemo, useRef, useState } from 'react'

import { Button } from '../Button'
import { CERTIFICATE_CATEGORIES_BY_TRACK } from '../../types/certificate'
import type { Certificate, CertificateCategory, CertificateInput } from '../../types/certificate'
import {
  DRIVER_LICENCE_TYPES,
  EPTA_LEVELS,
  FLIGHT_INSTRUCTOR_TYPES,
  INSTRUMENT_RATING_TYPES,
  LICENCE_TYPES,
  LSA_INSTRUCTOR_TYPES,
  LSA_LICENCE_TYPES,
  MEDICAL_CERTIFICATE_TYPES,
  RATING_TYPES,
  ULTRALIGHT_CERT_TYPES,
  ULTRALIGHT_EDUCATION_TYPES,
  ULTRALIGHT_INSTRUCTOR_TYPES,
  buildRatingName,
  computeEptaExpiryDate,
  computeMedicalExpiryDate,
  getExpiryRequirement,
  medicalValidityMonths,
} from '../../data/certificateOptions'
import type { CertificateSubType } from '../../data/certificateOptions'
import type { RoleContent } from '../../data/content'
import { PILOT_TRACK_LABEL } from '../../lib/tracks'
import type { PilotTrack } from '../../lib/tracks'

interface FieldErrors {
  name?: string
  issuer?: string
  issuedDate?: string
  expiryDate?: string
  approvalFile?: string
}

interface CertificateFormProps {
  mode: 'create' | 'edit'
  initialValues?: Certificate
  onSubmit: (input: CertificateInput, options?: { approvalFile?: File }) => void
  onCancel?: () => void
  /** 로그인한 사용자의 역할에 해당하는 자격 템플릿(빠른 추가 칩)과 강조 색상 */
  roleTemplate?: RoleContent
  /** v1.1 — 어느 트랙의 자격을 등록하는지. 구분(카테고리) 선택지가 이 값으로 정해진다. */
  track?: PilotTrack
  /** v1.1 — 항공신체검사 유효기간이 연령으로 갈리므로(별표 8) 생년월일이 있으면 정확히 계산한다. */
  birthDate?: string | null
  /** v1.1 — 1종 6개월 예외(여객 1인조종 등) 판정용 */
  commercialSinglePilot?: boolean
}

const inputClass =
  'w-full rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

/**
 * v1.1 — 구분(카테고리)별 세부 종류 선택지. 여기 없는 구분은 자유 입력.
 * 새 자격을 추가할 때는 이 표와 data/deckDefs.ts 두 곳만 손대면 된다.
 */
const SUBTYPES_BY_CATEGORY: Partial<Record<CertificateCategory, CertificateSubType[]>> = {
  '조종사 자격증명': LICENCE_TYPES,
  '한정': RATING_TYPES,
  '계기비행증명': INSTRUMENT_RATING_TYPES,
  '조종교육증명': FLIGHT_INSTRUCTOR_TYPES,
  '항공신체검사': MEDICAL_CERTIFICATE_TYPES,
  '항공영어구술능력증명': EPTA_LEVELS,
  '경량항공기 조종사 자격증명': LSA_LICENCE_TYPES,
  '경량항공기 조종교육증명': LSA_INSTRUCTOR_TYPES,
  '초경량비행장치 조종자증명': ULTRALIGHT_CERT_TYPES,
  '지도조종자': ULTRALIGHT_INSTRUCTOR_TYPES,
  '교육이수': ULTRALIGHT_EDUCATION_TYPES,
  '운전면허': DRIVER_LICENCE_TYPES,
}

/** 세부 종류 + 보조 텍스트로 자격 명칭을 만든다(한정은 기존 buildRatingName 규칙 유지) */
function buildName(category: CertificateCategory, sub: CertificateSubType | undefined, detail: string): string {
  if (!sub) return ''
  if (category === '한정') return buildRatingName(sub, detail)
  if (sub.requiresDetail && detail.trim()) return `${sub.label} (${detail.trim()})`
  return sub.label
}

export function CertificateForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  roleTemplate,
  track = 'aircraft',
  birthDate,
  commercialSinglePilot,
}: CertificateFormProps) {
  const categories = CERTIFICATE_CATEGORIES_BY_TRACK[track]
  const [errors, setErrors] = useState<FieldErrors>({})
  const [nameValue, setNameValue] = useState(initialValues?.name ?? '')
  const [category, setCategory] = useState<CertificateCategory>(
    initialValues?.category && categories.includes(initialValues.category) ? initialValues.category : categories[0],
  )
  const subTypes = useMemo(() => SUBTYPES_BY_CATEGORY[category] ?? [], [category])
  const [subKey, setSubKey] = useState<string>(SUBTYPES_BY_CATEGORY[categories[0]]?.[0]?.key ?? '')
  const [subDetail, setSubDetail] = useState('')
  const [approvalFile, setApprovalFile] = useState<File | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const currentSub = subTypes.find((t) => t.key === subKey) ?? subTypes[0]
  const isFreeText = subTypes.length === 0

  /** 항공신체검사·EPTA: 발급일·종별이 바뀌면 만료일을 자동 계산해 채운다(수정 가능). */
  function autofillExpiry(nextIssued?: string, nextKey?: string) {
    const formEl = formRef.current
    if (!formEl) return
    const issuedEl = formEl.elements.namedItem('issuedDate') as HTMLInputElement | null
    const expiryEl = formEl.elements.namedItem('expiryDate') as HTMLInputElement | null
    const issued = nextIssued ?? issuedEl?.value ?? ''
    const key = nextKey ?? subKey
    let expiry: string | null = null
    if (category === '항공신체검사') expiry = computeMedicalExpiryDate(issued, key, { birthDate, commercialSinglePilot })
    else if (category === '항공영어구술능력증명') expiry = computeEptaExpiryDate(issued, key)
    else return
    if (expiryEl) expiryEl.value = expiry ?? ''
  }

  const expiryRequirement = getExpiryRequirement(category)
  const showExpiryField = expiryRequirement !== 'hidden'

  const medicalNote = useMemo(() => {
    if (category !== '항공신체검사') return null
    const issuedEl = formRef.current?.elements.namedItem('issuedDate') as HTMLInputElement | null
    const issued = issuedEl?.value || new Date().toISOString().slice(0, 10)
    const { months, assumedAge } = medicalValidityMonths({ medicalKey: subKey, issuedDate: issued, birthDate, commercialSinglePilot })
    return { months, assumedAge }
  }, [category, subKey, birthDate, commercialSinglePilot])

  function handleCategoryChange(next: CertificateCategory) {
    setCategory(next)
    const first = SUBTYPES_BY_CATEGORY[next]?.[0]
    setSubKey(first?.key ?? '')
    setSubDetail('')
    setApprovalFile(null)
    setNameValue(first ? buildName(next, first, '') : '')
  }

  function handleSubChange(key: string) {
    setSubKey(key)
    const sub = subTypes.find((t) => t.key === key)
    setNameValue(buildName(category, sub, subDetail))
    if (category === '항공신체검사' || category === '항공영어구술능력증명') autofillExpiry(undefined, key)
  }

  function handleDetailChange(value: string) {
    setSubDetail(value)
    setNameValue(buildName(category, currentSub, value))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nextErrors: FieldErrors = {}

    const name = nameValue.trim()
    const issuer = String(form.get('issuer') || '').trim()
    const issuedDate = String(form.get('issuedDate') || '').trim()
    const expiryDateRaw = String(form.get('expiryDate') || '').trim()
    const expiryDate = showExpiryField && expiryDateRaw ? expiryDateRaw : undefined

    if (!name) nextErrors.name = '자격/면허 명칭을 입력해 주세요.'
    if (!issuer) nextErrors.issuer = '발급기관을 입력해 주세요.'
    if (!issuedDate) nextErrors.issuedDate = '발급일을 입력해 주세요.'
    if (expiryRequirement === 'required' && !expiryDateRaw) nextErrors.expiryDate = '만료일을 입력해 주세요.'
    if (mode === 'create' && !approvalFile) nextErrors.approvalFile = '자격증 사진(이미지 또는 PDF)을 첨부해 주세요.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    onSubmit(
      {
        name,
        category,
        track: initialValues?.track ?? track,
        issuer,
        issuedDate,
        expiryDate,
        notes: String(form.get('notes') || '').trim() || undefined,
      },
      { approvalFile: approvalFile ?? undefined },
    )

    if (mode === 'create') {
      e.currentTarget.reset()
      setNameValue('')
      handleCategoryChange(categories[0])
    }
  }

  return (
    <form data-mbaas-oid="bqneq6d" ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5">
      {roleTemplate && roleTemplate.credentials.length > 0 && (
        <div data-mbaas-oid="vt7bbs2" className={`rounded-control border p-4 ${roleTemplate.borderClass} ${roleTemplate.bgClass}`}>
          <p data-mbaas-oid="zi57mny" className={`text-xs font-semibold ${roleTemplate.colorClass}`}>
            {roleTemplate.name} 추천 자격 빠른 추가
          </p>
          <p data-mbaas-oid="6c6tnlb" className="mt-1 text-xs text-slate-400">클릭하면 아래 명칭 입력란에 채워집니다. 직접 입력도 가능합니다.</p>
          <div data-mbaas-oid="1gp3qm6" className="mt-2.5 flex flex-wrap gap-2">
            {roleTemplate.credentials.map((c) => (
              <button
                data-mbaas-oid="tbmqc2l" key={c.label}
                type="button"
                onClick={() => setNameValue(c.label)}
                className={`inline-flex min-h-[36px] items-center rounded-control border bg-panel px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98]
                  ${roleTemplate.borderClass} ${roleTemplate.colorClass} ${roleTemplate.hoverBgClass}
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div data-mbaas-oid="80lnxep" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div data-mbaas-oid="mssw6s8">
          <label data-mbaas-oid="sr99yaw" htmlFor="category" className={labelClass}>
            구분
          </label>
          <select
            data-mbaas-oid="aedln6o" id="category"
            name="category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value as CertificateCategory)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option data-mbaas-oid="xm36egu" key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p data-mbaas-oid="trkhint" className="mt-1.5 text-[11px] text-slate-500">{PILOT_TRACK_LABEL[track]} 자격으로 등록됩니다.</p>
        </div>

        {subTypes.length > 0 && (
          <div data-mbaas-oid="tkpsfji">
            <label data-mbaas-oid="dumjtel" htmlFor="sub-type" className={labelClass}>
              세부 종류
            </label>
            <select
              data-mbaas-oid="5evy6af" id="sub-type"
              value={subKey}
              onChange={(e) => handleSubChange(e.target.value)}
              className={inputClass}
            >
              {subTypes.map((t) => (
                <option data-mbaas-oid="7s40zvb" key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {category === '무선통신사' && (
          <p data-mbaas-oid="commntc" className="rounded-control border border-orange-400/30 bg-orange-400/10 px-4 py-2.5 text-xs leading-relaxed text-orange-200 sm:col-span-2">
            무선통신사는 <span data-mbaas-oid="commntc2" className="font-semibold">5년마다 통신보안 의무교육</span> 대상이에요(전파법 제30조·규칙 제7조). 무선국 종사자에 한하며, 발급 5년이 지나면
            교육 이수증을 첨부해 관리자 인증을 받아야 커런시가 유효 처리됩니다.
          </p>
        )}
      </div>

      {currentSub?.requiresDetail && (
        <div data-mbaas-oid="gkbgsj8">
          <label data-mbaas-oid="rb5s77p" htmlFor="rating-detail" className={labelClass}>
            {category === '한정' ? '기종명' : '세부 표기'}
          </label>
          <input
            data-mbaas-oid="frpv77y" id="rating-detail"
            type="text"
            value={subDetail}
            onChange={(e) => handleDetailChange(e.target.value)}
            placeholder={currentSub.detailPlaceholder}
            className={inputClass}
          />
        </div>
      )}

      <div data-mbaas-oid="uls9jyx">
        <label data-mbaas-oid="6f3kux3" htmlFor="name" className={labelClass}>
          자격/면허 명칭
        </label>
        {isFreeText ? (
          <>
            <input
              data-mbaas-oid="q0shiuh" id="name"
              name="name"
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="예: 사업용 조종사(CPL)"
              className={inputClass}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'cert-name-error' : undefined}
            />
            <p data-mbaas-oid="ar45ett" className="mt-1.5 text-xs text-slate-400">위 구분/세부 종류를 선택하면 자동으로 채워지며, 필요하면 직접 수정할 수 있습니다.</p>
          </>
        ) : (
          <>
            <p data-mbaas-oid="q0shiuh" className="rounded-control border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-400">
              {nameValue}
            </p>
            <p data-mbaas-oid="ar45ett" className="mt-1.5 text-xs text-slate-400">위 구분/세부 종류 선택에 따라 자동으로 결정되며, 정확한 인식을 위해 직접 수정할 수 없습니다.</p>
          </>
        )}
        {errors.name && (
          <p data-mbaas-oid="nwe9swx" id="cert-name-error" className="mt-1.5 text-xs text-rose-600">
            {errors.name}
          </p>
        )}
      </div>

      <div data-mbaas-oid="nqb9cou">
        <label data-mbaas-oid="5ekeo7m" htmlFor="issuer" className={labelClass}>
          발급기관
        </label>
        <input
          data-mbaas-oid="hn4kd4n" id="issuer"
          name="issuer"
          type="text"
          defaultValue={initialValues?.issuer}
          placeholder="예: 국토교통부, 항공안전기술원"
          className={inputClass}
          aria-invalid={Boolean(errors.issuer)}
          aria-describedby={errors.issuer ? 'issuer-error' : undefined}
        />
        {errors.issuer && (
          <p data-mbaas-oid="zsvx3v8" id="issuer-error" className="mt-1.5 text-xs text-rose-600">
            {errors.issuer}
          </p>
        )}
      </div>

      <div data-mbaas-oid="rsjqdii" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div data-mbaas-oid="6l5uvpj">
          <label data-mbaas-oid="ou60l4c" htmlFor="issuedDate" className={labelClass}>
            발급일
          </label>
          <input
            data-mbaas-oid="66xlepx" id="issuedDate"
            name="issuedDate"
            type="date"
            defaultValue={initialValues?.issuedDate}
            className={inputClass}
            aria-invalid={Boolean(errors.issuedDate)}
            aria-describedby={errors.issuedDate ? 'issuedDate-error' : undefined}
          
              onChange={(e) => autofillExpiry(e.target.value)}
            />
          {errors.issuedDate && (
            <p data-mbaas-oid="nuy6rc8" id="issuedDate-error" className="mt-1.5 text-xs text-rose-600">
              {errors.issuedDate}
            </p>
          )}
        </div>

        {showExpiryField ? (
          <div data-mbaas-oid="r62epkp">
            <label data-mbaas-oid="j0cwgi7" htmlFor="expiryDate" className={labelClass}>
              만료일{expiryRequirement === 'optional' ? ' (선택)' : ''}
            </label>
            <input
              data-mbaas-oid="nrqw1n0" id="expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={initialValues?.expiryDate}
              className={inputClass}
              aria-invalid={Boolean(errors.expiryDate)}
              aria-describedby={errors.expiryDate ? 'expiryDate-error' : undefined}
            />
            {category === '항공신체검사' && medicalNote && (
              <p data-mbaas-oid="medauto1" className="mt-1.5 text-xs text-slate-400">
                발급일을 넣으면 <span data-mbaas-oid="medauto2" className="font-semibold text-slate-300">별표 8 기준 {medicalNote.months}개월</span>, 월말 만료 원칙으로 자동 계산돼요(수정 가능).
                {medicalNote.assumedAge && (
                  <span data-mbaas-oid="medauto3" className="text-amber-300"> 생년월일이 없어 가장 짧은 기간으로 잡았어요. 계정정보에 생년월일을 넣으면 정확해집니다.</span>
                )}
              </p>
            )}
            {category === '항공영어구술능력증명' && (
              <p data-mbaas-oid="eptaauto1" className="mt-1.5 text-xs text-slate-400">
                4등급 3년 · 5등급 6년 · 6등급 영구(규칙 제99조③). 6등급은 만료일을 비워 두세요.
              </p>
            )}
            {errors.expiryDate && (
              <p data-mbaas-oid="9ll421d" id="expiryDate-error" className="mt-1.5 text-xs text-rose-600">
                {errors.expiryDate}
              </p>
            )}
            {category === '항공신체검사' && (
              <p data-mbaas-oid="w0ombtm" className="mt-1.5 text-xs text-slate-400">
                월말 만료 원칙: 계산된 만료일이 그 달의 말일이 아니면 그 달 말일까지 유효합니다.
              </p>
            )}
          </div>
        ) : (
          <div data-mbaas-oid="opahh8c">
            <span data-mbaas-oid="af0b0s7" className={labelClass}>만료일</span>
            <p data-mbaas-oid="q4jbu0j" className="rounded-control border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-400">
              이 자격은 만료 개념이 없습니다.
            </p>
          </div>
        )}
      </div>

      <div data-mbaas-oid="id8isqe">
        <label data-mbaas-oid="ctzumuc" htmlFor="cert-notes" className={labelClass}>
          메모 (선택)
        </label>
        <textarea
          data-mbaas-oid="gorpfwu" id="cert-notes"
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes}
          placeholder="갱신 절차나 준비 서류 등을 남겨 주세요."
          className={inputClass}
        />
      </div>

        <div data-mbaas-oid="crtfile0">
          <span data-mbaas-oid="crtfile1" className={labelClass}>자격증 사진 (이미지 또는 PDF)</span>
          <input
            data-mbaas-oid="crtfile2" type="file"
            accept="image/*,application/pdf,.pdf"
            onChange={(e) => setApprovalFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-xs text-slate-400 file:mr-3 file:rounded-control file:border file:border-sky/40 file:bg-sky/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky"
          />
          <p data-mbaas-oid="crtfile3" className="mt-1.5 text-xs text-slate-400">
            {mode === 'create'
              ? '등록과 동시에 관리자에게 인증 요청이 전송되고, 승인되면 목록에 "인증됨"으로 표시돼요.'
              : '수정 시에는 첨부하지 않아도 됩니다. 재인증은 상세 화면에서 요청하세요.'}
          </p>
          {errors.approvalFile && (
            <p data-mbaas-oid="crtfile4" className="mt-1.5 text-xs text-rose-600">{errors.approvalFile}</p>
          )}
        </div>

      <div data-mbaas-oid="jn9x7gq" className="flex flex-wrap gap-3">
        <Button data-mbaas-oid="zq3xs96" type="submit" size="md">
          {mode === 'create' ? '자격증 등록하기' : '수정 내용 저장하기'}
        </Button>
        {onCancel && (
          <Button data-mbaas-oid="6hffssj" type="button" variant="outline" tone="neutral" size="md" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
}
