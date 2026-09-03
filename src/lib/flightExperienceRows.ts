// 비행경력증명서(시행규칙 별지 제36호서식) 행 계산 — HTML/PDF 출력이 공유한다.
//
// 로그북 필드 → 서식 열 매핑(근사치는 출력물 하단 주에 명시):
//   기장 = pilotingTime.pic · 감독하 = picSupervised · 기장외 = sic · 교관 = flightInstructor · 학생 = dualReceived
//   주/야간 × 시계/야외: conditions.day/night 와 crossCountry 로 분해. 야외는 주간부터 배정하고 남는 만큼 야간으로 본다.
//   "기장" 열과 "기장 외" 열은 그 비행의 PIC 시간 유무로 가른다.
//   계기 실제 = actualInstrument · 모의 = simulatedInstrument + groundTrainerTime

import type { LogbookEntry } from '../types/logbook'

export function dateKr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : iso
}

export interface PilotCertRow {
  date: string
  type: string
  landings: number
  pic: number
  picSupervised: number
  sic: number
  instructor: number
  student: number
  engineer: number
  dutyTotal: number
  dayVfrPic: number
  dayVfrOther: number
  dayXcPic: number
  dayXcOther: number
  nightVfrPic: number
  nightVfrOther: number
  nightXcPic: number
  nightXcOther: number
  instActual: number
  instSim: number
  other: number
  total: number
}

export function toPilotCertRow(e: LogbookEntry): PilotCertRow {
  const pic = e.pilotingTime?.pic ?? 0
  const picSupervised = e.pilotingTime?.picSupervised ?? 0
  const sic = e.pilotingTime?.sic ?? 0
  const instructor = e.pilotingTime?.flightInstructor ?? 0
  const student = e.pilotingTime?.dualReceived ?? 0
  const dutyTotal = pic + picSupervised + sic + instructor + student

  const day = e.conditions?.day ?? 0
  const night = e.conditions?.night ?? 0
  const xc = e.conditions?.crossCountry ?? 0
  const dayXc = Math.min(xc, day)
  const nightXc = Math.max(0, Math.min(xc - dayXc, night))
  const dayVfr = Math.max(0, day - dayXc)
  const nightVfr = Math.max(0, night - nightXc)
  const asPic = pic > 0

  return {
    date: e.date,
    type: e.aircraftType,
    landings: (e.dayLandings ?? 0) + (e.nightLandings ?? 0),
    pic,
    picSupervised,
    sic,
    instructor,
    student,
    engineer: 0,
    dutyTotal,
    dayVfrPic: asPic ? dayVfr : 0,
    dayVfrOther: asPic ? 0 : dayVfr,
    dayXcPic: asPic ? dayXc : 0,
    dayXcOther: asPic ? 0 : dayXc,
    nightVfrPic: asPic ? nightVfr : 0,
    nightVfrOther: asPic ? 0 : nightVfr,
    nightXcPic: asPic ? nightXc : 0,
    nightXcOther: asPic ? 0 : nightXc,
    instActual: e.conditions?.actualInstrument ?? 0,
    instSim: (e.conditions?.simulatedInstrument ?? 0) + (e.groundTrainerTime ?? 0),
    other: e.categoryHours?.otherHours ?? 0,
    total: e.blockTime,
  }
}

export const PILOT_CERT_NUM_KEYS: (keyof PilotCertRow)[] = [
  'landings', 'pic', 'picSupervised', 'sic', 'instructor', 'student', 'engineer', 'dutyTotal',
  'dayVfrPic', 'dayVfrOther', 'dayXcPic', 'dayXcOther', 'nightVfrPic', 'nightVfrOther', 'nightXcPic', 'nightXcOther',
  'instActual', 'instSim', 'other', 'total',
]


export function buildPilotCertRows(entries: LogbookEntry[]): PilotCertRow[] {
  return [...entries]
    .filter((e) => !(e.origin === 'flight_experience_certificate' && e.certificateApprovalStatus !== 'confirmed'))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map(toPilotCertRow)
}

export function sumPilotCertRows(rows: PilotCertRow[]): Record<(typeof PILOT_CERT_NUM_KEYS)[number], number> {
  const sum = (k: keyof PilotCertRow) => Math.round(rows.reduce((s, r) => s + (r[k] as number), 0) * 10) / 10
  return Object.fromEntries(PILOT_CERT_NUM_KEYS.map((k) => [k, sum(k)])) as Record<(typeof PILOT_CERT_NUM_KEYS)[number], number>
}
