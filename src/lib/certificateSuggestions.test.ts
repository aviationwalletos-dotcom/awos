import { describe, expect, it } from 'vitest'

import type { Certificate } from '../types/certificate'
import { buildCertificateSuggestions } from './certificateSuggestions'

// 실제 CPL 자격증명서 한 장에서 AI 가 읽어 오는 형태
const CPL_FIELDS = {
  name: '사업용조종사',
  licenceNumber: '12-015238',
  issuedDate: '2026-03-17',
  licenceCode: 'CPL',
  classRatings: [
    { category: 'AIRPLANE', class: 'MEL' },
    { category: 'AIRPLANE', class: 'SEL' },
  ],
  instrumentRatings: ['AIRPLANE'],
  flightInstructorRatings: [
    { grade: 'BASIC', category: 'AIRPLANE' },
    { grade: 'SENIOR', category: 'AIRPLANE' },
  ],
  eptaLevel: 4,
  eptaValidUntil: '2028-12-01',
  limitations: null,
}

function cert(partial: Partial<Certificate>): Certificate {
  return { id: 'x', name: '', category: '조종사 자격증명', issuer: '', issuedDate: '', createdAt: 0, updatedAt: 0, ...partial }
}

describe('buildCertificateSuggestions', () => {
  it('CPL 한 장에서 자격증명 + 한정 + 계기 + 교관 2 + EPTA 를 만든다', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s.map((x) => x.kind)).toEqual(['licence', 'rating', 'instrument', 'instructor', 'instructor', 'epta'])
  })

  it('SEL 이 있으면 SEL 을 자격증명 본체로, MEL 은 한정 추가로', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s[0].input.name).toBe('사업용 조종사(CPL) · 비행기 · 육상단발')
    expect(s[0].input.classRating).toBe('SEL')
    expect(s[0].input.licenceNumber).toBe('12-015238')
    expect(s[1].input.category).toBe('한정')
    expect(s[1].input.name).toBe('사업용 조종사(CPL) · 비행기 · 육상다발')
  })

  it('계기·교관 이름이 세부 종류 라벨과 같다', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s[2].input.name).toBe('계기비행증명 - 비행기')
    expect(s[3].input.name).toBe('초급 조종교육증명 - 비행기')
    expect(s[4].input.name).toBe('선임 조종교육증명 - 비행기')
    expect(s[3].input.issuedDate).toBe('2026-03-17')
  })

  it('EPTA 4등급: 만료일은 증서 값, 발급일은 3년 전으로 거꾸로 계산', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    const epta = s.find((x) => x.kind === 'epta')!
    expect(epta.input.name).toBe('항공영어구술능력증명 4등급')
    expect(epta.input.expiryDate).toBe('2028-12-01')
    expect(epta.input.issuedDate).toBe('2025-12-01')
    expect(epta.detail).toBe('만료 2028-12-01')
  })

  it('EPTA 만료일이 없으면 규칙으로 계산한다(5등급 6년)', () => {
    const s = buildCertificateSuggestions({ ...CPL_FIELDS, eptaLevel: 5, eptaValidUntil: null }, [], 'aircraft', '2026-03-17')
    const epta = s.find((x) => x.kind === 'epta')!
    expect(epta.input.issuedDate).toBe('2026-03-17')
    expect(epta.input.expiryDate).toBe('2032-03-17')
  })

  it('EPTA 6등급은 만료가 없다', () => {
    const s = buildCertificateSuggestions({ ...CPL_FIELDS, eptaLevel: 6, eptaValidUntil: null }, [], 'aircraft', '2026-03-17')
    const epta = s.find((x) => x.kind === 'epta')!
    expect(epta.input.expiryDate).toBeUndefined()
    expect(epta.detail).toBe('만료 없음')
  })

  it('이미 등록된 자격은 duplicate 로 표시한다', () => {
    const existing = [cert({ category: '계기비행증명', name: '계기비행증명 - 비행기' })]
    const s = buildCertificateSuggestions(CPL_FIELDS, existing, 'aircraft', '2026-03-17')
    expect(s.find((x) => x.kind === 'instrument')!.duplicate).toBe(true)
    expect(s.find((x) => x.kind === 'epta')!.duplicate).toBe(false)
  })

  it('licenceCode 가 없으면 아무것도 만들지 않는다(자격증명서가 아닌 문서)', () => {
    expect(buildCertificateSuggestions({ ...CPL_FIELDS, licenceCode: null }, [], 'aircraft', '2026-03-17')).toEqual([])
  })

  it('헬리콥터 등급은 class 없이 처리한다', () => {
    const s = buildCertificateSuggestions(
      { licenceCode: 'PPL', classRatings: [{ category: 'HELICOPTER', class: null }] },
      [], 'aircraft', '2026-01-01',
    )
    expect(s[0].input.name).toBe('자가용 조종사(PPL) · 헬리콥터')
    expect(s[0].input.classRating).toBeUndefined()
  })
})
