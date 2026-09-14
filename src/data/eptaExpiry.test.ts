import { describe, expect, it } from 'vitest'

import { commEducationBaseDate, commEducationDueDate, computeEptaExpiryDate, computeMedicalExpiryDate, eptaBaseDateFromExpiry, medicalKeyFromAi } from './certificateOptions'

// 항공안전법 시행규칙 제99조③ — 기준일부터 계산하여 4등급 3년 / 5등급 6년 / 6등급 영구.
// "기준일부터"라 초일을 세므로 마지막 해의 해당일 전날에 만료한다(민법 제160조②).
describe('computeEptaExpiryDate — TS 영어등급조회 실제 3건', () => {
  it.each([
    ['2021-06-10', '2024-06-09'],
    ['2024-06-10', '2027-06-09'],
    ['2025-12-02', '2028-12-01'],
  ])('4등급: 기준일 %s → 만료 %s', (base, expiry) => {
    expect(computeEptaExpiryDate(base, 'EPTA_4')).toBe(expiry)
  })

  it('5등급은 6년', () => {
    expect(computeEptaExpiryDate('2025-12-02', 'EPTA_5')).toBe('2031-12-01')
  })

  it('6등급은 영구라 만료일이 없다', () => {
    expect(computeEptaExpiryDate('2025-12-02', 'EPTA_6')).toBeNull()
  })

  it('윤년 경계 — 2월 29일 기준일', () => {
    expect(computeEptaExpiryDate('2024-02-29', 'EPTA_4')).toBe('2027-02-28')
  })
})

describe('eptaBaseDateFromExpiry — 만료일에서 기준일 역산', () => {
  it.each([
    ['2024-06-09', '2021-06-10'],
    ['2027-06-09', '2024-06-10'],
    ['2028-12-01', '2025-12-02'],
  ])('4등급: 만료 %s → 기준일 %s', (expiry, base) => {
    expect(eptaBaseDateFromExpiry(expiry, 'EPTA_4')).toBe(base)
  })

  it('왕복이 맞아떨어진다', () => {
    for (const d of ['2020-01-01', '2024-02-29', '2025-12-02', '2026-12-31']) {
      const exp = computeEptaExpiryDate(d, 'EPTA_4')!
      expect(eptaBaseDateFromExpiry(exp, 'EPTA_4')).toBe(d)
    }
  })
})

// 한국방송통신전파진흥원 통신보안교육내역 실제 기록으로 확인(2026-09-13).
describe('commEducationDueDate — 통신보안 의무교육 5년', () => {
  it('최종교육일 2022-03-08 → 만료일 2027-03-07', () => {
    expect(commEducationDueDate('2022-03-08')).toBe('2027-03-07')
  })

  it('윤년 경계', () => {
    expect(commEducationDueDate('2024-02-29')).toBe('2029-02-28')
  })

  it('만료일 당일은 아직 유효하고, 다음 날부터 지난 것이다', () => {
    const base = '2022-03-08'
    const due = commEducationDueDate(base)!
    expect(due).toBe('2027-03-07')
    // isCommEducationDue 는 오늘 날짜에 의존하므로 경계 규칙만 문서화한다
    expect(due < '2027-03-07').toBe(false) // 당일 → 유효
    expect(due < '2027-03-08').toBe(true) // 다음 날 → 지남
  })
})

// 실제 사례(2026-09-13): 자격 발급 2017-11-24 · 최종교육 2022-03-08 → 4년 4개월 차이.
describe('commEducationBaseDate — 최종교육일과 발급일 중 늦은 쪽', () => {
  it('교육을 받았으면 최종교육일이 기준이다', () => {
    expect(commEducationBaseDate('2017-11-24', '2022-03-08')).toBe('2022-03-08')
    expect(commEducationDueDate(commEducationBaseDate('2017-11-24', '2022-03-08'))).toBe('2027-03-07')
  })

  it('최종교육일이 비면 발급일이 기준이다 — 아직 교육을 안 받은 경우', () => {
    expect(commEducationBaseDate('2017-11-24', undefined)).toBe('2017-11-24')
    expect(commEducationDueDate(commEducationBaseDate('2017-11-24'))).toBe('2022-11-23')
  })

  it('최종교육일이 발급일보다 이르면(잘못 입력) 발급일을 쓴다', () => {
    expect(commEducationBaseDate('2017-11-24', '2015-01-01')).toBe('2017-11-24')
  })

  it('예전 방식(발급일만)과 비교 — 실제 사례에서 4년 넘게 벌어진다', () => {
    expect(commEducationDueDate('2017-11-24')).toBe('2022-11-23') // 이미 지남 → 잘못된 경고
    expect(commEducationDueDate('2022-03-08')).toBe('2027-03-07') // 실제
  })
})

// [2026-09-14] 스키마에 medicalClass 가 문자열/정수로 두 번 정의돼 있었고, 받는 쪽은 문자열만 받았다.
// 그래서 신체검사 종류가 한 번도 자동으로 안 채워졌고, 유효기간도 엉뚱한 종류로 계산됐다.
describe('medicalKeyFromAi', () => {
  it('정수로 오는 경우 (지금 스키마)', () => {
    expect(medicalKeyFromAi(1)).toBe('CLASS1')
    expect(medicalKeyFromAi(2)).toBe('CLASS2')
    expect(medicalKeyFromAi(3)).toBe('CLASS3')
  })

  it('문자열로 오는 경우도 받는다', () => {
    expect(medicalKeyFromAi('제1종')).toBe('CLASS1')
    expect(medicalKeyFromAi('CLASS 2')).toBe('CLASS2')
    expect(medicalKeyFromAi('제3종 항공신체검사증명')).toBe('CLASS3')
  })

  it('없거나 알 수 없으면 null — 아무 종류나 고르지 않는다', () => {
    expect(medicalKeyFromAi(null)).toBeNull()
    expect(medicalKeyFromAi(undefined)).toBeNull()
    expect(medicalKeyFromAi(0)).toBeNull()
    expect(medicalKeyFromAi('종류 없음')).toBeNull()
  })

  it('종류를 틀리면 유효기간이 5배까지 벌어진다 (왜 중요한가)', () => {
    const opts = { birthDate: '1991-01-01' } // 35세
    expect(computeMedicalExpiryDate('2026-03-17', 'CLASS1', opts)).toBe('2027-03-31')
    expect(computeMedicalExpiryDate('2026-03-17', 'CLASS2', opts)).toBe('2031-03-31')
  })
})
