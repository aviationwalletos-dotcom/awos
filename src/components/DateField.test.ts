import { describe, expect, it } from 'vitest'

import { formatDateInput, isCompleteDate } from './DateField'

describe('DateField 입력 정리', () => {
  it('숫자 8자리를 YYYY-MM-DD 로 만든다', () => {
    expect(formatDateInput('20260907')).toBe('2026-09-07')
    expect(formatDateInput('2026-09-07')).toBe('2026-09-07')
    expect(formatDateInput('2026.09.07')).toBe('2026-09-07')
  })
  it('입력 중에는 부분 문자열을 유지한다', () => {
    expect(formatDateInput('2026')).toBe('2026')
    expect(formatDateInput('202609')).toBe('2026-09')
    expect(formatDateInput('2026091')).toBe('2026-09-1')
  })
  it('존재하지 않는 날짜는 완성으로 보지 않는다', () => {
    expect(isCompleteDate('2026-02-30')).toBe(false)
    expect(isCompleteDate('2026-09-07')).toBe(true)
    expect(isCompleteDate('2026-9-7')).toBe(false)
  })
})
