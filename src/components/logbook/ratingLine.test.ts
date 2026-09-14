import { describe, expect, it } from 'vitest'

import { ratingLine } from './MyCertificateStatusCard'
import type { Certificate } from '../../types/certificate'

function cert(partial: Partial<Certificate>): Certificate {
  return { id: 'x', name: '', category: '조종사 자격증명', issuer: '', issuedDate: '', createdAt: 0, updatedAt: 0, ...partial }
}

// 카드의 "IV. 한정사항(RATINGS)" 줄은 실물 자격증 표기를 그대로 따라가야 한다.
describe('ratingLine — 조종교육증명', () => {
  it('등급(육상단발/다발)까지 보여준다', () => {
    expect(ratingLine(cert({ category: '조종교육증명', name: '선임 조종교육증명 - 비행기 육상단발' })))
      .toEqual(['조종교육증명 선임(비행기/육상단발)'])
    expect(ratingLine(cert({ category: '조종교육증명', name: '초급 조종교육증명 - 비행기 육상다발' })))
      .toEqual(['조종교육증명 초급(비행기/육상다발)'])
  })

  it('수상 등급도 구분한다', () => {
    expect(ratingLine(cert({ category: '조종교육증명', name: '초급 조종교육증명 - 비행기 수상단발' })))
      .toEqual(['조종교육증명 초급(비행기/수상단발)'])
  })

  it('등급이 없으면(등급 미상) 종류만 보여준다', () => {
    expect(ratingLine(cert({ category: '조종교육증명', name: '선임 조종교육증명 - 비행기' })))
      .toEqual(['조종교육증명 선임(비행기)'])
  })

  it('헬리콥터는 등급 구분이 없다', () => {
    expect(ratingLine(cert({ category: '조종교육증명', name: '초급 조종교육증명 - 헬리콥터' })))
      .toEqual(['조종교육증명 초급(헬리콥터)'])
  })
})

describe('ratingLine — 다른 자격은 그대로 (회귀 확인)', () => {
  it('조종사 자격증명', () => {
    expect(ratingLine(cert({ category: '조종사 자격증명', aircraftCategory: 'AIRPLANE', classRating: 'SEL' })))
      .toEqual(['비행기/육상단발'])
  })

  it('한정', () => {
    expect(ratingLine(cert({ category: '한정', name: '한정 - 비행기 육상다발' }))).toEqual(['비행기/육상다발'])
  })

  it('계기비행증명', () => {
    expect(ratingLine(cert({ category: '계기비행증명', name: '계기비행증명 - 비행기' })))
      .toEqual(['계기비행증명(비행기)'])
  })
})
