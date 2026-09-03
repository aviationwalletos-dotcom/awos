import { describe, expect, it } from 'vitest'

import { computeLsaCompliance, computeUltralightCompliance } from './roleCompliance'
import {
  countEntriesByTrack,
  countUntaggedEntries,
  entryTrack,
  filterEntriesByTrack,
  inferVehicleClass,
  parsePilotTracks,
  tracksFromLegacyRole,
} from './tracks'
import type { LogbookEntry } from '../types/logbook'

function entry(partial: Partial<LogbookEntry> & { aircraftType: string; blockTime: number }): LogbookEntry {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-08-01',
    departure: 'RKTL',
    arrival: 'RKTL',
    flightCategory: '주간',
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  }
}

describe('버그 1 회귀 — 항공기 시간이 초경량 트랙으로 새지 않는다', () => {
  const c172 = entry({ aircraftType: 'C172S', aircraftIdentification: 'HL1131', blockTime: 1.5 })
  const da42 = entry({ aircraftType: 'DA42', aircraftIdentification: 'HL2035', blockTime: 2.0 })
  const drone = entry({ aircraftType: 'DJI Matrice 300', blockTime: 0.5, vehicleClass: 'ultralight', vehicleKind: 'UAS_MULTICOPTER' })
  const all = [c172, da42, drone]

  it('태그 없는 훈련기 기록은 항공기로 추정된다', () => {
    expect(inferVehicleClass(c172)).toBe('aircraft')
    expect(inferVehicleClass(da42)).toBe('aircraft')
    expect(entryTrack(drone)).toBe('ultralight')
  })

  it('초경량 트랙 필터에 C172·DA42가 섞이지 않는다', () => {
    const ul = filterEntriesByTrack(all, 'ultralight')
    expect(ul).toHaveLength(1)
    expect(ul[0].aircraftType).toBe('DJI Matrice 300')
  })

  it('지도조종자 100시간 진척도는 초경량 기록만 합산한다', () => {
    const items = computeUltralightCompliance(filterEntriesByTrack(all, 'ultralight'))
    const prog = items.find((i) => i.key === 'uas_instructor_hours')?.progress
    expect(prog?.value).toBe(0.5) // 3.5가 아니라 0.5
  })

  it('트랙별 건수와 미분류 건수를 센다', () => {
    expect(countEntriesByTrack(all)).toEqual({ aircraft: 2, lsa: 0, ultralight: 1 })
    expect(countUntaggedEntries(all)).toBe(2) // c172·da42는 추정
  })
})

describe('기존 역할 → 트랙 이관', () => {
  it('pilot → 항공기, drone_pilot → 초경량, 미설정 → 항공기, 비조종 직군 → 없음', () => {
    expect(tracksFromLegacyRole('pilot')).toEqual(['aircraft'])
    expect(tracksFromLegacyRole('drone_pilot')).toEqual(['ultralight'])
    expect(tracksFromLegacyRole(undefined)).toEqual(['aircraft'])
    expect(tracksFromLegacyRole('atc')).toEqual([])
  })

  it('parsePilotTracks는 잘못된 값을 걸러내고 순서를 정규화한다', () => {
    expect(parsePilotTracks(['ultralight', 'bogus', 'aircraft', 'aircraft'])).toEqual(['aircraft', 'ultralight'])
    expect(parsePilotTracks('lsa,aircraft')).toEqual(['aircraft', 'lsa'])
    expect(parsePilotTracks(null)).toEqual([])
  })
})

describe('경량항공기 응시경력', () => {
  it('총 20시간·단독 5시간·야외 5시간을 따로 판정한다', () => {
    const e = [
      entry({ aircraftType: '타면조종형', blockTime: 12, vehicleClass: 'lsa', pilotingTime: { solo: 3 }, conditions: { crossCountry: 2 } }),
      entry({ aircraftType: '타면조종형', blockTime: 9, vehicleClass: 'lsa', pilotingTime: { solo: 2.5 }, conditions: { crossCountry: 3.5 } }),
    ]
    const items = computeLsaCompliance(e)
    expect(items.find((i) => i.key === 'lsa_licence_hours')?.status).toBe('met') // 21
    expect(items.find((i) => i.key === 'lsa_solo')?.status).toBe('met') // 5.5
    expect(items.find((i) => i.key === 'lsa_xc')?.status).toBe('met') // 5.5
  })
})
