// 조종사 자격증명서 한 장에서 같이 등록할 수 있는 자격을 뽑아낸다.
//
// 실물 자격증명서(별지 서식)에는 자격명·자격번호 외에 한정사항(XII. RATINGS)에 종류/등급·계기비행증명·조종교육증명이,
// 특기사항(XIII. REMARKS)에 항공영어구술능력 등급과 유효기간이 같이 인쇄돼 있다.
// 사용자가 CPL 사진 한 장을 올리면 이 함수가 "같이 등록할 것" 목록을 만들고, 사용자는 체크만 하면 된다.
//
// 원칙
//  - AI 가 읽은 값만 쓴다. 여기서 추정해 채우지 않는다(만료일 계산은 법령 규칙이라 예외).
//  - 이미 같은 자격이 있으면 duplicate 표시만 하고 기본 체크를 끈다(중복 등록 방지).
//  - 항공안전법 제37조: 종류·등급 한정은 자격증명의 속성. 첫 등급은 자격증명 본체에, 나머지는 '한정' 항목으로.

import type { Certificate, CertificateCategory, CertificateInput } from '../types/certificate'
import type { PilotTrack } from './tracks'
import { EPTA_VALIDITY_YEARS, computeEptaExpiryDate } from '../data/certificateOptions'

type AircraftCategory = 'AIRPLANE' | 'HELICOPTER'
type ClassRating = 'SEL' | 'MEL' | 'SES' | 'MES'

const LICENCE_LABEL: Record<string, string> = {
  PPL: '자가용 조종사(PPL)',
  CPL: '사업용 조종사(CPL)',
  ATPL: '운송용 조종사(ATPL)',
  MPL: '부조종사(MPL)',
}
const CATEGORY_LABEL: Record<AircraftCategory, string> = { AIRPLANE: '비행기', HELICOPTER: '헬리콥터' }
const CLASS_LABEL: Record<ClassRating, string> = { SEL: '육상단발', MEL: '육상다발', SES: '수상단발', MES: '수상다발' }
const TS = '한국교통안전공단'

export interface CertificateSuggestion {
  /** 목록 key */
  key: string
  /** 'licence' 는 폼 본체가 되는 자격증명(체크 목록에는 안 보인다) */
  kind: 'licence' | 'rating' | 'instrument' | 'instructor' | 'epta'
  /** 화면 라벨 */
  label: string
  /** 보조 설명(만료일 등) */
  detail?: string
  input: CertificateInput
  /** 같은 자격이 이미 등록돼 있음 → 기본 체크 해제 */
  duplicate: boolean
}

function isCat(v: unknown): v is AircraftCategory {
  return v === 'AIRPLANE' || v === 'HELICOPTER'
}
function isCls(v: unknown): v is ClassRating {
  return v === 'SEL' || v === 'MEL' || v === 'SES' || v === 'MES'
}
function isDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** 첫 등급은 자격증명 본체에 둔다. SEL 이 있으면 SEL 을 우선(대부분 처음 취득하는 등급). */
function pickPrimary(list: { category: AircraftCategory; cls: ClassRating | null }[]) {
  const sel = list.find((r) => r.category === 'AIRPLANE' && r.cls === 'SEL')
  return sel ?? list[0]
}

function licenceName(code: string, cat: AircraftCategory, cls: ClassRating | null): string {
  const base = LICENCE_LABEL[code] ?? code
  const clsPart = cat === 'AIRPLANE' && cls ? ` · ${CLASS_LABEL[cls]}` : ''
  return `${base} · ${CATEGORY_LABEL[cat]}${clsPart}`
}

function hasSame(existing: Certificate[], category: CertificateCategory, name: string): boolean {
  return existing.some((c) => c.category === category && c.name === name)
}

/**
 * @param fields  /api/read-document 의 licence 응답 fields
 * @param existing 이미 등록된 자격증(중복 판정용)
 * @param licenceIssuedDate 폼에 채워질 자격증명 발급일(한정·계기·교관에도 같은 날짜를 쓴다 — 같은 증서에 인쇄돼 있으므로)
 */
