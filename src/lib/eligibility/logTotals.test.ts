import { describe, expect, it } from 'vitest'

import { buildLogTotals } from './logTotals'
import type { LogbookEntry } from '../../types/logbook'

const e = (o: Partial<LogbookEntry>): LogbookEntry =>
  ({ id: 'x', date: '2026-01-01', departure: 'RKTL', arrival: 'RKTL', aircraftType: 'C172S', blockTime: 1, flightCategory: '주간', createdAt: 0, updatedAt: 0, ...o }) as LogbookEntry

describe('시행규칙 제78조 비행시간 산정', () => {
  it('1인 조종 항공기의 부기장(SIC) 시간은 1/2만 인정', () => {
    const t = buildLogTotals([e({ blockTime: 2, pilotingTime: { sic: 2 } })])
    expect(t.sic).toBe(1)
    expect(t.total).toBe(1)
  })
  it('2인 조종 항공기(비행교범)면 SIC 전부 인정', () => {
    const t = buildLogTotals([e({ blockTime: 2, pilotingTime: { sic: 2 }, twoPilotAircraft: true })])
    expect(t.sic).toBe(2)
    expect(t.total).toBe(2)
  })
  it('학생 단독 시간은 PIC와 중복 합산하지 않는다', () => {
    const t = buildLogTotals([e({ blockTime: 1.5, pilotingTime: { pic: 1.5, solo: 1.5 } })])
    expect(t.total).toBe(1.5)
    expect(t.solo).toBe(1.5)
  })
  it('미인증 이월 기록은 제외', () => {
    const t = buildLogTotals([e({ blockTime: 100, pilotingTime: { pic: 100 }, origin: 'flight_experience_certificate', certificateApprovalStatus: 'pending' })])
    expect(t.total ?? 0).toBe(0)
  })
})
