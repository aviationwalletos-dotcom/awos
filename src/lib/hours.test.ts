import { describe, expect, it } from 'vitest'

import { roundToTenth, sumHours } from './hours'
import { buildLogbookCsv } from './logbookCsv'

import type { LogbookEntry } from '../types/logbook'

// 시간 합산의 정확성은 이 앱의 신뢰 그 자체다. 조종사의 총 비행시간이 0.1이라도 틀리면
// 도구로서 끝이므로, 부동소수점 엣지 케이스를 자동 테스트로 잠근다.

describe('sumHours — 부동소수점 오차 방지 합산', () => {
  it('고전적 오차 케이스: 0.1 + 0.2 = 0.3', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // JS 기본 연산은 실제로 틀린다(전제 확인)
    expect(sumHours([0.1, 0.2])).toBe(0.3)
  })

  it('0.1을 1,000번 더하면 정확히 100.0', () => {
    const values = Array.from({ length: 1000 }, () => 0.1)
    expect(sumHours(values)).toBe(100)
  })

  it('실전 패턴: 1.2 + 2.3 + 0.7 + 1.1 = 5.3', () => {
    expect(sumHours([1.2, 2.3, 0.7, 1.1])).toBe(5.3)
  })

  it('undefined / null / NaN / Infinity는 0으로 취급', () => {
    expect(sumHours([1.5, undefined, null, Number.NaN, Number.POSITIVE_INFINITY, 0.5])).toBe(2)
  })

  it('빈 배열은 0', () => {
    expect(sumHours([])).toBe(0)
  })

  it('대량 누적(3,000건 × 1.1h)에서도 오차 없음', () => {
    const values = Array.from({ length: 3000 }, () => 1.1)
    expect(sumHours(values)).toBe(3300)
  })
})

describe('roundToTenth — 0.1시간 단위 반올림', () => {
  it('1.25 → 1.3, 1.24 → 1.2', () => {
    expect(roundToTenth(1.25)).toBe(1.3)
    expect(roundToTenth(1.24)).toBe(1.2)
  })
  it('부동소수점 잔여물 제거: 1.1 + 2.2 입력 결과도 한 자리로', () => {
    expect(roundToTenth(1.1 + 2.2)).toBe(3.3)
  })
})

function makeEntry(overrides: Partial<LogbookEntry>): LogbookEntry {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-08-01',
    departure: 'RKTL',
    arrival: 'RKTH',
    aircraftType: 'C172',
    blockTime: 1.1,
    flightCategory: '주간',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('buildLogbookCsv — 합계 행 정확성', () => {
  it('블록타임 합계가 오차 없이 기재된다 (0.1×3 + 1.1 = 1.4)', () => {
    const entries = [
      makeEntry({ blockTime: 0.1 }),
      makeEntry({ blockTime: 0.1 }),
      makeEntry({ blockTime: 0.1 }),
      makeEntry({ blockTime: 1.1, pilotingTime: { pic: 1.1 }, conditions: { night: 0.5 } }),
    ]
    const csv = buildLogbookCsv(entries)
    const lines = csv.trim().split('\n')
    const totalRow = lines[lines.length - 1]
    expect(totalRow.startsWith('합계')).toBe(true)
    const cells = totalRow.split(',')
    expect(cells[6]).toBe('1.4') // 블록타임 합계 (0.30000000000000004 방지)
    expect(cells[14]).toBe('1.1') // PIC 합계
    expect(cells[19]).toBe('0.5') // 야간 합계
    expect(cells[5]).toBe('4건')
  })

  it('BOM과 헤더가 포함된다 (엑셀 한글 호환)', () => {
    const csv = buildLogbookCsv([makeEntry({})])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('날짜,출발지,도착지')
  })
})
