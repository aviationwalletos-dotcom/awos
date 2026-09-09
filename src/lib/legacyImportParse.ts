// 엑셀/CSV 이관 파일의 날짜·시간 칸을 읽는 공용 파서.
//
// 왜 따로 뺐나: LegacyExcelImport.tsx 안에 있던 파싱 규칙은 화면 없이는 검증할 수 없었다.
// 미국 훈련 기록처럼 서식이 다른 파일이 계속 들어오므로, 규칙은 순수 함수로 두고 단위 테스트로 고정한다.
//
// 두 가지를 다룬다.
//  1) 날짜 순서: 03/04/2025 가 3월 4일(미국식)인지 4월 3일인지 파일 한 개 단위로 판정한다.
//  2) 시간 단위: 1.5(시간)인지 90(분)인지 열 단위로 판정한다.
// 둘 다 "추정 → 화면에 표시 → 사용자가 바꿀 수 있음" 이 원칙이다. 조용히 바꾸지 않는다.

import { roundToTenth } from './hours'

/** 숫자만 3칸인 날짜에서 앞의 두 칸 순서. mdy = 미국식(월/일/년) */
export type DateOrder = 'mdy' | 'dmy'

/** 시간 열의 기록 단위. minutes 면 60으로 나눠 시간으로 바꾼다. */
export type TimeUnit = 'hours' | 'minutes'

const MONTH_ABBR: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** 두 자리 연도 해석: 00~69 는 2000년대, 70~99 는 1900년대(통용 규칙). */
function expandYear(raw: string): number {
  const n = Number(raw)
  if (raw.length === 2) return n <= 69 ? 2000 + n : 1900 + n
  return n
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * 엑셀 날짜 일련번호(1900 체계). CSV 로 내보내면 날짜가 45838 같은 숫자로만 남는 경우가 있다.
 * 1960~2079 범위(22000~65000)만 날짜로 본다 — 그 밖의 숫자는 날짜가 아닐 확률이 높다.
 */
function parseExcelSerialDate(s: string): string | null {
  if (!/^\d{5}$/.test(s)) return null
  const serial = Number(s)
  if (serial < 22000 || serial > 65000) return null
  // 엑셀은 1900-02-29(존재하지 않는 날)을 세므로 1899-12-30 을 기준으로 잡으면 맞아떨어진다.
  const base = Date.UTC(1899, 11, 30)
  const d = new Date(base + serial * 86400000)
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

const NUMERIC_TRIPLE = /^(\d{1,4})[-./](\d{1,2})[-./](\d{2}|\d{4})$/

/**
 * 날짜 칸 하나를 YYYY-MM-DD 로. 읽지 못하면 null.
 * order 는 숫자 3칸이고 앞 두 칸이 모두 12 이하일 때만 쓰인다(그 밖에는 값으로 순서가 정해진다).
 */
export function parseDateValue(raw: unknown, order: DateOrder = 'mdy'): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null

  // YYYY-MM-DD / YYYY.M.D
  const isoMatch = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/)
  if (isoMatch) return iso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))

  // 01 Jul 25 / 1-Jul-2025 / 01 July, 2025
  const dMonY = s.match(/^(\d{1,2})[\s.-]+([A-Za-z]{3,9})[\s.,-]+(\d{2}|\d{4})$/)
  if (dMonY) {
    const month = MONTH_ABBR[dMonY[2].slice(0, 3).toLowerCase()]
    if (month) return iso(expandYear(dMonY[3]), month, Number(dMonY[1]))
  }

  // Jul 01 2025 / July 1, 2025 (미국식 표기)
  const monDY = s.match(/^([A-Za-z]{3,9})[\s.-]+(\d{1,2})[\s.,-]+(\d{2}|\d{4})$/)
  if (monDY) {
    const month = MONTH_ABBR[monDY[1].slice(0, 3).toLowerCase()]
    if (month) return iso(expandYear(monDY[3]), month, Number(monDY[2]))
  }

  // 숫자 3칸: 7/1/25, 03/04/2025, 1.7.2025
  const triple = s.match(NUMERIC_TRIPLE)
  if (triple) {
    const a = Number(triple[1])
    const b = Number(triple[2])
    const year = expandYear(triple[3])
    // 값 자체로 순서가 정해지는 경우를 먼저 본다(13 이상은 월이 될 수 없다).
    if (a > 12 && b <= 12) return iso(year, b, a)
    if (b > 12 && a <= 12) return iso(year, a, b)
    return order === 'dmy' ? iso(year, b, a) : iso(year, a, b)
  }

  const serial = parseExcelSerialDate(s)
  if (serial) return serial

  // 마지막 수단. 브라우저 Date 파서는 서식별 편차가 있어 위 규칙으로 다 걸러낸 뒤에만 쓴다.
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    return iso(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
  }
  return null
}

