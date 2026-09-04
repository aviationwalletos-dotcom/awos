import { describe, expect, it } from 'vitest'

import { buildLsaProgress, buildUasProgress, buildUltralightMannedProgress } from './lightProgress'
import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'

const e = (o: Partial<LogbookEntry>): LogbookEntry =>
  ({ id: Math.random().toString(36), date: '2026-01-01', departure: 'RKTL', arrival: 'RKTL', aircraftType: 'X', blockTime: 1, flightCategory: '주간', createdAt: 0, updatedAt: 0, ...o }) as LogbookEntry
const cert = (category: Certificate['category'], name: string): Certificate =>
  ({ id: name, name, category, issuer: 'TS', issuedDate: '2025-01-01', createdAt: 0, updatedAt: 0 }) as Certificate

describe('경량항공기 응시경력 (별표 4 제2호)', () => {
  it('타면조종형: 20시간·단독 5·야외 5', () => {
    const rows = [e({ vehicleClass: 'lsa', vehicleKind: 'LSA_AIRPLANE', blockTime: 12, pilotingTime: { solo: 5 }, conditions: { crossCountry: 3 } })]
    const c = buildLsaProgress(rows, [])[0]
    const items = c.paths[0].items
    expect(items.find((i) => i.id === 'total')?.required).toBe(20)
    expect(items.find((i) => i.id === 'solo')?.met).toBe(true)
    expect(items.find((i) => i.id === 'xc')?.current).toBe(3)
  })
  it('항공기 자격증명 보유자는 5시간(단독 2) 경로 추가', () => {
    const c = buildLsaProgress([e({ vehicleClass: 'lsa', vehicleKind: 'LSA_AIRPLANE', blockTime: 5, pilotingTime: { solo: 2 } })], [cert('조종사 자격증명', '자가용 조종사(PPL)')])[0]
    const pilot = c.paths.find((p) => p.id === 'pilot')
    expect(pilot?.items.every((i) => i.met)).toBe(true)
  })
})

describe('초경량 유인 (세칙 별표 1)', () => {
  it('동력비행장치 20시간·단독 5', () => {
    const c = buildUltralightMannedProgress([e({ vehicleClass: 'ultralight', vehicleKind: 'UL_POWERED', blockTime: 20, pilotingTime: { solo: 5 } })], [])[0]
    expect(c.paths[0].items.every((i) => i.met)).toBe(true)
  })
})

describe('초경량 무인 (세칙 별표 2·3) — 참고 진척도', () => {
  const rows = [
    e({ id: 'a', vehicleClass: 'ultralight', vehicleKind: 'UAS_MULTICOPTER', vehicleId: 'v1', blockTime: 12 }),
    e({ id: 'b', vehicleClass: 'ultralight', vehicleKind: 'UAS_MULTICOPTER', vehicleId: 'v2', blockTime: 4 }),
  ]
  const byId = { v1: '1종', v2: '2종' }
  it('1종 20시간, 2종은 1·2종 합산 10시간, 3종은 1·2·3종 합산 6시간', () => {
    const cards = buildUasProgress(rows, [], byId)
    const c1 = cards.find((c) => c.id === 'uas1-UAS_MULTICOPTER')!
    const c2 = cards.find((c) => c.id === 'uas2-UAS_MULTICOPTER')!
    const c3 = cards.find((c) => c.id === 'uas3-UAS_MULTICOPTER')!
    expect(c1.paths[0].items[0]).toMatchObject({ required: 20, current: 12, met: false })
    expect(c2.paths[0].items[0]).toMatchObject({ required: 10, current: 16, met: true })
    expect(c3.paths[0].items[0]).toMatchObject({ required: 6, current: 16, met: true })
    expect(c1.referenceOnly).toBe(true)
  })
  it('2종 자격 보유 시 1종 15시간 경로', () => {
    const cards = buildUasProgress(rows, [cert('초경량비행장치 조종자증명', '무인멀티콥터 (2종)')], byId)
    const c1 = cards.find((c) => c.id === 'uas1-UAS_MULTICOPTER')!
    expect(c1.paths.find((p) => p.id === 'from2')?.items[0].required).toBe(15)
  })
  it('1종 무인헬리콥터 자격 보유 시 멀티콥터 1종은 10시간', () => {
    const cards = buildUasProgress(rows, [cert('초경량비행장치 조종자증명', '무인헬리콥터 (1종)')], byId)
    expect(cards.find((c) => c.id === 'uas1-UAS_MULTICOPTER')!.paths.find((p) => p.id === 'cross')?.items[0].required).toBe(10)
  })
  it('지도조종자 100시간 · 실기평가조종자 150시간', () => {
    const c = buildUasProgress(rows, [], byId).find((c) => c.id === 'uas-instr-UAS_MULTICOPTER')!
    expect(c.paths[0].items[0].required).toBe(100)
    expect(c.paths[1].items[0].required).toBe(150)
  })
})
