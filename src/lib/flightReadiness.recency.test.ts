import { describe, expect, it } from 'vitest'

import { computeFlightReadiness } from './flightReadiness'
import type { LogbookEntry } from '../types/logbook'

const d = (daysAgo: number) => {
  const t = new Date()
  t.setDate(t.getDate() - daysAgo)
  return t.toISOString().slice(0, 10)
}
const e = (o: Partial<LogbookEntry>): LogbookEntry =>
  ({ id: Math.random().toString(36), date: d(10), departure: 'RKTL', arrival: 'RKTL', aircraftType: 'C172S', blockTime: 1, flightCategory: '주간', createdAt: 0, updatedAt: 0, ...o }) as LogbookEntry

describe('최근 비행경험 — 운항기술기준 8.2.2', () => {
  it('일반 운항: 야간 이착륙이 없어도 야간 요건은 참고치(법정 아님) → nightMet 유지', () => {
    const r = computeFlightReadiness([e({ dayLandings: 3 })], [], { operationType: 'general' })
    expect(r.recency.windowDays).toBe(180)
    expect(r.recency.nightRequired).toBe(false)
    expect(r.recency.baseMet).toBe(true)
    expect(r.recency.nightMet).toBe(true)
  })
  it('여객·2인조종·운송사업: 90일, 야간 1회가 법정 요건', () => {
    const r = computeFlightReadiness([e({ dayLandings: 3 })], [], { operationType: 'commercial' })
    expect(r.recency.windowDays).toBe(90)
    expect(r.recency.nightRequired).toBe(true)
    expect(r.recency.nightMet).toBe(false)
  })
  it('동일 등급: 단발 3회 착륙은 다발 커런시를 채우지 않는다', () => {
    const r = computeFlightReadiness([e({ dayLandings: 3, aircraftType: 'C172S' }), e({ date: d(300), dayLandings: 1, aircraftType: 'DA42' })], [], { operationType: 'general' })
    const sel = r.recency.byClass.find((c) => c.aircraftClass === 'SEL')
    const mel = r.recency.byClass.find((c) => c.aircraftClass === 'MEL')
    expect(sel?.baseMet).toBe(true)
    expect(mel?.baseMet).toBe(false)
  })
  it('등급 미기재 기록은 모든 등급에 합산(보수적)', () => {
    const r = computeFlightReadiness([e({ dayLandings: 3, aircraftType: 'ZZ-999' }), e({ date: d(5), dayLandings: 0, aircraftType: 'DA42' })], [], { operationType: 'general' })
    expect(r.recency.byClass.find((c) => c.aircraftClass === 'MEL')?.baseMet).toBe(true)
  })
})

describe('실시간 비행 적합성 — 등급별 판정 반영', () => {
  it('다발은 되고 단발은 안 되면 "가능"이 아니라 "일부"로 표시하고 단발 제한 사유를 남긴다', async () => {
    const { computeReadinessStates } = await import('./flightReadiness')
    const medical = { id: 'm', category: '항공신체검사', name: '제2종', issuer: '', issuedDate: d(30), expiryDate: d(-300), createdAt: 0, updatedAt: 0 } as never
    // 최근 180일: DA42(다발) 이착륙 3회, C172S(단발) 이착륙 1회
    const r = computeFlightReadiness(
      [e({ dayLandings: 3, aircraftType: 'DA42' }), e({ dayLandings: 1, aircraftType: 'C172S' })],
      [medical],
      { operationType: 'general' },
    )
    const states = computeReadinessStates(r, [medical]).states
    const general = states.find((s) => s.key === 'general')!
    expect(general.met).toBe(true)
    expect(general.partial).toBe(true)
    expect(general.byClass?.map((c) => `${c.label}:${c.met}`)).toEqual(expect.arrayContaining(['육상다발:true', '육상단발:false']))
    expect(general.reasons.join(' ')).toContain('육상단발')
  })
})