/**
 * 날짜 열 전체를 훑어 월/일 순서를 정한다.
 * ambiguous 가 true 면 값만으로는 정할 수 없어 기본값(미국식)을 쓴 것이므로 화면에서 사용자에게 물어본다.
 */
export function detectDateOrder(values: readonly string[]): { order: DateOrder; ambiguous: boolean } {
  let firstOver12 = 0
  let secondOver12 = 0
  let tripleCount = 0

  for (const value of values) {
    const m = String(value ?? '').trim().match(NUMERIC_TRIPLE)
    if (!m) continue
    if (m[1].length === 4) continue // YYYY-MM-DD 는 순서 논쟁 대상이 아니다
    tripleCount += 1
    if (Number(m[1]) > 12) firstOver12 += 1
    if (Number(m[2]) > 12) secondOver12 += 1
  }

  if (tripleCount === 0) return { order: 'mdy', ambiguous: false }
  // 한쪽만 13 이상이 나오면 순서가 확정된다.
  if (firstOver12 > 0 && secondOver12 === 0) return { order: 'dmy', ambiguous: false }
  if (secondOver12 > 0 && firstOver12 === 0) return { order: 'mdy', ambiguous: false }
  // 둘 다 12 이하뿐이거나(예: 3/4/2025 만 있음) 서로 모순되면 판정 불가.
  return { order: 'mdy', ambiguous: true }
}

const HMS = /^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/
const H_AND_M = /^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|시간)\s*(?:(\d+(?:\.\d+)?)\s*(?:m|min|mins|분)?)?$/i
const M_ONLY = /^(\d+(?:\.\d+)?)\s*(?:m|min|mins|분)$/i

/**
 * 시간 칸 하나를 "시간(소수)"으로. 읽지 못하면 undefined.
 * 1:30 · 1h30m · 1시간 30분 · 90분 은 표기 자체에 단위가 있어 unit 과 무관하게 그대로 읽는다.
 * 단위 없는 순수 숫자만 unit 을 따른다.
 * 앱 규약대로 0.1시간 단위로 반올림한다.
 */
export function parseDurationValue(raw: unknown, unit: TimeUnit = 'hours'): number | undefined {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s) return undefined

  const hms = s.match(HMS)
  if (hms) {
    const hours = Number(hms[1]) + Number(hms[2]) / 60 + (hms[3] ? Number(hms[3]) / 3600 : 0)
    return roundToTenth(hours)
  }

  const hAndM = s.match(H_AND_M)
  if (hAndM) {
    return roundToTenth(Number(hAndM[1]) + (hAndM[2] ? Number(hAndM[2]) / 60 : 0))
  }

  const mOnly = s.match(M_ONLY)
  if (mOnly) return roundToTenth(Number(mOnly[1]) / 60)

  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  return unit === 'minutes' ? roundToTenth(n / 60) : n
}

/**
 * 시간 열이 분 단위로 적혀 있는지 판정한다.
 *
 * 근거: 한 번의 비행에서 블록타임이 25시간을 넘는 일은 없다. 그런데 25 이상 정수만 나오면
 * 그 열은 분(90, 135...)일 가능성이 매우 높다. 반대로 소수점이 하나라도 있으면 시간 표기다
 * (로그북에서 시간은 0.1 단위 소수로 쓴다).
 * 표기에 단위가 붙은 값(1:30, 90분)은 판정에서 제외한다 — 어차피 값 자체로 읽힌다.
 */
export function detectTimeUnit(values: readonly string[]): TimeUnit {
  let plainCount = 0
  let max = 0

  for (const value of values) {
    const s = String(value ?? '').trim().replace(/,/g, '')
    if (!s) continue
    if (HMS.test(s) || H_AND_M.test(s) || M_ONLY.test(s)) return 'hours'
    const n = Number(s)
    if (!Number.isFinite(n) || n <= 0) continue
    if (!Number.isInteger(n)) return 'hours' // 소수가 보이면 시간 표기로 확정
    plainCount += 1
    if (n > max) max = n
  }

  // 표본이 너무 적으면 섣불리 바꾸지 않는다.
  if (plainCount < 3) return 'hours'
  return max >= 25 ? 'minutes' : 'hours'
}

/** 착륙·계기접근처럼 "횟수"인 칸. 시간 단위 변환을 적용하면 안 되므로 따로 둔다. */
export function parseCountValue(raw: unknown): number | undefined {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s) return undefined
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(n)
}
