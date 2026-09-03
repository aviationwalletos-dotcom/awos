import { describe, expect, it } from 'vitest'

import { hoursToMinutes, minutesToHours } from '../components/logbook/UltralightEntryForm'
import { computeUltralightCompliance } from './roleCompliance'
import type { LogbookEntry } from '../types/logbook'
import { inferUasClass, isInspectionValidOn } from '../types/vehicle'
import type { Vehicle } from '../types/vehicle'

function entry(p: Partial<LogbookEntry> & { blockTime: number }): LogbookEntry {
  return { id: Math.random().toString(36).slice(2), date: '2026-08-01', departure: '김천', arrival: '김천', aircraftType: 'M300', flightCategory: '주간', vehicleClass: 'ultralight', vehicleKind: 'UAS_MULTICOPTER', createdAt: 0, updatedAt: 0, ...p }
}
const veh = (p: Partial<Vehicle>): Vehicle => ({ id: 'v1', kindKey: 'UAS_MULTICOPTER', model: 'M300', createdAt: 0, updatedAt: 0, ...p })

describe('분 ↔ 시간 (별지 제2호 기재요령 7)', () => {
  it('48분 → 0.8, 둘째자리 버림', () => {
    expect(minutesToHours(48)).toBe(0.8)
    expect(minutesToHours(59)).toBe(0.9) // 0.983 → 0.9
    expect(minutesToHours(60)).toBe(1.0)
  })
  it('역변환은 반올림', () => {
    expect(hoursToMinutes(0.8)).toBe(48)
    expect(hoursToMinutes(undefined)).toBe('')
  })
})

describe('무인 종 판정 (별표 2 중량 기준)', () => {
  it('MTOW 경계값', () => {
    expect(inferUasClass(30)).toBe('1종')
    expect(inferUasClass(25)).toBe('2종')
    expect(inferUasClass(7)).toBe('3종')
    expect(inferUasClass(2)).toBe('4종')
    expect(inferUasClass(0.2)).toBe('비대상(250g 이하)')
  })
})

describe('인증 만료 기체 비행 제외 (기재요령 주의사항 2)', () => {
  it('만료일 이후 비행은 유효하지 않다, 면제 기체는 항상 유효', () => {
    const v = veh({ inspectionValidUntil: '2026-06-30' })
    expect(isInspectionValidOn(v, '2026-06-30')).toBe(true)
    expect(isInspectionValidOn(v, '2026-07-01')).toBe(false)
    expect(isInspectionValidOn(veh({ inspectionExempt: true }), '2030-01-01')).toBe(true)
    expect(isInspectionValidOn(undefined, '2030-01-01')).toBe(true)
  })

  it('지도조종자 누적시간에서 만료 후 비행이 빠진다', () => {
    const v = veh({ inspectionValidUntil: '2026-06-30' })
    const entries = [
      entry({ date: '2026-06-01', blockTime: 2.0, vehicleId: 'v1' }),
      entry({ date: '2026-07-15', blockTime: 3.0, vehicleId: 'v1' }), // 제외
    ]
    const items = computeUltralightCompliance(entries, [v])
    expect(items.find((i) => i.key === 'uas_instructor_hours')?.progress?.value).toBe(2.0)
    expect(items.find((i) => i.key === 'airworthiness')?.badgeLabel).toBe('1건 경력 제외')
  })
})
