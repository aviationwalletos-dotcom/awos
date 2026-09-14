import { describe, expect, it } from 'vitest'

import { nightCrossCountryOf } from './flightExperienceRows'

// [2026-09-14] 사용자는 야외 시간만 넣고 앱이 주간·야간으로 나눈다(EntryForm).
// 입력·요약·PDF 가 같은 숫자를 봐야 하므로 규칙을 한곳에 고정한다.
describe('야외비행 자동 분할', () => {
  const e = (day: number, night: number, xc: number, manual?: number) => ({
    conditions: { day, night, crossCountry: xc, nightCrossCountry: manual },
  })

  it('야간이 야외보다 짧으면 야간 전부가 야간 야외', () => {
    expect(nightCrossCountryOf(e(2.3, 0.7, 3.0))).toBe(0.7)
  })

  it('야간이 야외보다 길면 야외 전부가 야간 야외', () => {
    expect(nightCrossCountryOf(e(0.5, 2.5, 1.0))).toBe(1.0)
  })

  it('야간이 없으면 전부 주간 야외', () => {
    expect(nightCrossCountryOf(e(3.0, 0, 3.0))).toBe(0)
  })

  it('직접 넣은 값이 있으면 그 값을 쓴다 — 자동이 안 맞는 비행용', () => {
    // 주간에 야외 2.0, 착륙 없이 야간 장주 1.0 → 야외는 전부 주간
    expect(nightCrossCountryOf(e(2.0, 1.0, 2.0, 0))).toBe(0)
  })

  it('직접 넣은 값도 야외·야간을 넘지 못한다', () => {
    expect(nightCrossCountryOf(e(2.0, 0.5, 3.0, 9))).toBe(0.5)
    expect(nightCrossCountryOf(e(2.0, 2.0, 1.0, 9))).toBe(1.0)
  })

  it('주간 야외 + 야간 야외 = 야외 (항상)', () => {
    for (const [d, n, xc] of [[2.3, 0.7, 3.0], [0.5, 2.5, 1.0], [3.0, 0, 3.0], [1.0, 1.0, 2.0]]) {
      const nightXc = nightCrossCountryOf(e(d, n, xc))
      expect(Number((xc - nightXc + nightXc).toFixed(1))).toBe(xc)
    }
  })
})
