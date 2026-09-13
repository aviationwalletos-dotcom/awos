// 승무시간(누적 비행시간) 법정 한도 계산
// FlightReadinessPanel/CurrencyDashboard의 "비행 적합성" 계산과는 별개로,
// 시행규칙 별표 18(제127조①, 개정 2019. 9. 23.) 기장 1명 편성 기준을 이 파일 하나로 모아 계산합니다.
//   연속 24시간 승무 8h(제1호) · 연속 28일 100h · 연속 365일 1,000h(제2호). 이 셋만 다룹니다.
// [2026-09-10 원문 대조] 예전 "7일 35h"는 별표 18에 없는 값이라 뺐고, "30일"은 별표대로 "28일"로 고쳤습니다.
// [2026-09-13 원문 대조] 로그북으로 계산할 수 없어 뺀 항목:
//   · 제3호 7일 60h·28일 190h — "근무시간"(근무보고~근무 종료)이라 로그북에 값이 없습니다.
//   · 제4호 최소 휴식시간 표 — "비행근무시간"(근무보고~발동기 정지)으로 찾는 13칸 표입니다.
//     로그북에 있는 건 "승무시간"(최초 움직임~정지)뿐이고 항상 비행근무시간보다 짧아서,
//     승무시간으로 표를 찾으면 늘 낮은 칸이 나옵니다(휴식을 덜 요구하는 방향).
//     예전 코드는 이 표를 `blockTime >= 8 ? 12 : 10` 두 칸으로 눌러 놨는데, 실제로는
//     비행근무 10~11h → 13h, 12~13h → 15h 입니다. 화면에는 쓰이지 않았습니다.
//   · 제4호 비고 2 "7일마다 연속 30시간 휴식" — 값은 맞지만 항공운송사업자·항공기사용사업자에게
//     지우는 의무이고, 로그북으로는 "비행 없는 날"까지만 알 수 있어 연속 30시간을 확인할 수 없습니다.
// UI는 DutyTimeLimitCard.tsx에서 담당합니다.

import type { LogbookEntry } from '../types/logbook'
import { daysAgo, parseEntryDate, startOfDay } from './flightReadiness'

export interface DutyLimitCheck {
  /** 창 안에서 누적된 승무시간(시간 단위) */
  used: number
  /** 법정 한도(시간 단위) */
  limit: number
  /** used <= limit 이면 true(GO) */
  met: boolean
}

export interface DutyTimeLimits {
  today: Date
  /** 오늘(당일) 누적 8시간 한도 */
  today8h: DutyLimitCheck
  /** 최근 28일(오늘 포함) 누적 100시간 한도 — 별표 18 제2호 */
  last28d100h: DutyLimitCheck
  /** 최근 365일(오늘 포함) 누적 1,000시간 한도 */
  last365d1000h: DutyLimitCheck
  /** 가장 최근 비행 기록(날짜 기준 최신)의 승무시간. 기록이 없으면 null */
  lastFlightBlockTime: number | null
}

function sumBlockTimeInWindow(entries: LogbookEntry[], start: Date, end: Date): number {
  return entries.reduce((sum, e) => {
    const target = parseEntryDate(e.date)
    if (!target) return sum
    if (target.getTime() < start.getTime() || target.getTime() > end.getTime()) return sum
    return sum + (e.blockTime || 0)
  }, 0)
}

function makeCheck(used: number, limit: number): DutyLimitCheck {
  return { used, limit, met: used <= limit }
}

/**
 * entries를 기준으로 오늘 날짜에 대한 누적 승무시간 법정 한도(하루/28일/365일)와
 * 최소 휴식시간 요건, 최근 7일 내 휴식일 확보 여부를 계산합니다.
 */
export function computeDutyTimeLimits(allEntries: LogbookEntry[]): DutyTimeLimits {
  // 비행경력증명서 이월 기록은 "그날 하루에 963시간을 탔다"가 아니라 과거 전체의 합계다.
  // 기준일이 최근이면 하루 8시간 한도를 바로 넘겨 NO-GO 가 되므로 승무시간 계산에서 뺀다(2026-09-13).
  const entries = allEntries.filter((e) => e.origin !== 'flight_experience_certificate')
  const today = startOfDay(new Date())

  const today8h = makeCheck(sumBlockTimeInWindow(entries, today, today), 8)
  const last28d100h = makeCheck(sumBlockTimeInWindow(entries, daysAgo(today, 27), today), 100)
  const last365d1000h = makeCheck(sumBlockTimeInWindow(entries, daysAgo(today, 364), today), 1000)

  // 가장 최근 비행 기록(날짜 기준 최신) 찾기
  let latestEntry: LogbookEntry | null = null
  let latestDate: Date | null = null
  for (const e of entries) {
    const target = parseEntryDate(e.date)
    if (!target) continue
    if (!latestDate || target.getTime() > latestDate.getTime()) {
      latestDate = target
      latestEntry = e
    }
  }
  const lastFlightBlockTime = latestEntry ? latestEntry.blockTime || 0 : null

  return {
    today,
    today8h,
    last28d100h,
    last365d1000h,
    lastFlightBlockTime,
  }
}
