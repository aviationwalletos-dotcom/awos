import React, { useState } from 'react'

import { Button } from '../Button'
import { CERTIFICATE_CATEGORIES } from '../../types/certificate'
import type { Certificate, CertificateCategory, CertificateInput } from '../../types/certificate'
import {
  FLIGHT_INSTRUCTOR_CERTIFICATE_LABEL,
  LICENCE_TYPES,
  MEDICAL_CERTIFICATE_TYPES,
  RATING_TYPES,
  buildRatingName,
  getExpiryRequirement,
} from '../../data/certificateOptions'
import type { RoleContent } from '../../data/content'

interface FieldErrors {
  name?: string
  issuer?: string
  issuedDate?: string
  expiryDate?: string
}

interface CertificateFormProps {
  mode: 'create' | 'edit'
  initialValues?: Certificate
  onSubmit: (input: CertificateInput) => void
  onCancel?: () => void
  /** 로그인한 사용자의 역할에 해당하는 자격 템플릿(빠른 추가 칩)과 강조 색상 */
  roleTemplate?: RoleContent
}

const inputClass =
  'w-full rounded-control border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

function findRatingType(key: string) {
  return RATING_TYPES.find((r) => r.key === key) ?? RATING_TYPES[0]
}

export function CertificateForm({ mode, initialValues, onSubmit, onCancel, roleTemplate }: CertificateFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [nameValue, setNameValue] = useState(initialValues?.name ?? '')
  const [category, setCategory] = useState<CertificateCategory>(initialValues?.category ?? CERTIFICATE_CATEGORIES[0])
  const [licenceKey, setLicenceKey] = useState(LICENCE_TYPES[0].key)
  const [ratingKey, setRatingKey] = useState(RATING_TYPES[0].key)
  const [ratingDetail, setRatingDetail] = useState('')
  const [medicalKey, setMedicalKey] = useState(MEDICAL_CERTIFICATE_TYPES[0].key)

  const expiryRequirement = getExpiryRequirement(category)
  const showExpiryField = expiryRequirement !== 'hidden'

  function handleCategoryChange(next: CertificateCategory) {
    setCategory(next)
    if (next === '조종사 자격증명') {
      setLicenceKey(LICENCE_TYPES[0].key)
      setNameValue(LICENCE_TYPES[0].label)
    } else if (next === '한정') {
      setRatingKey(RATING_TYPES[0].key)
      setRatingDetail('')
      setNameValue(buildRatingName(RATING_TYPES[0], ''))
    } else if (next === '조종교육증명') {
      setNameValue(FLIGHT_INSTRUCTOR_CERTIFICATE_LABEL)
    } else if (next === '항공신체검사') {
      setMedicalKey(MEDICAL_CERTIFICATE_TYPES[0].key)
      setNameValue(MEDICAL_CERTIFICATE_TYPES[0].label)
    }
  }

  function handleLicenceChange(key: string) {
    setLicenceKey(key)
    const sub = LICENCE_TYPES.find((l) => l.key === key) ?? LICENCE_TYPES[0]
    setNameValue(sub.label)
  }

  function handleRatingChange(key: string) {
    setRatingKey(key)
    const sub = findRatingType(key)
    setNameValue(buildRatingName(sub, ratingDetail))
  }

  function handleRatingDetailChange(value: string) {
    setRatingDetail(value)
    const sub = findRatingType(ratingKey)
    setNameValue(buildRatingName(sub, value))
  }

  function handleMedicalChange(key: string) {
    setMedicalKey(key)
    const sub = MEDICAL_CERTIFICATE_TYPES.find((m) => m.key === key) ?? MEDICAL_CERTIFICATE_TYPES[0]
    setNameValue(sub.label)
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

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    onSubmit({
      name,
      category,
      issuer,
      issuedDate,
      expiryDate,
      notes: String(form.get('notes') || '').trim() || undefined,
    })

    if (mode === 'create') {
      e.currentTarget.reset()
      setNameValue('')
      setCategory(CERTIFICATE_CATEGORIES[0])
      setLicenceKey(LICENCE_TYPES[0].key)
      setRatingKey(RATING_TYPES[0].key)
      setRatingDetail('')
      setMedicalKey(MEDICAL_CERTIFICATE_TYPES[0].key)
    }
  }

  return (
    <form data-mbaas-oid="bqneq6d" noValidate onSubmit={handleSubmit} className="space-y-5">
      {roleTemplate && roleTemplate.credentials.length > 0 && (
        <div data-mbaas-oid="vt7bbs2" className={`rounded-control border p-4 ${roleTemplate.borderClass} ${roleTemplate.bgClass}`}>
          <p data-mbaas-oid="zi57mny" className={`text-xs font-semibold ${roleTemplate.colorClass}`}>
            {roleTemplate.name} 추천 자격 빠른 추가
          </p>
          <p data-mbaas-oid="6c6tnlb" className="mt-1 text-xs text-slate-500">클릭하면 아래 명칭 입력란에 채워집니다. 직접 입력도 가능합니다.</p>
          <div data-mbaas-oid="1gp3qm6" className="mt-2.5 flex flex-wrap gap-2">
            {roleTemplate.credentials.map((c) => (
              <button
                data-mbaas-oid="tbmqc2l" key={c.label}
                type="button"
                onClick={() => setNameValue(c.label)}
                className={`inline-flex min-h-[36px] items-center rounded-control border bg-white px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98]
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
            {CERTIFICATE_CATEGORIES.map((c) => (
              <option data-mbaas-oid="xm36egu" key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {category === '조종사 자격증명' && (
          <div data-mbaas-oid="tkpsfji">
            <label data-mbaas-oid="dumjtel" htmlFor="licence-type" className={labelClass}>
              세부 종류
            </label>
            <select
 data-mbaas-oid="5evy6af" id="licence-type"
              value={licenceKey}
              onChange={(e) => handleLicenceChange(e.target.value)}
              className={inputClass}
            >
              {LICENCE_TYPES.map((l) => (
                <option data-mbaas-oid="7s40zvb" key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {category === '한정' && (
          <div data-mbaas-oid="njr7d5z">
            <label data-mbaas-oid="ag0te6e" htmlFor="rating-type" className={labelClass}>
              세부 종류
            </label>
            <select
 data-mbaas-oid="xcvjeg4" id="rating-type"
              value={ratingKey}
              onChange={(e) => handleRatingChange(e.target.value)}
              className={inputClass}
            >
              {RATING_TYPES.map((r) => (
                <option data-mbaas-oid="7o0ks7l" key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {category === '조종교육증명' && (
          <div data-mbaas-oid="6g4qv1x">
            <span data-mbaas-oid="9hluw75" className={labelClass}>세부 종류</span>
            <p data-mbaas-oid="1t8d1tp" className="rounded-control border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              {FLIGHT_INSTRUCTOR_CERTIFICATE_LABEL} (세부 선택 없음)
            </p>
          </div>
        )}

        {category === '항공신체검사' && (
          <div data-mbaas-oid="7gu05tf">
            <label data-mbaas-oid="8uy4kpa" htmlFor="medical-type" className={labelClass}>
              세부 종류
            </label>
            <select
 data-mbaas-oid="siuo4zq" id="medical-type"
              value={medicalKey}
              onChange={(e) => handleMedicalChange(e.target.value)}
              className={inputClass}
            >
              {MEDICAL_CERTIFICATE_TYPES.map((m) => (
                <option data-mbaas-oid="qt9hka1" key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {category === '한정' && findRatingType(ratingKey).requiresDetail && (
        <div data-mbaas-oid="gkbgsj8">
          <label data-mbaas-oid="rb5s77p" htmlFor="rating-detail" className={labelClass}>
            기종명
          </label>
          <input
 data-mbaas-oid="frpv77y" id="rating-detail"
            type="text"
            value={ratingDetail}
            onChange={(e) => handleRatingDetailChange(e.target.value)}
            placeholder={findRatingType(ratingKey).detailPlaceholder}
            className={inputClass}
          />
        </div>
      )}

      <div data-mbaas-oid="uls9jyx">
        <label data-mbaas-oid="6f3kux3" htmlFor="name" className={labelClass}>
          자격/면허 명칭
        </label>
        {category === '법정교육' || category === '기타 자격' ? (
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
            <p data-mbaas-oid="q0shiuh" className="rounded-control border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
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
            <p data-mbaas-oid="q4jbu0j" className="rounded-control border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
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
