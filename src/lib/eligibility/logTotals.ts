// 로그북 기록 → 별표 4 응시경력 집계(LogTotals).
//
// 시행규칙 제78조(비행시간의 산정)를 따른다:
//   1. 자격증명 없는 사람(조종연습허가서)의 응시: 단독 또는 교관 동승 시간
//   2. 자가용→사업용(사업용/부조종사→운송용 포함): 가) 단독·교관 동승·기장 시간 + 나) 2인 조종 항공기의 기장 외 조종사 시간
//      + 다) 기장 감독 하 기장임무 시간. 단, 1인 조종 항공기에 기장 외 조종사로 탑승한 시간은 그 2분의 1.
// "총 비행시간(total)"은 블록타임 합계가 아니라 위 산정 규칙으로 인정되는 시간이다.

import type { LogbookEntry } from '../../types/logbook'
import type { LogTotals } from './rules'

const r1 = (v: number) => Math.round(v * 10) / 10

export function buildLogTotals(entries: LogbookEntry[]): LogTotals {
  const t: Record<string, number> = {}
  const add = (k: string, v?: number) => {
    if (v && v > 0) t[k] = (t[k] ?? 0) + v
  }
  for (const e of entries) {
    if (e.origin === 'flight_experience_certificate' && e.certificateApprovalStatus !== 'confirmed') continue
    const p = e.pilotingTime ?? {}
    const c = e.conditions ?? {}
    const pic = p.pic ?? 0
    const dual = p.dualReceived ?? 0
    const solo = p.solo ?? 0
    const picSup = p.picSupervised ?? 0
    // 제78조 제2호 다목 단서: 1인 조종 항공기에서 기장 외 조종사 시간은 1/2
    const sicRaw = p.sic ?? 0
    const sic = e.twoPilotAircraft ? sicRaw : sicRaw * 0.5
    // 인정 총시간: 기장 + 교관동승 + 단독(기장과 중복 기록 시 max) + 감독하 기장임무 + 부기장(산정 후)
    const soloOrPic = Math.max(pic, solo)
    add('total', soloOrPic + dual + picSup + sic)
    add('pic', pic)
    add('sic', sic)
    add('picSupervised', picSup)
    add('solo', solo)
    add('soloXc', c.soloCrossCountry)
    add('xc', c.crossCountry)
    add('picXc', pic > 0 ? c.crossCountry : 0)
    add('picSupervisedXc', picSup > 0 ? c.crossCountry : 0)
    add('instrument', c.actualInstrument)
    add('instrumentTraining', (c.simulatedInstrument ?? 0) + (e.groundTrainerTime ?? 0))
    add('night', c.night)
    add('picNight', pic > 0 ? c.night : 0)
    add('nightTakeoffs', e.nightTakeoffs)
    add('nightLandings', e.nightLandings)
    add('instructionGiven', p.flightInstructor)
    add('dualReceived', dual)
    if (e.vehicleClass === 'lsa') add('lsaTotal', e.blockTime)
  }
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, r1(v)])) as LogTotals
}
