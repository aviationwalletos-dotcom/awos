import { describe, expect, it } from 'vitest'

import { reconcileCertTotals, sanityNotes } from './flightExperienceTotals'

// 오재헌 · 한국항공대 · U-2025-371 (2025-12-11) — "계" 행 그대로
const OH_2025 = {
  landings: 667, pic: 942.8, picSupervised: 0, sic: 0, instructor: 720.0, student: 20.6, engineer: 0, subtotal: 963.4,
  dayVfrPic: 572.3, dayVfrOther: 19.9, dayXcPic: 318.5, dayXcOther: 0, nightVfrPic: 23.4, nightVfrOther: 0.7, nightXcPic: 28.6, nightXcOther: 0,
  instActual: 52.3, instSim: 110.5, other: 263.4,
}

// 채지훈 · U-2026-121 (2026-04-29)
const CHAE_2026 = {
  landings: 177, pic: 113.6, picSupervised: 0, sic: 0, instructor: 0, student: 29.0, engineer: 0, subtotal: 142.6,
  dayVfrPic: 50.1, dayVfrOther: 26.9, dayXcPic: 55.4, dayXcOther: 2.1, nightVfrPic: 0, nightVfrOther: 0, nightXcPic: 8.1, nightXcOther: 0,
  instActual: 15.3, instSim: 76.1, other: 26.0,
}

describe('reconcileCertTotals — 별지 36호 계 행', () => {
  it('오재헌 2025-12-11: 합산·검산이 맞고 값이 채워진다', () => {
    const { fields, notes } = reconcileCertTotals({ certTotals: OH_2025, conditionDay: 0, crossCountry: 347.8, actualInstrument: 110.5 })
    expect(fields.blockTime).toBe(963.4)
    expect(fields.picTime).toBe(942.8)
    expect(fields.flightInstructorTime).toBe(720.0)
    expect(fields.conditionDay).toBe(910.7)
    expect(fields.conditionNight).toBe(52.7)
    expect(fields.crossCountry).toBe(347.1) // AI 직접값 347.8 을 덮어씀
    expect(fields.nightCrossCountry).toBe(28.6)
    expect(fields.actualInstrument).toBe(52.3)
    expect(fields.simulatedInstrument).toBe(110.5)
    expect(fields.groundTrainerTime).toBe(263.4)
    expect(fields.dayLandings).toBe(667)
    expect(fields.certTotals).toBeUndefined()
    expect(notes[0]).toMatch(/검산.*맞았어요/)
  })

  it('채지훈 2026-04-29', () => {
    const { fields } = reconcileCertTotals({ certTotals: CHAE_2026 })
    expect(fields.conditionDay).toBe(134.5)
    expect(fields.conditionNight).toBe(8.1)
    expect(fields.crossCountry).toBe(65.6)
    expect(fields.nightCrossCountry).toBe(8.1)
    expect(fields.picTime).toBe(113.6)
    expect(fields.flightInstructorTime).toBe(0)
    expect(fields.groundTrainerTime).toBe(26.0)
  })

  it('교관·학생이 바뀌어 베껴져도 되돌린다', () => {
    const swapped = { ...OH_2025, instructor: 20.6, student: 720.0 }
    const { fields, notes } = reconcileCertTotals({ certTotals: swapped })
    expect(fields.flightInstructorTime).toBe(720.0)
    expect(notes.some((n) => n.includes('바뀌어 읽혀서'))).toBe(true)
  })

  it('숫자가 문자열로 와도 읽는다', () => {
    const asStrings = Object.fromEntries(Object.entries(OH_2025).map(([k, v]) => [k, String(v)]))
    const { fields } = reconcileCertTotals({ certTotals: asStrings })
    expect(fields.blockTime).toBe(963.4)
    expect(fields.conditionDay).toBe(910.7)
  })

  it('조건별 검산만 틀리면 임무별만 채우고 경고한다', () => {
    const bad = { ...OH_2025, dayVfrPic: 500 } // 주간+야간 ≠ 소계
    const { fields, notes } = reconcileCertTotals({ certTotals: bad, conditionDay: 1 })
    expect(fields.picTime).toBe(942.8)
    expect(fields.conditionDay).toBe(1) // AI 직접값 유지
    expect(notes.some((n) => n.includes('주간'))).toBe(true)
  })

  it('한국 서식이 아니면(certTotals 없음) 아무것도 바꾸지 않는다', () => {
    const { fields, notes } = reconcileCertTotals({ blockTime: 69.9, dualReceived: 58.2, picTime: 11.7 })
    expect(fields).toEqual({ blockTime: 69.9, dualReceived: 58.2, picTime: 11.7 })
    expect(notes).toEqual([])
  })
})

describe('sanityNotes — 공통 검산', () => {
  it('AeroGuard 증명서(미국식)는 경고 없음', () => {
    const notes = sanityNotes({ blockTime: 69.9, singleEngineLand: 69.9, dualReceived: 58.2, crossCountry: 16.3, picTime: 11.7, simulatedInstrument: 3.5, conditionNight: 3.4 })
    expect(notes).toEqual([])
  })

  it('계기 세 열이 한 칸 밀리면(모의계기 = 시뮬레이터) 경고', () => {
    const notes = sanityNotes({ blockTime: 963.4, actualInstrument: 110.5, simulatedInstrument: 263.4, groundTrainerTime: 263.4 })
    expect(notes.some((n) => n.includes('밀려'))).toBe(true)
  })

  it('실제+모의계기가 총시간(시뮬 포함)을 넘으면 경고', () => {
    const notes = sanityNotes({ blockTime: 100, actualInstrument: 80, simulatedInstrument: 50, groundTrainerTime: 10 })
    expect(notes.some((n) => n.includes('실제계기'))).toBe(true)
  })

  it('교관 > 기장이면 경고', () => {
    expect(sanityNotes({ picTime: 100, flightInstructorTime: 120 }).length).toBe(1)
  })
})
