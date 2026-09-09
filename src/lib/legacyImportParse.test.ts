import { describe, expect, it } from 'vitest'

import {
  detectDateOrder,
  detectTimeUnit,
  parseCountValue,
  parseDateValue,
  parseDurationValue,
} from './legacyImportParse'

describe('parseDateValue', () => {
  it('YYYY-MM-DD 계열을 그대로 읽는다', () => {
    expect(parseDateValue('2025-07-01')).toBe('2025-07-01')
    expect(parseDateValue('2025.7.1')).toBe('2025-07-01')
    expect(parseDateValue('2025/7/1')).toBe('2025-07-01')
  })

  it('미국식 M/D/Y 를 읽는다(두 자리 연도 포함)', () => {
    expect(parseDateValue('7/1/2025', 'mdy')).toBe('2025-07-01')
    expect(parseDateValue('7/1/25', 'mdy')).toBe('2025-07-01')
    expect(parseDateValue('03/04/2025', 'mdy')).toBe('2025-03-04')
  })

  it('order 가 dmy 면 같은 값을 일/월로 읽는다', () => {
    expect(parseDateValue('03/04/2025', 'dmy')).toBe('2025-04-03')
  })

  it('13 이상이면 order 와 무관하게 값으로 순서가 정해진다', () => {
    expect(parseDateValue('25/12/2025', 'mdy')).toBe('2025-12-25')
    expect(parseDateValue('12/25/2025', 'dmy')).toBe('2025-12-25')
  })

  it('월 약어 표기를 양방향으로 읽는다', () => {
    expect(parseDateValue('01 Jul 25')).toBe('2025-07-01')
    expect(parseDateValue('1-Jul-2025')).toBe('2025-07-01')
    expect(parseDateValue('Jul 1, 2025')).toBe('2025-07-01')
    expect(parseDateValue('July 01 2025')).toBe('2025-07-01')
  })

  it('엑셀 날짜 일련번호를 읽는다', () => {
    // 45839 = 2025-07-01 (기준 1899-12-30)
    expect(parseDateValue('45839')).toBe('2025-07-01')
  })

  it('두 자리 연도는 69/70 을 경계로 세기를 나눈다', () => {
    expect(parseDateValue('7/1/69', 'mdy')).toBe('2069-07-01')
    expect(parseDateValue('7/1/70', 'mdy')).toBe('1970-07-01')
  })

  it('읽을 수 없으면 null', () => {
    expect(parseDateValue('')).toBeNull()
    expect(parseDateValue('합계')).toBeNull()
    expect(parseDateValue('13/13/2025')).toBeNull()
  })
})

describe('detectDateOrder', () => {
  it('앞칸에 13 이상이 있으면 dmy 로 확정한다', () => {
    expect(detectDateOrder(['13/04/2025', '03/04/2025'])).toEqual({ order: 'dmy', ambiguous: false })
  })

  it('뒷칸에 13 이상이 있으면 mdy 로 확정한다', () => {
    expect(detectDateOrder(['04/13/2025', '03/04/2025'])).toEqual({ order: 'mdy', ambiguous: false })
  })

  it('둘 다 12 이하뿐이면 미국식을 기본으로 하되 모호하다고 알린다', () => {
    expect(detectDateOrder(['03/04/2025', '05/06/2025'])).toEqual({ order: 'mdy', ambiguous: true })
  })

  it('YYYY-MM-DD 만 있으면 판정 대상이 아니다', () => {
    expect(detectDateOrder(['2025-07-01', '2025-07-02'])).toEqual({ order: 'mdy', ambiguous: false })
  })
})

describe('parseDurationValue', () => {
  it('H:MM 표기를 시간으로 바꾼다', () => {
    expect(parseDurationValue('1:30')).toBe(1.5)
    expect(parseDurationValue('0:45')).toBe(0.8)
    expect(parseDurationValue('12:00:00')).toBe(12)
  })

  it('단위가 붙은 표기를 읽는다', () => {
    expect(parseDurationValue('1h30m')).toBe(1.5)
    expect(parseDurationValue('1시간 30분')).toBe(1.5)
    expect(parseDurationValue('2h')).toBe(2)
    expect(parseDurationValue('90분')).toBe(1.5)
    expect(parseDurationValue('90 min')).toBe(1.5)
  })

  it('단위가 붙어 있으면 열 단위 설정을 무시한다', () => {
    expect(parseDurationValue('1:30', 'minutes')).toBe(1.5)
    expect(parseDurationValue('90분', 'minutes')).toBe(1.5)
  })

  it('순수 숫자는 열 단위를 따른다', () => {
    expect(parseDurationValue('1.5', 'hours')).toBe(1.5)
    expect(parseDurationValue('90', 'minutes')).toBe(1.5)
    expect(parseDurationValue('100', 'minutes')).toBe(1.7)
  })

  it('빈 칸과 글자는 undefined', () => {
    expect(parseDurationValue('')).toBeUndefined()
    expect(parseDurationValue('  ')).toBeUndefined()
    expect(parseDurationValue('N/A')).toBeUndefined()
  })
})

describe('detectTimeUnit', () => {
  it('25 이상 정수만 있으면 분으로 본다', () => {
    expect(detectTimeUnit(['90', '135', '60', '45'])).toBe('minutes')
  })

  it('소수가 하나라도 있으면 시간이다', () => {
    expect(detectTimeUnit(['90', '135', '1.5'])).toBe('hours')
  })

  it('작은 정수만 있으면 시간이다', () => {
    expect(detectTimeUnit(['1', '2', '1', '3'])).toBe('hours')
  })

  it('표기에 단위가 있으면 시간이다', () => {
    expect(detectTimeUnit(['1:30', '90', '135'])).toBe('hours')
  })

  it('표본이 3건 미만이면 바꾸지 않는다', () => {
    expect(detectTimeUnit(['90', '135'])).toBe('hours')
  })
})

describe('parseCountValue', () => {
  it('횟수는 정수로 읽고 분 변환을 하지 않는다', () => {
    expect(parseCountValue('3')).toBe(3)
    expect(parseCountValue('0')).toBe(0)
    expect(parseCountValue('')).toBeUndefined()
    expect(parseCountValue('-1')).toBeUndefined()
  })
})
