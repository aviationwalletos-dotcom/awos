import { describe, expect, it } from 'vitest'

import { computeNextGoals } from './nextGoal'
import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'

const e = (o: Partial<LogbookEntry>): LogbookEntry =>
  ({ id: Math.random().toString(36), date: '2026-01-01', departure: '김천', arrival: '김천', aircraftType: 'X', blockTime: 1, flightCategory: '주간', createdAt: 0, updatedAt: 0, vehicleClass: 'ultralight', vehicleKind: 'UAS_HELICOPTER', vehicleId: 'v1', ...o }) as LogbookEntry
const cert = (category: Certificate['category'], name: string): Certificate => ({ id: name, name, category, issuer: 'TS', issuedDate: '2025-01-01', createdAt: 0, updatedAt: 0 }) as Certificate
const byId = { v1: '1종' }

describe('다음 목표 전환 (무인헬리콥터 1종 기체 기록)', () => {
  const rows = [e({ blockTime: 8 }), e({ blockTime: 4 })]
  it('기록 없음 → 목표 없음(제목만)', () => {
    expect(computeNextGoals('ultralight', [], [], byId)).toEqual([])
  })
  it('자격 없음 → 1종 무인헬리콥터 조종자증명(20시간)', () => {
    const g = computeNextGoals('ultralight', rows, [], byId)[0]
    expect(g.title).toBe('1종 무인헬리콥터 조종자증명')
    expect(g.primary).toMatchObject({ required: 20, current: 12 })
  })
  it('2종 보유 → 1종 완화 경로(15시간)', () => {
    const g = computeNextGoals('ultralight', rows, [cert('초경량비행장치 조종자증명', '무인헬리콥터 (2종)')], byId)[0]
    expect(g.primary?.required).toBe(15)
  })
  it('1종 보유 → 지도조종자(100시간)로 전환', () => {
    const g = computeNextGoals('ultralight', rows, [cert('초경량비행장치 조종자증명', '무인헬리콥터 (1종)')], byId)[0]
    expect(g.title).toBe('무인헬리콥터 지도조종자')
    expect(g.primary?.required).toBe(100)
  })
  it('지도조종자 등록 → 실기평가조종자(150시간)로 전환', () => {
    const g = computeNextGoals('ultralight', rows, [cert('초경량비행장치 조종자증명', '무인헬리콥터 (1종)'), cert('지도조종자', '지도조종자(무인헬리콥터)')], byId)[0]
    expect(g.title).toBe('무인헬리콥터 실기평가조종자')
    expect(g.primary?.required).toBe(150)
  })
  it('실기평가조종자 등록 → 완료 표시', () => {
    const g = computeNextGoals('ultralight', rows, [cert('초경량비행장치 조종자증명', '무인헬리콥터 (1종)'), cert('지도조종자', '지도조종자(무인헬리콥터)'), cert('지도조종자', '실기평가조종자(무인헬리콥터)')], byId)[0]
    expect(g.done).toBe(true)
  })
})
