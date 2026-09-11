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

/**
 * 야간 크로스컨트리 시간 — 입력값이 있으면 그것, 없으면(2026-09-10 이전 기록) PDF 와 같은 규칙으로 배정:
 * 야외를 주간부터 채우고 남는 만큼을 야간으로. 화면·합계·PDF 가 같은 숫자를 보게 한다.
 */
export function nightCrossCountryOf(e: Pick<LogbookEntry, 'conditions'>): number {
  const day = e.conditions?.day ?? 0
  const night = e.conditions?.night ?? 0
  const xc = e.conditions?.crossCountry ?? 0
  const input = e.conditions?.nightCrossCountry
  if (input !== undefined) return Math.max(0, Math.min(input, xc, night))
  // 값이 없으면 min(야간, 야외). 한국항공대 증명서(야간 야외 28.6)와 탈론 798건이 이 규칙으로 정확히 일치(2026-09-11).
  // 예전 "주간부터 배정" 규칙은 27.5 로 1.1 차이가 났다.
  void day
  return Math.max(0, Math.min(night, xc))
}

export function toPilotCertRow(e: LogbookEntry): PilotCertRow {
  const pic = e.pilotingTime?.pic ?? 0
  const picSupervised = e.pilotingTime?.picSupervised ?? 0
  const sic = e.pilotingTime?.sic ?? 0
  const instructor = e.pilotingTime?.flightInstructor ?? 0
  // 별지 36호 "학생조종사" 열 = 기장 시간 없이 교육만 받은 비행(자격증 전, 한정 받기 전 훈련).
  // 자격증·한정이 있는 기종에서 교육받은 비행은 로그북에 Dual + 기장이 같이 적히고 증명서엔 "기장"으로만 간다.
  // 예전엔 Dual 을 그대로 학생조종사에 넣어 기장과 이중으로 잡혔다(2026-09-11 대표 지적).
  const dual = e.pilotingTime?.dualReceived ?? 0
  // 학생조종사 열(8.1.7.6 나 8, 제78조 1호 "교관과 동승" — 단독은 기장):
  //   · 개별 비행: PIC 없이 교육받은 비행이면 Dual 전부, PIC 가 있으면 0(제78조 2호 가 — 기장으로 산정)
  //   · 이월(증명서 합계) 기록: 별지 36호 항등식 소계 = 기장 + 부조종사 + 학생조종사 → 학생조종사 = 소계 − 기장 − 부조종사
  //     (오재헌 1021.9−1001.3=20.6, AeroGuard 69.9−11.7=58.2 로 검증 2026-09-11)
  const isAggregate = e.origin === 'flight_experience_certificate'
  const block = e.blockTime ?? 0
  const student = isAggregate
    ? Math.max(0, Math.round((block - pic - picSupervised - sic) * 10) / 10)
    : pic > 0 ? 0 : dual
  // 소계 = 기장 + 부조종사 + 학생조종사. 교관조종사 시간은 기장 안에 이미 들어 있어 더하지 않는다
  // (오재헌 증명서: 기장 1001.3 · 교관 777.3 · 학생 20.6 · 소계 1021.9 = 기장+학생, 탈론 798건으로 검증 2026-09-11).
  // 교관 시간만 있고 기장 시간이 없는 드문 기록은 소계에 넣는다(안 넣으면 비행이 사라짐).
  const dutyTotal = pic + picSupervised + sic + student + (pic > 0 ? 0 : instructor)

  const day = e.conditions?.day ?? 0
  const night = e.conditions?.night ?? 0
  const xc = e.conditions?.crossCountry ?? 0
  // 야간 야외가 따로 적혀 있으면 그대로, 없으면 주간부터 배정(2026-09-10 이전 기록 호환)
  const nightXc = nightCrossCountryOf(e)
  const dayXc = Math.max(0, Math.min(xc - nightXc, day))
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
    // 증명서 규칙(확인 2026-09-11): 모의비행 = 모의계기 시간(실비행·FTD 모두), 기타 = FTD 등 지상훈련장치 총 시간.
    // 예전엔 모의비행에 FTD 총시간까지 더해 FTD 행이 이중으로 잡혔다.
    instSim: e.conditions?.simulatedInstrument ?? 0,
    other: (e.categoryHours?.otherHours ?? 0) + (e.groundTrainerTime ?? 0),
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
