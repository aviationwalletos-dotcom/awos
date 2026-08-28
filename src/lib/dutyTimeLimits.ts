// 승무시간(누적 비행시간) 법정 한도 계산
// FlightReadinessPanel/CurrencyDashboard의 "비행 적합성" 계산과는 별개로,
// 사용자가 요청한 실제 항공안전법 기준(하루/7일/30일/365일 누적 승무시간 한도, 최소 휴식시간)을
// 이 파일 하나로 모아 계산합니다. UI는 DutyTimeLimitCard.tsx에서 담당합니다.

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
  /** 최근 7일(오늘 포함) 누적 35시간 한도 */
  last7d35h: DutyLimitCheck
  /** 최근 30일(오늘 포함) 누적 100시간 한도 */
  last30d100h: DutyLimitCheck
  /** 최근 365일(오늘 포함) 누적 1,000시간 한도 */
  last365d1000h: DutyLimitCheck
  /** 가장 최근 비행 기록(날짜 기준 최신)의 승무시간. 기록이 없으면 null */
  lastFlightBlockTime: number | null
  /** 직전 비행 승무시간을 기준으로 자동 계산된 최소 휴식시간(시간). 기록이 없으면 null */
  requiredRestHours: 10 | 12 | null
  /** 최근 7일(오늘 포함) 안에 비행이 없는 날(24시간 연속 휴식일)이 최소 하루 있었는지 */
  hasWeeklyRestDay: boolean
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
 * entries를 기준으로 오늘 날짜에 대한 누적 승무시간 법정 한도(하루/7일/30일/365일)와
 * 최소 휴식시간 요건, 최근 7일 내 휴식일 확보 여부를 계산합니다.
 */
export function computeDutyTimeLimits(entries: LogbookEntry[]): DutyTimeLimits {
  const today = startOfDay(new Date())

  const today8h = makeCheck(sumBlockTimeInWindow(entries, today, today), 8)
  const last7d35h = makeCheck(sumBlockTimeInWindow(entries, daysAgo(today, 6), today), 35)
  const last30d100h = makeCheck(sumBlockTimeInWindow(entries, daysAgo(today, 29), today), 100)
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
  const requiredRestHours: 10 | 12 | null =
    lastFlightBlockTime === null ? null : lastFlightBlockTime >= 8 ? 12 : 10

  // 최근 7일(오늘 포함) 중 비행 기록이 하루도 없는 날이 있는지
  const weekStart = daysAgo(today, 6)
  const flownDates = new Set<string>()
  for (const e of entries) {
    const target = parseEntryDate(e.date)
    if (!target) continue
    if (target.getTime() >= weekStart.getTime() && target.getTime() <= today.getTime()) {
      flownDates.add(target.toDateString())
    }
  }
  let hasWeeklyRestDay = false
  const cursor = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    if (!flownDates.has(cursor.toDateString())) {
      hasWeeklyRestDay = true
      break
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    today,
    today8h,
    last7d35h,
    last30d100h,
    last365d1000h,
    lastFlightBlockTime,
    requiredRestHours,
    hasWeeklyRestDay,
  }
}