export function buildCertificateSuggestions(
  fields: Record<string, unknown>,
  existing: Certificate[],
  track: PilotTrack | undefined,
  licenceIssuedDate: string,
): CertificateSuggestion[] {
  const out: CertificateSuggestion[] = []
  const code = typeof fields.licenceCode === 'string' && LICENCE_LABEL[fields.licenceCode] ? fields.licenceCode : null
  if (!code) return out

  const issued = isDate(licenceIssuedDate) ? licenceIssuedDate : ''
  const licenceNumber = typeof fields.licenceNumber === 'string' ? fields.licenceNumber.trim() || undefined : undefined
  const limitations = typeof fields.limitations === 'string' ? fields.limitations.trim() || undefined : undefined

  // ── 종류/등급 한정 ──
  const ratingsRaw = Array.isArray(fields.classRatings) ? fields.classRatings : []
  const ratings = ratingsRaw
    .map((r) => {
      const o = r as { category?: unknown; class?: unknown } | null
      if (!o || !isCat(o.category)) return null
      return { category: o.category, cls: isCls(o.class) ? o.class : null }
    })
    .filter((r): r is { category: AircraftCategory; cls: ClassRating | null } => r !== null)
  // 같은 종류·등급이 두 번 적혀 있어도 한 번만
  const seen = new Set<string>()
  const uniqueRatings = ratings.filter((r) => {
    const k = `${r.category}:${r.cls ?? ''}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const primary = uniqueRatings.length > 0 ? pickPrimary(uniqueRatings) : { category: 'AIRPLANE' as const, cls: 'SEL' as const }
  const primaryName = licenceName(code, primary.category, primary.cls)
  out.push({
    key: 'licence',
    kind: 'licence',
    label: primaryName,
    input: {
      name: primaryName,
      category: '조종사 자격증명',
      track,
      aircraftCategory: primary.category,
      classRating: primary.category === 'AIRPLANE' && primary.cls ? primary.cls : undefined,
      licenceNumber,
      limitations,
      issuer: TS,
      issuedDate: issued,
    },
    duplicate: hasSame(existing, '조종사 자격증명', primaryName),
  })

  for (const r of uniqueRatings) {
    if (r === primary) continue
    const name = licenceName(code, r.category, r.cls)
    out.push({
      key: `rating:${r.category}:${r.cls ?? ''}`,
      kind: 'rating',
      label: `한정 추가 · ${CATEGORY_LABEL[r.category]}${r.category === 'AIRPLANE' && r.cls ? ` · ${CLASS_LABEL[r.cls]}` : ''}`,
      input: {
        name,
        category: '한정',
        track,
        aircraftCategory: r.category,
        classRating: r.category === 'AIRPLANE' && r.cls ? r.cls : undefined,
        issuer: TS,
        issuedDate: issued,
      },
      duplicate: hasSame(existing, '한정', name),
    })
  }

  // ── 계기비행증명(제44조) ──
  const irRaw = Array.isArray(fields.instrumentRatings) ? fields.instrumentRatings : []
  for (const cat of irRaw) {
    if (!isCat(cat)) continue
    const name = `계기비행증명 - ${CATEGORY_LABEL[cat]}`
    if (out.some((s) => s.input.name === name)) continue
    out.push({
      key: `instrument:${cat}`,
      kind: 'instrument',
      label: name,
      input: { name, category: '계기비행증명', track, issuer: TS, issuedDate: issued },
      duplicate: hasSame(existing, '계기비행증명', name),
    })
  }

  // ── 조종교육증명(초급/선임) ──
  const fiRaw = Array.isArray(fields.flightInstructorRatings) ? fields.flightInstructorRatings : []
  for (const item of fiRaw) {
    const o = item as { grade?: unknown; category?: unknown } | null
    if (!o || !isCat(o.category)) continue
    const grade = o.grade === 'SENIOR' ? '선임' : '초급'
    const name = `${grade} 조종교육증명 - ${CATEGORY_LABEL[o.category]}`
    if (out.some((s) => s.input.name === name)) continue
    out.push({
      key: `instructor:${o.grade === 'SENIOR' ? 'SENIOR' : 'BASIC'}:${o.category}`,
      kind: 'instructor',
      label: name,
      input: { name, category: '조종교육증명', track, issuer: TS, issuedDate: issued },
      duplicate: hasSame(existing, '조종교육증명', name),
    })
  }

  // ── 항공영어구술능력증명(시행규칙 제99조③: 4등급 3년 · 5등급 6년 · 6등급 영구) ──
  const level = typeof fields.eptaLevel === 'number' && [4, 5, 6].includes(fields.eptaLevel) ? fields.eptaLevel : null
  if (level) {
    const levelKey = `EPTA_${level}`
    const name = `항공영어구술능력증명 ${level}등급`
    const validUntil = isDate(fields.eptaValidUntil) ? fields.eptaValidUntil : null
    const years = EPTA_VALIDITY_YEARS[levelKey]
    // 발급일은 증서에 없다. 만료일이 있으면 규칙으로 거꾸로 계산하고, 없으면 자격증명 발급일을 쓴다(사용자가 고칠 수 있다).
    let eptaIssued = issued
    if (validUntil && years) {
      const d = new Date(`${validUntil}T00:00:00`)
      d.setFullYear(d.getFullYear() - years)
      const pad = (n: number) => String(n).padStart(2, '0')
      eptaIssued = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    const expiry = validUntil ?? (eptaIssued ? computeEptaExpiryDate(eptaIssued, levelKey) : null) ?? undefined
    out.push({
      key: `epta:${level}`,
      kind: 'epta',
      label: name,
      detail: expiry ? `만료 ${expiry}` : level === 6 ? '만료 없음' : undefined,
      input: { name, category: '항공영어구술능력증명', track, issuer: TS, issuedDate: eptaIssued, expiryDate: expiry },
      duplicate: hasSame(existing, '항공영어구술능력증명', name),
    })
  }

  return out
}
