import React, { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '../Button'
import { scrollToFirstError } from '../../lib/ui/scrollToFirstError'
import { CERTIFICATE_CATEGORIES_BY_TRACK } from '../../types/certificate'
import type { Certificate, CertificateCategory, CertificateInput } from '../../types/certificate'
import {
  DRIVER_LICENCE_TYPES,
  ENDORSEMENT_TYPES,
  EPTA_LEVELS,
  FLIGHT_INSTRUCTOR_TYPES,
  INSTRUMENT_RATING_TYPES,
  LICENCE_TYPES,
  LSA_INSTRUCTOR_TYPES,
  LSA_LICENCE_TYPES,
  MEDICAL_CERTIFICATE_TYPES,
  TRAINING_PERMIT_TYPES,
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
import { localToday } from '../../lib/ui/localDate'
import { InfoTip } from '../InfoTip'

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
  /** "한정 추가" 시 어느 자격증명에 붙일지 고르기 위한 보유 자격 목록 */
  existingCertificates?: Certificate[]
}

const inputClass =
  'w-full rounded-control border border-white/10 bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

const labelClass = 'mb-1.5 block text-sm font-medium text-ink'

/**
 * v1.1 — 구분(카테고리)별 세부 종류 선택지. 여기 없는 구분은 자유 입력.
 * 새 자격을 추가할 때는 이 표와 data/deckDefs.ts 두 곳만 손대면 된다.
 */
const SUBTYPES_BY_CATEGORY: Partial<Record<CertificateCategory, CertificateSubType[]>> = {
  '교관 확인': ENDORSEMENT_TYPES,
  '조종연습허가서': TRAINING_PERMIT_TYPES,
  '조종사 자격증명': LICENCE_TYPES,
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

/**
 * v1.1 — 구분별 기본 발급기관. 조종사·경량·초경량 자격증명과 EPTA는 한국교통안전공단(TS)이 발급한다.
 * 항공신체검사는 항공전문의(병원)마다 달라 비워 두고, 무선통신사는 한국방송통신전파진흥원.
 */
const DEFAULT_ISSUER_BY_CATEGORY: Partial<Record<CertificateCategory, string>> = {
  '조종사 자격증명': '한국교통안전공단',
  '한정': '한국교통안전공단',
  '계기비행증명': '한국교통안전공단',
  '조종교육증명': '한국교통안전공단',
  '항공영어구술능력증명': '한국교통안전공단',
  '경량항공기 조종사 자격증명': '한국교통안전공단',
  '경량항공기 조종교육증명': '한국교통안전공단',
  '초경량비행장치 조종자증명': '한국교통안전공단',
  '지도조종자': '한국교통안전공단',
  '무선통신사': '한국방송통신전파진흥원',
  '운전면허': '경찰청(도로교통공단)',
  '조종연습허가서': '지방항공청',
  // '교관 확인' 은 발급기관 대신 확인 교관 이름을 적는다
}

const LICENCE_RANK: Record<string, number> = { ATPL: 4, CPL: 3, MPL: 2, PPL: 1 }
function licenceCode(c: Certificate): string {
  const n = c.name
  if (n.includes('운송용')) return 'ATPL'
  if (n.includes('사업용')) return 'CPL'
  if (n.includes('부조종사')) return 'MPL'
  if (n.includes('자가용')) return 'PPL'
  return ''
}

const CLASS_RATING_LABEL: Record<'SEL' | 'MEL' | 'SES' | 'MES', string> = {
  SEL: '육상단발',
  MEL: '육상다발',
  SES: '수상단발',
  MES: '수상다발',
}

/** 드롭다운에서만 다르게 보여줄 구분 이름. 저장되는 category 값은 그대로다. */
const CATEGORY_OPTION_LABEL: Partial<Record<CertificateCategory, string>> = {
  '한정': '한정 추가 (기존 자격증명에 등급·형식 추가)',
}

/**
 * 저장된 명칭에서 세부 종류(key)와 보조 표기(detail)를 복원한다. 명칭은 buildName()으로 만들어지므로
 * "세부 종류 라벨"로 시작하고, 형식 등 보조 표기는 "(…)" 안에 있다. 가장 긴 라벨이 우선.
 */
function inferSubTypeFromName(category: CertificateCategory | undefined, name: string | undefined): { key: string | null; detail: string } {
  if (!category || !name) return { key: null, detail: '' }
  const list = SUBTYPES_BY_CATEGORY[category] ?? []
  const head = name.split(' · ')[0].trim()
  const sorted = [...list].sort((a, b) => b.label.length - a.label.length)
  const hit = sorted.find((t) => head.startsWith(t.label) || head.startsWith(t.label.replace(/\s*\(.*\)$/, '')))
  if (!hit) return { key: null, detail: '' }
  const detail = hit.requiresDetail ? (/\(([^)]+)\)\s*$/.exec(head)?.[1] ?? '') : ''
  return { key: hit.key, detail }
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
  roleTemplate: _roleTemplate,
  track = 'aircraft',
  birthDate,
  commercialSinglePilot,
  existingCertificates = [],
}: CertificateFormProps) {
  const categories = CERTIFICATE_CATEGORIES_BY_TRACK[track]
  const [errors, setErrors] = useState<FieldErrors>({})
  const [nameValue, setNameValue] = useState(initialValues?.name ?? '')
  // 사용자가 명칭을 직접 고치기 전까지는 세부 종류에서 자동으로 채운다(모바일 select는 onChange 타이밍이 달라 effect로 처리).
  // 편집 모드: 저장된 명칭에서 세부 종류를 복원할 수 있으면 자동 연동을 켠다(세부 종류를 바꾸면 명칭도 따라감).
  // 복원이 안 되는 이름(옛 형식·자유 입력)은 그대로 둔다.
  const [nameTouched, setNameTouched] = useState(() =>
    Boolean(initialValues) && !inferSubTypeFromName(initialValues?.category, initialValues?.name).key,
  )
  const [issuerValue, setIssuerValue] = useState(initialValues?.issuer ?? '')
  const [issuerTouched, setIssuerTouched] = useState(Boolean(initialValues))
  const [category, setCategory] = useState<CertificateCategory>(
    initialValues?.category && categories.includes(initialValues.category) ? initialValues.category : categories[0],
  )
  const subTypes = useMemo(() => SUBTYPES_BY_CATEGORY[category] ?? [], [category])
  // [BUGFIX] 편집 모드에서 세부 종류가 항상 첫 항목(자가용)으로 열리던 문제 — 저장된 명칭에서 세부 종류·보조 표기를 복원한다.
  const inferred = useMemo(() => inferSubTypeFromName(initialValues?.category, initialValues?.name), [initialValues?.category, initialValues?.name])
  const [subKey, setSubKey] = useState<string>(inferred.key ?? SUBTYPES_BY_CATEGORY[initialValues?.category ?? categories[0]]?.[0]?.key ?? '')
  const [subDetail, setSubDetail] = useState(inferred.detail)
  // v1.1 — 조종사 자격증명은 종류·등급 한정과 함께 발급된다(제37조). 자격증명 등록 시 같이 받는다.
  const [aircraftCategory, setAircraftCategory] = useState<'AIRPLANE' | 'HELICOPTER' | ''>(initialValues?.aircraftCategory ?? 'AIRPLANE')
  const [classRating, setClassRating] = useState<'SEL' | 'MEL' | 'SES' | 'MES' | ''>(initialValues?.classRating ?? 'SEL')
  const isLicenceCategory = category === '조종사 자격증명'
  const isRatingCategory = category === '한정'
  // 한정 추가: 자격증명 · 종류 · 등급 · 형식(선택)을 한 번에
  const licenceOptions = useMemo(
    () => existingCertificates.filter((c) => c.category === '조종사 자격증명').slice().sort((a, b) => (LICENCE_RANK[licenceCode(b)] ?? 0) - (LICENCE_RANK[licenceCode(a)] ?? 0)),
    [existingCertificates],
  )
  const [linkedId, setLinkedId] = useState<string>(initialValues?.linkedCertificateId ?? '')
  const [typeRating, setTypeRating] = useState<string>(initialValues?.typeRating ?? '')
  useEffect(() => {
    if (isRatingCategory && !linkedId && licenceOptions[0]) setLinkedId(licenceOptions[0].id)
  }, [isRatingCategory, linkedId, licenceOptions])
  const linkedLicence = licenceOptions.find((c) => c.id === linkedId)
  // 자격번호가 있는 구분(실물 증서의 III. SERIAL NO.)
  const hasLicenceNumber =
    category === '조종사 자격증명' || category === '경량항공기 조종사 자격증명' || category === '초경량비행장치 조종자증명' || category === '지도조종자'
  const [approvalFile, setApprovalFile] = useState<File | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const currentSub = subTypes.find((t) => t.key === subKey) ?? subTypes[0]
  const isFreeText = subTypes.length === 0 && category !== '한정'

  // 5) 세부 종류·보조 표기가 바뀌면 명칭 자동 연동
  useEffect(() => {
    if (nameTouched || isFreeText) return
    let n = buildName(category, currentSub, subDetail)
    if (isLicenceCategory && currentSub) {
      const cat = aircraftCategory === 'HELICOPTER' ? '헬리콥터' : aircraftCategory === 'AIRPLANE' ? '비행기' : ''
      const cls = aircraftCategory === 'AIRPLANE' && classRating ? ` · ${CLASS_RATING_LABEL[classRating]}` : ''
      if (cat) n = `${n} · ${cat}${cls}`
    }
    if (isRatingCategory) {
      const base = linkedLicence ? linkedLicence.name.split(' · ')[0] : '한정'
      const cat = aircraftCategory === 'HELICOPTER' ? '헬리콥터' : '비행기'
      const cls = aircraftCategory === 'AIRPLANE' && classRating ? ` · ${CLASS_RATING_LABEL[classRating]}` : ''
      const type = typeRating.trim() ? ` · 형식한정(${typeRating.trim()})` : ''
      n = `${base} · ${cat}${cls}${type}`
    }
    setNameValue(n)
  }, [category, currentSub, subDetail, nameTouched, isFreeText, isLicenceCategory, isRatingCategory, aircraftCategory, classRating, linkedLicence, typeRating])

  // 6) 구분별 기본 발급기관
  useEffect(() => {
    if (issuerTouched) return
    setIssuerValue(DEFAULT_ISSUER_BY_CATEGORY[category] ?? '')
  }, [category, issuerTouched])

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
    const issued = issuedEl?.value || localToday()
    const { months, assumedAge } = medicalValidityMonths({ medicalKey: subKey, issuedDate: issued, birthDate, commercialSinglePilot })
    return { months, assumedAge }
  }, [category, subKey, birthDate, commercialSinglePilot])

  function handleCategoryChange(next: CertificateCategory) {
    setNameTouched(false)
    setIssuerTouched(false)
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

      scrollToFirstError(formRef.current)
      return
    }

    setErrors({})
    onSubmit(
      {
        name,
        category,
        track: initialValues?.track ?? track,
        licenceNumber: hasLicenceNumber ? String(form.get('licenceNumber') || '').trim() || undefined : initialValues?.licenceNumber,
        limitations: isLicenceCategory ? String(form.get('limitations') || '').trim() || undefined : initialValues?.limitations,
        aircraftCategory: (isLicenceCategory || isRatingCategory) && aircraftCategory ? aircraftCategory : initialValues?.aircraftCategory,
        classRating: (isLicenceCategory || isRatingCategory) && aircraftCategory === 'AIRPLANE' && classRating ? classRating : undefined,
        linkedCertificateId: isRatingCategory ? linkedId || undefined : initialValues?.linkedCertificateId,
        typeRating: isRatingCategory ? typeRating.trim() || undefined : initialValues?.typeRating,
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
      setIssuerValue(DEFAULT_ISSUER_BY_CATEGORY[categories[0]] ?? '')
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5">

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={`${labelClass} inline-flex items-center gap-1`}>
            구분
            <InfoTip label="구분 안내">{PILOT_TRACK_LABEL[track]} 자격으로 등록돼요. 계기비행증명·조종교육증명·한정도 여기서 골라요.</InfoTip>
          </label>
          <select id="category"
            name="category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value as CertificateCategory)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_OPTION_LABEL[c] ?? c}
              </option>
            ))}
          </select>
        </div>

        {subTypes.length > 0 && (
          <div>
            <label htmlFor="sub-type" className={labelClass}>
              세부 종류
            </label>
            <select id="sub-type"
              value={subKey}
              onChange={(e) => handleSubChange(e.target.value)}
              className={inputClass}
            >
              {subTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasLicenceNumber && (
          <div>
            <label htmlFor="licenceNumber" className={`${labelClass} inline-flex items-center gap-1`}>
              자격번호 <span className="text-slate-500">(III. SERIAL NO.)</span>
              {isLicenceCategory && (
                <InfoTip label="자격번호 안내">계기비행증명·조종교육증명·추가 한정은 같은 자격번호로 자격증에 인쇄되므로 따로 번호를 받지 않아요.</InfoTip>
              )}
            </label>
            <input
              id="licenceNumber"
              name="licenceNumber"
              type="text"
              defaultValue={initialValues?.licenceNumber}
              placeholder="예: 12-015238"
              className={`${inputClass} font-mono-data`}
            />
          </div>
        )}

        {isRatingCategory && (
          <>
            <div className="sm:col-span-2">
              <label htmlFor="rt-link" className={labelClass}>어느 자격증명에 추가하나요?</label>
              {licenceOptions.length > 0 ? (
                <select id="rt-link" value={linkedId} onChange={(e) => setLinkedId(e.target.value)} className={inputClass}>
                  {licenceOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.licenceNumber ? ` (${c.licenceNumber})` : ''}</option>
                  ))}
                </select>
              ) : (
                <p className="rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  먼저 조종사 자격증명을 등록해 주세요. 한정은 자격증명에 붙는 항목이에요(제37조).
                </p>
              )}
            </div>
            <div>
              <label htmlFor="rt-cat" className={labelClass}>종류</label>
              <select id="rt-cat" value={aircraftCategory} onChange={(e) => setAircraftCategory(e.target.value as 'AIRPLANE' | 'HELICOPTER')} className={inputClass}>
                <option value="AIRPLANE">비행기</option>
                <option value="HELICOPTER">헬리콥터</option>
              </select>
            </div>
            {aircraftCategory === 'AIRPLANE' && (
              <div>
                <label htmlFor="rt-cls" className={labelClass}>등급</label>
                <select id="rt-cls" value={classRating} onChange={(e) => setClassRating(e.target.value as 'SEL' | 'MEL' | 'SES' | 'MES')} className={inputClass}>
                  <option value="SEL">육상단발(SEL)</option>
                  <option value="MEL">육상다발(MEL)</option>
                  <option value="SES">수상단발(SES)</option>
                  <option value="MES">수상다발(MES)</option>
                </select>
              </div>
            )}
            <div className={aircraftCategory === 'AIRPLANE' ? '' : 'sm:col-span-1'}>
              <label htmlFor="rt-type" className={labelClass}>형식 <span className="text-slate-500">(있으면, 예: B737)</span></label>
              <input id="rt-type" type="text" value={typeRating} onChange={(e) => setTypeRating(e.target.value)} placeholder="없으면 비워 두세요" className={`${inputClass} font-mono-data`} />
            </div>
          </>
        )}

        {isLicenceCategory && (
          <>
            <div className="sm:col-span-2">
              <label htmlFor="limitations" className={labelClass}>제한사항 <span className="text-slate-500">(XIII. LIMITATIONS, 없으면 비워 두세요)</span></label>
              <input id="limitations" name="limitations" type="text" defaultValue={initialValues?.limitations} className={inputClass} />
            </div>
            <div>
              <label htmlFor="lic-cat" className={labelClass}>종류 한정</label>
              <select id="lic-cat" value={aircraftCategory} onChange={(e) => setAircraftCategory(e.target.value as 'AIRPLANE' | 'HELICOPTER')} className={inputClass}>
                <option value="AIRPLANE">비행기</option>
                <option value="HELICOPTER">헬리콥터</option>
              </select>
            </div>
            {aircraftCategory === 'AIRPLANE' && (
              <div>
                <label htmlFor="lic-cls" className={`${labelClass} inline-flex items-center gap-1`}>
                  등급 한정
                  <InfoTip label="한정 안내">나중에 추가로 딴 등급·형식 한정은 구분을 "한정 추가"로 따로 등록하세요. 카드에는 자격증명과 함께 보여요.</InfoTip>
                </label>
                <select id="lic-cls" value={classRating} onChange={(e) => setClassRating(e.target.value as 'SEL' | 'MEL' | 'SES' | 'MES')} className={inputClass}>
                  <option value="SEL">육상단발(SEL)</option>
                  <option value="MEL">육상다발(MEL)</option>
                  <option value="SES">수상단발(SES)</option>
                  <option value="MES">수상다발(MES)</option>
                </select>
              </div>
            )}
          </>
        )}

        {category === '무선통신사' && (
          <p className="rounded-control border border-orange-400/30 bg-orange-400/10 px-4 py-2.5 text-xs leading-relaxed text-orange-200 sm:col-span-2">
            무선통신사는 <span className="font-semibold">5년마다 통신보안 의무교육</span> 대상이에요(전파법 제30조·규칙 제7조). 무선국 종사자에 한하며, 발급 5년이 지나면
            교육 이수증을 첨부해 관리자 인증을 받아야 커런시가 유효 처리돼요.
          </p>
        )}
      </div>

      {currentSub?.requiresDetail && (
        <div>
          <label htmlFor="rating-detail" className={labelClass}>
            {category === '한정' ? '기종명' : '세부 표기'}
          </label>
          <input id="rating-detail"
            type="text"
            value={subDetail}
            onChange={(e) => handleDetailChange(e.target.value)}
            placeholder={currentSub.detailPlaceholder}
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="name" className={`${labelClass} inline-flex items-center gap-1`}>
          자격/면허 명칭
          {!isFreeText && (
            <InfoTip label="명칭 안내">위 구분/세부 종류 선택에 따라 자동으로 정해져요. 정확한 인식을 위해 직접 고칠 수 없어요.</InfoTip>
          )}
        </label>
        {isFreeText ? (
          <>
            <input id="name"
              name="name"
              type="text"
              value={nameValue}
              onChange={(e) => { setNameTouched(true); setNameValue(e.target.value) }}
              placeholder="예: 사업용 조종사(CPL)"
              className={inputClass}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'cert-name-error' : undefined}
            />
            <p className="mt-1.5 text-xs text-slate-400">위 구분/세부 종류를 선택하면 자동으로 채워지며, 필요하면 직접 수정할 수 있어요.</p>
          </>
        ) : (
          <>
            <p className="rounded-control border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-400">
              {nameValue}
            </p>
          </>
        )}
        {errors.name && (
          <p id="cert-name-error" className="mt-1.5 text-xs text-rose-600">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="issuer" className={labelClass}>
          발급기관
        </label>
        <input id="issuer"
          name="issuer"
          type="text"
          value={issuerValue}
          onChange={(e) => { setIssuerTouched(true); setIssuerValue(e.target.value) }}
          placeholder="예: 한국교통안전공단, 항공전문의(병원명)"
          className={inputClass}
          aria-invalid={Boolean(errors.issuer)}
          aria-describedby={errors.issuer ? 'issuer-error' : undefined}
        />
        {errors.issuer && (
          <p id="issuer-error" className="mt-1.5 text-xs text-rose-600">
            {errors.issuer}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="issuedDate" className={labelClass}>
            발급일
          </label>
          <input id="issuedDate"
            name="issuedDate"
            type="date"
            defaultValue={initialValues?.issuedDate}
            className={inputClass}
            aria-invalid={Boolean(errors.issuedDate)}
            aria-describedby={errors.issuedDate ? 'issuedDate-error' : undefined}
          
              onChange={(e) => autofillExpiry(e.target.value)}
            />
          {errors.issuedDate && (
            <p id="issuedDate-error" className="mt-1.5 text-xs text-rose-600">
              {errors.issuedDate}
            </p>
          )}
        </div>

        {showExpiryField ? (
          <div>
            <label htmlFor="expiryDate" className={labelClass}>
              만료일{expiryRequirement === 'optional' ? ' (선택)' : ''}
            </label>
            <input id="expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={initialValues?.expiryDate}
              className={inputClass}
              aria-invalid={Boolean(errors.expiryDate)}
              aria-describedby={errors.expiryDate ? 'expiryDate-error' : undefined}
            />
            {category === '항공신체검사' && medicalNote && (
              <p className="mt-1.5 text-xs text-slate-400">
                발급일을 넣으면 <span className="font-semibold text-slate-300">별표 8 기준 {medicalNote.months}개월</span>, 월말 만료 원칙으로 자동 계산돼요(수정 가능).
                {medicalNote.assumedAge && (
                  <span className="text-amber-300"> 생년월일이 없어 가장 짧은 기간으로 잡았어요. 계정정보에 생년월일을 넣으면 정확해집니다.</span>
                )}
              </p>
            )}
            {category === '항공영어구술능력증명' && (
              <p className="mt-1.5 text-xs text-slate-400">
                4등급 3년 · 5등급 6년 · 6등급 영구(규칙 제99조③). 6등급은 만료일을 비워 두세요.
              </p>
            )}
            {errors.expiryDate && (
              <p id="expiryDate-error" className="mt-1.5 text-xs text-rose-600">
                {errors.expiryDate}
              </p>
            )}
            {category === '항공신체검사' && (
              <p className="mt-1.5 text-xs text-slate-400">
                월말 만료 원칙: 계산된 만료일이 그 달의 말일이 아니면 그 달 말일까지 유효해요.
              </p>
            )}
          </div>
        ) : (
          <div>
            <span className={labelClass}>만료일</span>
            <p className="rounded-control border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-400">
              이 자격은 만료 개념이 없어요.
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="cert-notes" className={labelClass}>
          메모 (선택)
        </label>
        <textarea id="cert-notes"
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes}
          placeholder="갱신 절차나 준비 서류 등을 남겨 주세요."
          className={inputClass}
        />
      </div>

        <div>
          <span className={labelClass}>자격증 사진 (이미지 또는 PDF)</span>
          <input type="file"
            data-testid="cert-photo"
            accept="image/*,application/pdf,.pdf"
            onChange={(e) => setApprovalFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-xs text-slate-400 file:mr-3 file:rounded-control file:border file:border-sky/40 file:bg-sky/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {mode === 'create'
              ? '등록과 동시에 관리자에게 인증 요청이 전송되고, 승인되면 목록에 "인증됨"으로 표시돼요.'
              : '수정 시에는 첨부하지 않아도 돼요. 재인증은 상세 화면에서 요청하세요.'}
          </p>
          {errors.approvalFile && (
            <p className="mt-1.5 text-xs text-rose-600">{errors.approvalFile}</p>
          )}
        </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="md" data-testid="cert-submit">
          {mode === 'create' ? '자격증 등록하기' : '수정 내용 저장하기'}
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

/** 테스트용 노출 */
export const __inferSubTypeFromName = inferSubTypeFromName
