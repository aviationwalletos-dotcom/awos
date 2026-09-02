import { AlertTriangle, FileSpreadsheet, Upload } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import type {
  CategoryHours,
  FlightConditionHours,
  LogbookEntryInput,
  PilotingTime,
} from '../../types/logbook'

import { Button } from '../Button'
import { FLIGHT_CATEGORIES } from '../../types/logbook'

// SheetJS(xlsx)는 무겁고(수백 KB) 엑셀 가져오기를 실제로 사용할 때만 필요하므로, 파일 파싱 시점에
// 동적 import()로 지연 로드한다. 이렇게 하면 앱 첫 로딩 번들에서 xlsx가 빠져(별도 청크로 분리),
// 대부분의 사용자(특히 모바일 첫 방문)가 훨씬 빠르게 앱을 열 수 있다. CDN에는 의존하지 않는다.

type MappableField =
  | 'ignore'
  | 'date'
  | 'departure'
  | 'arrival'
  | 'aircraftType'
  | 'aircraftIdentification'
  | 'blockTime'
  | 'dayLandings'
  | 'nightLandings'
  | 'singleEngineTime'
  | 'multiEngineTime'
  | 'crossCountryTime'
  | 'conditionDayTime'
  | 'conditionNightTime'
  | 'actualInstrumentTime'
  | 'simulatedInstrumentTime'
  | 'groundTrainerTime'
  | 'picTime'
  | 'sicTime'
  | 'dualReceivedTime'
  | 'flightInstructorTime'
  | 'instrumentApproaches'

const FIELD_OPTIONS: { value: MappableField; label: string }[] = [
  { value: 'ignore', label: '사용 안 함' },
  { value: 'date', label: '날짜' },
  { value: 'departure', label: '출발지' },
  { value: 'arrival', label: '도착지' },
  { value: 'aircraftType', label: '기종' },
  { value: 'aircraftIdentification', label: '등록번호 / 테일넘버' },
  { value: 'blockTime', label: '블록타임(총 시간)' },
  { value: 'dayLandings', label: '주간 이착륙 횟수' },
  { value: 'nightLandings', label: '야간 이착륙 횟수' },
  { value: 'singleEngineTime', label: '단발(S/E) 비행시간' },
  { value: 'multiEngineTime', label: '다발(M/E) 비행시간' },
  { value: 'crossCountryTime', label: '크로스컨트리(XC) 시간' },
  { value: 'conditionDayTime', label: '주간 비행시간' },
  { value: 'conditionNightTime', label: '야간 비행시간' },
  { value: 'actualInstrumentTime', label: '실제계기 시간' },
  { value: 'simulatedInstrumentTime', label: '모의계기 시간' },
  { value: 'groundTrainerTime', label: '지상훈련장비(시뮬레이터) 시간' },
  { value: 'picTime', label: 'PIC(기장) 시간' },
  { value: 'sicTime', label: 'SIC(부기장) 시간' },
  { value: 'dualReceivedTime', label: '교육받은 시간(DUAL)' },
  { value: 'flightInstructorTime', label: '비행교관 탑승 시간' },
  { value: 'instrumentApproaches', label: '계기접근 횟수' },
]

// 자동 컬럼 매핑에 쓰이는 유사어 표(소문자/공백/기호 제거 후 비교). 우선순위 순으로 검사합니다.
// 실제 조종사 로그북 엑셀 내보내기(예: ETA/탈론 로그 계열 서식)의 원문 헤더도 포함되어 있습니다.
//
// exactOnly: 헤더 전체가 완전히 일치할 때만 매칭을 허용하는 짧고 모호한 유사어입니다.
// 예를 들어 "pic"은 "PIC/IP"(비행 구분 역할 텍스트 열, 정규화 시 "picip")처럼 실제로는 다른 의미의
// 헤더에도 부분 문자열로 포함될 수 있어, 일반 fallback(부분 포함) 매칭에서는 제외하고 완전 일치일
// 때만 사용합니다. "PIC"(Type of Piloting 그룹의 실제 PIC 시간 숫자 열)는 정규화 후 정확히 "pic"이
// 되므로 완전 일치로는 정상적으로 매칭됩니다.
const FIELD_SYNONYMS: { field: MappableField; synonyms: string[]; exactOnly?: string[] }[] = [
  { field: 'date', synonyms: ['date', '날짜', '일자', 'dt'] },
  { field: 'departure', synonyms: [`from`, 'departure', 'depairport', '출발', '출발지', '출발공항', 'dep'] },
  { field: 'arrival', synonyms: [`to`, 'arrival', 'arrairport', '도착', '도착지', '도착공항', 'arr'] },
  {
    field: 'aircraftType',
    synonyms: [
      'aircrafttype', 'type', 'makemodel', 'aircraftmodel', 'model', 'aircraft', 'resourcetype',
      '기종', '기체', '항공기',
    ],
  },
  {
    field: 'aircraftIdentification',
    synonyms: [
      'tailnumber', 'tailno', 'registration', 'regno', 'aircraftid', 'ident', 'resource',
      '등록번호', '테일넘버', '기체번호',
    ],
  },
  {
    field: 'blockTime',
    synonyms: [
      'totalduration', 'blocktime', 'totaltime', 'total', 'duration', 'flightduration',
      '블록타임', '총시간', '총비행시간', '비행시간',
    ],
  },
  {
    field: 'dayLandings',
    synonyms: ['daylandings', 'dayldg', 'ldgday', '주간이착륙', '주간착륙', '주간이착륙횟수'],
  },
  {
    field: 'nightLandings',
    synonyms: ['nightlandings', 'nightldg', 'ldgnight', '야간이착륙', '야간착륙', '야간이착륙횟수'],
  },
  { field: 'singleEngineTime', synonyms: ['se', 'singleengineland', 'singleengine', '단발', '단발시간'] },
  { field: 'multiEngineTime', synonyms: ['me', 'multiengineland', 'multiengine', '다발', '다발시간'] },
  { field: 'crossCountryTime', synonyms: ['xc', 'crosscountry', '크로스컨트리', '장거리비행'] },
  { field: 'conditionDayTime', synonyms: ['day', '주간비행시간', '주간시간'] },
  { field: 'conditionNightTime', synonyms: ['night', '야간비행시간', '야간시간'] },
  { field: 'actualInstrumentTime', synonyms: ['actinst', 'actualinstrument', '실제계기', '실제계기시간'] },
  { field: 'simulatedInstrumentTime', synonyms: ['siminst', 'simulatedinstrument', '모의계기', '모의계기시간'] },
  {
    field: 'groundTrainerTime',
    synonyms: ['flightsim', 'groundtrainer', 'ftd', '지상훈련', '지상훈련장비', '시뮬레이터시간'],
  },
  { field: 'picTime', synonyms: ['pictime', '기장시간'], exactOnly: ['pic'] },
  { field: 'sicTime', synonyms: ['sictime', '부기장시간'], exactOnly: ['sic'] },
  { field: 'dualReceivedTime', synonyms: ['dualrec', 'dualreceived', 'dual', '교육받은시간', '듀얼시간'] },
  { field: 'flightInstructorTime', synonyms: ['flightinst', 'flightinstructor', '교관시간', '비행교관시간'] },
  {
    field: 'instrumentApproaches',
    synonyms: ['approaches', 'apch', 'instrumentapproaches', '계기접근', '접근횟수', '계기접근횟수'],
  },
]

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[\s._\-/()]/g, '')
}

function guessField(header: string): MappableField {
  const normalized = normalizeHeader(header)
  if (!normalized) return 'ignore'
  // 1단계: 완전 일치(synonyms + exactOnly)만 검사합니다. 짧고 모호한 유사어(예: "pic", "sic")는
  // exactOnly에만 있어 이 단계에서 정상적으로 매칭됩니다.
  for (const { field, synonyms, exactOnly } of FIELD_SYNONYMS) {
    if (synonyms.some((s) => normalized === s)) return field
    if (exactOnly?.some((s) => normalized === s)) return field
  }
  // 2단계: 부분 문자열 포함(fallback) 매칭입니다. exactOnly 유사어는 여기서 제외되어, "PIC/IP"처럼
  // "pic"을 부분 문자열로 포함하지만 실제로는 다른 의미인 헤더가 잘못 매칭되지 않도록 합니다.
  for (const { field, synonyms } of FIELD_SYNONYMS) {
    if (synonyms.some((s) => normalized.includes(s))) return field
  }
  return 'ignore'
}

const MONTH_ABBR: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function parseDateValue(raw: string): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const iso = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const mdy = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/)
  if (mdy) {
    const [, m, d, y] = mdy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // 실제 조종사 로그북 엑셀 내보내기에서 흔한 "01 Jul 25" / "01 Jul 2025" 형식(일 월(약어) 연도).
  // 브라우저별 Date 파서 편차를 피하기 위해 명시적으로 처리합니다.
  const dMonY = s.match(/^(\d{1,2})[\s.-]+([A-Za-z]{3,9})[\s.,-]+(\d{2}|\d{4})$/)
  if (dMonY) {
    const [, d, monRaw, yRaw] = dMonY
    const month = MONTH_ABBR[monRaw.slice(0, 3).toLowerCase()]
    if (month) {
      const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw)
      return `${year}-${String(month).padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

function parseNumberValue(raw: string): number | undefined {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

// 실제 조종사 로그북 엑셀 서식은 헤더가 첫 행이 아니거나(예: 기관명/기간 등 안내 행이 앞에 있음),
// 필드명이 여러 행에 걸쳐 계층적으로 표기되는 경우가 있습니다(예: "LDG" 아래 "DAY"/"NIGHT").
// 유사어 매칭 점수가 가장 높은 행을 실제 헤더 행으로 추정하고, 바로 아래 행이 보조 라벨처럼
// 보이면 합쳐서 컬럼 헤더 문자열로 사용합니다.
function scoreHeaderRow(cells: string[]): number {
  let score = 0
  for (const cell of cells) {
    const normalized = normalizeHeader(cell)
    if (!normalized) continue
    if (
      FIELD_SYNONYMS.some(
        ({ synonyms, exactOnly }) => synonyms.includes(normalized) || (exactOnly?.includes(normalized) ?? false),
      )
    ) {
      score += 2
      continue
    }
    if (FIELD_SYNONYMS.some(({ synonyms }) => synonyms.some((s) => normalized.includes(s)))) {
      score += 1
    }
  }
  return score
}

function looksLikeSubHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.map((c) => c.trim()).filter((c) => c !== '')
  if (nonEmpty.length < 2) return false
  return nonEmpty.every((c) => /^[A-Za-z가-힣./\s-]{1,20}$/.test(c))
}

interface HeaderLayout {
  header: string[]
  dataStartRow: number
}

function detectHeaderLayout(rows: string[][]): HeaderLayout {
  const scanLimit = Math.min(rows.length, 15)
  let bestIndex = 0
  let bestScore = -1
  for (let i = 0; i < scanLimit; i++) {
    const score = scoreHeaderRow(rows[i].map((c) => String(c ?? '')))
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }
  // 매칭 점수가 낮으면(단순 단일 헤더 행 서식) 기존처럼 첫 행을 헤더로 사용합니다.
  const headerIndex = bestScore >= 3 ? bestIndex : 0
  const mainHeader = rows[headerIndex].map((c) => String(c ?? '').trim())
  const subRow = rows[headerIndex + 1]

  if (subRow && looksLikeSubHeaderRow(subRow.map((c) => String(c ?? '')))) {
    const combined = mainHeader.map((h, i) => {
      const sub = String(subRow[i] ?? '').trim()
      return sub ? `${h} ${sub}`.trim() : h
    })
    return { header: combined, dataStartRow: headerIndex + 2 }
  }

  return { header: mainHeader, dataStartRow: headerIndex + 1 }
}

// 일부 실제 서식(예: ETA/탈론 로그 계열)은 시간 항목 헤더 텍스트가 실제 데이터가 들어있는 열의
// 바로 오른쪽 열에 표기되어 있어(예: "S/E" 라벨은 오른쪽 칸에 있지만 실제 값은 왼쪽 칸에 있음),
// 자동 매핑된 열이 항상 비어 있고 바로 왼쪽의 매핑되지 않은 열에 실제 숫자 값이 있다면
// 매핑을 왼쪽 열로 보정합니다. 날짜/텍스트 필드에는 적용하지 않습니다.
const NUMERIC_SHIFT_CANDIDATE_FIELDS = new Set<MappableField>([
  'blockTime', 'dayLandings', 'nightLandings', 'singleEngineTime', 'multiEngineTime',
  'crossCountryTime', 'conditionDayTime', 'conditionNightTime', 'actualInstrumentTime',
  'simulatedInstrumentTime', 'groundTrainerTime', 'picTime', 'sicTime', 'dualReceivedTime',
  'flightInstructorTime', 'instrumentApproaches',
])

function columnHasMeaningfulNumber(rows: string[][], colIdx: number): boolean {
  return rows.some((row) => {
    const n = parseNumberValue(row[colIdx])
    return n !== undefined && n > 0
  })
}

function columnIsEmptyOrZero(rows: string[][], colIdx: number): boolean {
  return rows.every((row) => {
    const raw = String(row[colIdx] ?? '').trim()
    if (!raw) return true
    const n = parseNumberValue(raw)
    return n === undefined || n === 0
  })
}

function correctShiftedNumericHeaders(
  mapping: Record<number, MappableField>,
  body: string[][],
): Record<number, MappableField> {
  const next = { ...mapping }
  Object.entries(mapping).forEach(([idxStr, field]) => {
    const idx = Number(idxStr)
    const leftIdx = idx - 1
    if (field === 'ignore' || !NUMERIC_SHIFT_CANDIDATE_FIELDS.has(field)) return
    if (leftIdx < 0) return
    if ((next[leftIdx] ?? 'ignore') !== 'ignore') return
    if (!columnIsEmptyOrZero(body, idx)) return
    if (!columnHasMeaningfulNumber(body, leftIdx)) return
    next[leftIdx] = field
    next[idx] = 'ignore'
  })
  return next
}

type RowStatusFilter = 'all' | 'valid' | 'invalid'

interface PreviewRow {
  rowIndex: number
  valid: boolean
  reason?: string
  input?: LogbookEntryInput
  display: {
    date: string
    departure: string
    arrival: string
    aircraftType: string
    aircraftIdentification: string
    blockTime: string
    dayLandings: string
    nightLandings: string
    picTime: string
    sicTime: string
    dualReceivedTime: string
    flightInstructorTime: string
  }
}

interface LegacyExcelImportProps {
  onImportEntries: (inputs: LogbookEntryInput[]) => void
}

const MAX_PREVIEW_ROWS = 30
// 오류만 필터링해 볼 때는 검토 목적상 더 많은 행을 보여줍니다.
const MAX_PREVIEW_ROWS_INVALID_FILTER = 100

/**
 * 개인 엑셀 로그북 파일을 업로드해 자동으로 컬럼을 매핑하고, 매핑 결과를 미리보기로 확인한 뒤
 * 한 번에 여러 건의 비행 기록으로 일괄 가져오는 컴포넌트입니다. 파싱/변환은 모두 브라우저에서만 실행됩니다.
 */
export function LegacyExcelImport({ onImportEntries }: LegacyExcelImportProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [headerRow, setHeaderRow] = useState<string[]>([])
  const [dataRows, setDataRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, MappableField>>({})
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null)
  // 가져오기를 눌러 확정한 뒤에도 화면에서 계속 검토할 수 있도록 상태를 유지합니다.
  const [hasImported, setHasImported] = useState(false)
  const [statusFilter, setStatusFilter] = useState<RowStatusFilter>('all')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setParseError(null)
    setImportResult(null)
    setHeaderRow([])
    setDataRows([])
    setMapping({})
    setHasImported(false)
    setStatusFilter('all')
    setFileName(file.name)

    try {
      // 엑셀 라이브러리를 이 시점에 동적 로드한다(앱 첫 로딩 번들에서 분리). 네트워크 지연으로
      // 실패할 수 있으므로 실패 시 사용자에게 안내한다.
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        setParseError('파일에서 시트를 찾을 수 없습니다. 엑셀(.xlsx/.xls) 또는 CSV 파일인지 확인해 주세요.')
        return
      }
      const sheet = workbook.Sheets[firstSheetName]
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd' })
      if (!rows || rows.length === 0) {
        setParseError('파일에서 읽을 수 있는 데이터가 없습니다.')
        return
      }

      const { header, dataStartRow } = detectHeaderLayout(rows as string[][])
      const body = rows
        .slice(dataStartRow)
        .map((row) => header.map((_, i) => String(row[i] ?? '')))
        .filter((row) => row.some((cell) => cell.trim() !== ''))

      if (body.length === 0) {
        setParseError('헤더 행 아래에 데이터가 없습니다.')
        return
      }

      const initialMapping: Record<number, MappableField> = {}
      header.forEach((h, i) => {
        initialMapping[i] = guessField(h)
      })
      const correctedMapping = correctShiftedNumericHeaders(initialMapping, body)

      setHeaderRow(header)
      setDataRows(body)
      setMapping(correctedMapping)
    } catch {
      setParseError('파일을 읽는 중 오류가 발생했습니다. 엑셀(.xlsx/.xls) 또는 CSV 형식인지 확인 후 다시 시도해 주세요.')
    } finally {
      setIsParsing(false)
    }
  }

  function columnIndexFor(field: MappableField): number | null {
    for (const [idxStr, mapped] of Object.entries(mapping)) {
      if (mapped === field) return Number(idxStr)
    }
    return null
  }

  const previewRows: PreviewRow[] = useMemo(() => {
    if (dataRows.length === 0) return []

    const dateIdx = columnIndexFor('date')
    const departureIdx = columnIndexFor('departure')
    const arrivalIdx = columnIndexFor('arrival')
    const aircraftTypeIdx = columnIndexFor('aircraftType')
    const aircraftIdIdx = columnIndexFor('aircraftIdentification')
    const blockTimeIdx = columnIndexFor('blockTime')
    const dayLandingsIdx = columnIndexFor('dayLandings')
    const nightLandingsIdx = columnIndexFor('nightLandings')
    const singleEngineIdx = columnIndexFor('singleEngineTime')
    const multiEngineIdx = columnIndexFor('multiEngineTime')
    const crossCountryIdx = columnIndexFor('crossCountryTime')
    const conditionDayIdx = columnIndexFor('conditionDayTime')
    const conditionNightIdx = columnIndexFor('conditionNightTime')
    const actualInstrumentIdx = columnIndexFor('actualInstrumentTime')
    const simulatedInstrumentIdx = columnIndexFor('simulatedInstrumentTime')
    const groundTrainerIdx = columnIndexFor('groundTrainerTime')
    const picTimeIdx = columnIndexFor('picTime')
    const sicTimeIdx = columnIndexFor('sicTime')
    const dualReceivedIdx = columnIndexFor('dualReceivedTime')
    const flightInstructorIdx = columnIndexFor('flightInstructorTime')
    const instrumentApproachesIdx = columnIndexFor('instrumentApproaches')

    return dataRows.flatMap((row, rowIndex) => {
      const rawDate = dateIdx !== null ? row[dateIdx] : ''
      const departure = (departureIdx !== null ? row[departureIdx] : '').trim()
      const arrival = (arrivalIdx !== null ? row[arrivalIdx] : '').trim()
      const aircraftType = (aircraftTypeIdx !== null ? row[aircraftTypeIdx] : '').trim()
      const aircraftIdentification = (aircraftIdIdx !== null ? row[aircraftIdIdx] : '').trim()
      const rawBlockTime = blockTimeIdx !== null ? row[blockTimeIdx] : ''
      const rawDayLandings = dayLandingsIdx !== null ? row[dayLandingsIdx] : ''
      const rawNightLandings = nightLandingsIdx !== null ? row[nightLandingsIdx] : ''

      const date = parseDateValue(rawDate)
      const blockTime = parseNumberValue(rawBlockTime)
      const dayLandings = parseNumberValue(rawDayLandings) ?? 0
      const nightLandings = parseNumberValue(rawNightLandings) ?? 0

      // 울진 등 실제 로그북 엑셀의 하단에는 '합계'·'서명'·빈 줄 같은 요약 행이 붙는다.
      // 날짜도 기종도 구간도 없는 행은 비행기록이 아니라 서식의 일부이므로 오류로 세지 않고
      // 조용히 제외한다 — "항상 뜨던 오류 2건"의 원인 제거.
      const isFooterOrBlankRow = !date && !aircraftType && !departure && !arrival
      if (isFooterOrBlankRow) return []

      const singleEngineLand = singleEngineIdx !== null ? parseNumberValue(row[singleEngineIdx]) : undefined
      const multiEngineLand = multiEngineIdx !== null ? parseNumberValue(row[multiEngineIdx]) : undefined
      const crossCountry = crossCountryIdx !== null ? parseNumberValue(row[crossCountryIdx]) : undefined
      const conditionDay = conditionDayIdx !== null ? parseNumberValue(row[conditionDayIdx]) : undefined
      const conditionNight = conditionNightIdx !== null ? parseNumberValue(row[conditionNightIdx]) : undefined
      const actualInstrument = actualInstrumentIdx !== null ? parseNumberValue(row[actualInstrumentIdx]) : undefined
      const simulatedInstrument =
        simulatedInstrumentIdx !== null ? parseNumberValue(row[simulatedInstrumentIdx]) : undefined
      const groundTrainerTime = groundTrainerIdx !== null ? parseNumberValue(row[groundTrainerIdx]) : undefined
      const picTime = picTimeIdx !== null ? parseNumberValue(row[picTimeIdx]) : undefined
      const sicTime = sicTimeIdx !== null ? parseNumberValue(row[sicTimeIdx]) : undefined
      const dualReceived = dualReceivedIdx !== null ? parseNumberValue(row[dualReceivedIdx]) : undefined
      const flightInstructor = flightInstructorIdx !== null ? parseNumberValue(row[flightInstructorIdx]) : undefined
      const instrumentApproaches =
        instrumentApproachesIdx !== null ? parseNumberValue(row[instrumentApproachesIdx]) : undefined

      const categoryHours: CategoryHours | undefined =
        singleEngineLand !== undefined || multiEngineLand !== undefined
          ? { singleEngineLand, multiEngineLand }
          : undefined
      const conditions: FlightConditionHours | undefined =
        crossCountry !== undefined ||
        conditionDay !== undefined ||
        conditionNight !== undefined ||
        actualInstrument !== undefined ||
        simulatedInstrument !== undefined
          ? {
              day: conditionDay,
              night: conditionNight,
              crossCountry,
              actualInstrument,
              simulatedInstrument,
            }
          : undefined
      const pilotingTime: PilotingTime | undefined =
        picTime !== undefined || sicTime !== undefined || dualReceived !== undefined || flightInstructor !== undefined
          ? { pic: picTime, sic: sicTime, dualReceived, flightInstructor: flightInstructor }
          : undefined

      // FTD(Flight Training Device, 지상 시뮬레이터) 세션은 실제 비행이 아니므로 출발지/도착지/블록타임이
      // 원래 기록되지 않고, 대신 지상훈련장비 시간·모의계기 시간·계기접근 횟수 중 하나로 기록됩니다.
      const isSimulatorRow = aircraftType.trim().toUpperCase() === 'FTD'

      const missing: string[] = []
      if (!date) missing.push('날짜')
      if (!aircraftType) missing.push('기종')

      if (isSimulatorRow) {
        const hasSimulatorTraining =
          (groundTrainerTime !== undefined && groundTrainerTime > 0) ||
          (simulatedInstrument !== undefined && simulatedInstrument > 0) ||
          (instrumentApproaches !== undefined && instrumentApproaches > 0)
        if (!hasSimulatorTraining) missing.push('시뮬레이터 훈련 시간 없음')
      } else {
        if (!blockTime || blockTime <= 0) missing.push('블록타임')
      }

      const valid = missing.length === 0
      const input: LogbookEntryInput | undefined = valid
        ? {
            date: date as string,
            departure: isSimulatorRow ? (departure || 'FTD') : departure,
            arrival: isSimulatorRow ? (arrival || 'FTD') : arrival,
            aircraftType,
            aircraftIdentification: aircraftIdentification || undefined,
            blockTime: isSimulatorRow ? 0 : (blockTime as number),
            flightCategory: FLIGHT_CATEGORIES[0],
            dayLandings: Number.isFinite(dayLandings) && dayLandings > 0 ? dayLandings : 0,
            nightLandings: Number.isFinite(nightLandings) && nightLandings > 0 ? nightLandings : 0,
            categoryHours,
            pilotingTime,
            groundTrainerTime,
            conditions,
            instrumentApproaches,
            origin: 'legacy_excel',
            legacySourceNote: fileName ? `엑셀 이관 - ${fileName}` : '엑셀 이관',
          }
        : undefined

      // 하단 합계·총계·서명 행은 형식 오류로 세지 않고 조용히 건너뛴다(항상 '오류 2건'이 뜨던 문제 해결).
      // 기종이 없는 행은 비행기록이 아니다(합계·서명·출력시각 등 꼬리 행 포함) — 오류로 세지 않고 건너뛴다.
      const summaryLike = /합계|총계|소계|서명|total|page/i.test(rawDate) || !aircraftType.trim()
      if (!valid && summaryLike) return []

      return [{
        rowIndex,
        valid,
        reason: valid ? undefined : `형식 오류(${missing.join(', ')})`,
        input,
        display: {
          date: rawDate || '-',
          departure: isSimulatorRow ? (departure || 'FTD') : (departure || '-'),
          arrival: isSimulatorRow ? (arrival || 'FTD') : (arrival || '-'),
          aircraftType: aircraftType || '-',
          aircraftIdentification: aircraftIdentification || '-',
          blockTime: isSimulatorRow ? '-' : (rawBlockTime || '-'),
          dayLandings: rawDayLandings || '0',
          nightLandings: rawNightLandings || '0',
          picTime: picTime !== undefined ? String(picTime) : '-',
          sicTime: sicTime !== undefined ? String(sicTime) : '-',
          dualReceivedTime: dualReceived !== undefined ? String(dualReceived) : '-',
          flightInstructorTime: flightInstructor !== undefined ? String(flightInstructor) : '-',
        },
      }]
    })
  }, [dataRows, mapping, fileName])

  const validRows = previewRows.filter((r) => r.valid)
  const invalidRows = previewRows.filter((r) => !r.valid)
  const invalidCount = invalidRows.length

  const filteredRows =
    statusFilter === 'valid' ? validRows : statusFilter === 'invalid' ? invalidRows : previewRows
  const visibleMaxRows = statusFilter === 'invalid' ? MAX_PREVIEW_ROWS_INVALID_FILTER : MAX_PREVIEW_ROWS

  function handleImport() {
    const inputs = validRows.map((r) => r.input as LogbookEntryInput)
    if (inputs.length === 0) return
    onImportEntries(inputs)
    setImportResult({ added: inputs.length, skipped: invalidCount })
    setHasImported(true)
    // 오류 행을 계속 검토할 수 있도록 headerRow/dataRows/mapping은 초기화하지 않습니다.
    // 오류가 없다면(전부 정상 가져옴) 더 검토할 내용이 없으므로 화면을 정리합니다.
    if (invalidCount === 0) {
      setHeaderRow([])
      setDataRows([])
      setMapping({})
      setFileName(null)
    } else {
      setStatusFilter('invalid')
    }
  }

  return (
    <div data-mbaas-oid="4oqkjcj">
      <div data-mbaas-oid="a5nw1ea" className="mb-5 flex items-start gap-3 rounded-control border border-white/10 bg-surface p-4">
        <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <p data-mbaas-oid="n463qev" className="text-xs text-slate-400">
          개인 엑셀 로그북 파일(.xlsx/.xls/.csv)을 업로드하면 첫 번째 시트를 자동으로 읽어 컬럼을 최대한 자동 매핑합니다.
          매핑 결과를 검토/수정한 뒤 미리보기를 확인하고 가져오기를 눌러 확정하세요.
        </p>
      </div>

      <label data-mbaas-oid="m2x29x5" htmlFor="legacyExcelFile" className="mb-1.5 block text-sm font-medium text-ink">
        엑셀/CSV 파일 선택
      </label>
      <input
        data-mbaas-oid="urjxajx" id="legacyExcelFile"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="block w-full text-sm text-ink file:mr-3 file:rounded-control file:border-0 file:bg-sky/10 file:px-3 file:py-1.5
          file:text-sm file:font-semibold file:text-[#00D4FF]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      />

      {isParsing && <p data-mbaas-oid="19zapkv" className="mt-3 text-sm text-slate-400">파일을 읽는 중입니다...</p>}

      {parseError && (
        <div data-mbaas-oid="8ctb06p" role="alert" className="mt-4 flex items-start gap-2 rounded-control border border-rose-400/40 bg-rose-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <p data-mbaas-oid="5h040v4" className="text-sm font-medium text-rose-300">{parseError}</p>
        </div>
      )}

      {importResult && (
        <div data-mbaas-oid="8ckvkwm" role="status" className="mt-4 rounded-control border border-go/30 bg-go/10 px-4 py-3">
          <p data-mbaas-oid="dg6q2iy" className="text-sm font-medium text-go">
            {importResult.added}건을 가져왔습니다.
            {importResult.skipped > 0 && ` ${importResult.skipped}건은 형식 오류로 제외되었습니다.`}
          </p>
        </div>
      )}

      {headerRow.length > 0 && (
        <>
          <div data-mbaas-oid="5ss6nup" className="mt-6 overflow-x-auto rounded-control border border-white/10">
            <table data-mbaas-oid="bxlvhk6" className="w-full min-w-[520px] text-left text-sm">
              <caption data-mbaas-oid="catdehl" className="sr-only">엑셀 컬럼과 비행 기록 필드 매핑</caption>
              <thead data-mbaas-oid="w9masda" className="bg-surface">
                <tr data-mbaas-oid="8gqfkoz">
                  <th data-mbaas-oid="lqb53rx" scope="col" className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    엑셀 컬럼
                  </th>
                  <th data-mbaas-oid="n5uni0g" scope="col" className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    매핑할 필드
                  </th>
                </tr>
              </thead>
              <tbody data-mbaas-oid="erm5kn7">
                {headerRow.map((h, i) => (
                  <tr data-mbaas-oid="mynhswv" key={i} className="border-t border-white/[0.08]">
                    <td data-mbaas-oid="tncgpjx" className="px-4 py-2 font-mono-data text-sm text-ink">{h || `(${i + 1}열)`}</td>
                    <td data-mbaas-oid="w1d600f" className="px-4 py-2">
                      <select
                        data-mbaas-oid="516nvfl" aria-label={`${h || `${i + 1}열`} 매핑 필드 선택`}
                        value={mapping[i] ?? 'ignore'}
                        disabled={hasImported}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [i]: e.target.value as MappableField }))}
                        className="w-full max-w-[220px] rounded-control border border-white/10 bg-panel px-3 py-1.5 text-sm text-ink
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                          disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-slate-400"
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option data-mbaas-oid="vno6vey" key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div data-mbaas-oid="s8envrn" className="mt-6">
            <h4 data-mbaas-oid="htohs2q" className="text-sm font-bold text-ink">
              미리보기 ({previewRows.length}행 중 유효 {validRows.length}건
              {invalidCount > 0 && `, 형식 오류 ${invalidCount}건`})
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              날짜·기종이 없는 하단 합계/서명 행은 자동으로 제외됩니다. ·
              엑셀에 계기접근 횟수 컬럼이 없는 경우(울진 탈론 리포트 등) 0으로 저장되니, 계기 비행 기록은
              가져온 뒤 목록에서 해당 기록을 눌러 횟수를 보완해 주세요.
            </p>

            <div data-mbaas-oid="rsf1lt1" role="group" aria-label="상태별 필터" className="mt-3 flex flex-wrap gap-2">
              <Button
                data-mbaas-oid="rsf1lt2" type="button" size="sm"
                variant={statusFilter === 'all' ? 'solid' : 'outline'}
                tone="neutral"
                onClick={() => setStatusFilter('all')}
              >
                전체 {previewRows.length}
              </Button>
              <Button
                data-mbaas-oid="rsf1lt3" type="button" size="sm"
                variant={statusFilter === 'valid' ? 'solid' : 'outline'}
                tone="neutral"
                onClick={() => setStatusFilter('valid')}
              >
                정상만 {validRows.length}
              </Button>
              <Button
                data-mbaas-oid="rsf1lt4" type="button" size="sm"
                variant={statusFilter === 'invalid' ? 'solid' : 'outline'}
                tone="danger"
                disabled={invalidCount === 0}
                onClick={() => setStatusFilter('invalid')}
              >
                오류만 {invalidCount}
              </Button>
            </div>

            {statusFilter === 'invalid' && invalidCount > 0 && (
              <p data-mbaas-oid="rsf1lt5" className="mt-3 text-xs text-slate-400">
                아래 형식 오류 행은 이 화면에서 자동으로 가져올 수 없습니다. 각 행의 오류 사유를 확인한 뒤,
                "새 비행 기록 추가" 폼에서 직접 입력해 주세요.
              </p>
            )}

            <div data-mbaas-oid="b7jv3jv" className="mt-2 max-h-96 overflow-auto rounded-control border border-white/10">
              <table data-mbaas-oid="txsxe80" className="w-full min-w-[1080px] text-left text-xs">
                <thead data-mbaas-oid="h1fzds3" className="sticky top-0 bg-surface">
                  <tr data-mbaas-oid="87urdqf">
                    <th data-mbaas-oid="ovlrvch" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">상태</th>
                    <th data-mbaas-oid="oumx0l8" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">날짜</th>
                    <th data-mbaas-oid="qvecp09" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">출발</th>
                    <th data-mbaas-oid="li2nxlh" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">도착</th>
                    <th data-mbaas-oid="m6h06kt" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">기종</th>
                    <th data-mbaas-oid="ha5tn65" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">등록번호</th>
                    <th data-mbaas-oid="wz4zp8s" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">블록타임</th>
                    <th data-mbaas-oid="bqeat7h" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">주간/야간 착륙</th>
                    <th data-mbaas-oid="8ygp6l3" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">PIC</th>
                    <th data-mbaas-oid="d15qs1n" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">SIC</th>
                    <th data-mbaas-oid="y5noxcq" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">DUAL</th>
                    <th data-mbaas-oid="tnussrx" scope="col" className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-400">비행교관</th>
                  </tr>
                </thead>
                <tbody data-mbaas-oid="ke0ljyo">
                  {filteredRows.slice(0, visibleMaxRows).map((r) => (
                    <tr data-mbaas-oid="tre2wvs" key={r.rowIndex} className={`border-t border-white/[0.08] ${r.valid ? '' : 'bg-rose-500/10/60'}`}>
                      <td data-mbaas-oid="7rz3jt1" className="px-3 py-2">
                        {r.valid ? (
                          <span data-mbaas-oid="2pl0rnu" className="rounded-control bg-go/10 px-2 py-0.5 font-semibold text-go">
                            {hasImported ? '가져오기 완료' : '정상'}
                          </span>
                        ) : (
                          <div data-mbaas-oid="gzi4kfs">
                            <span data-mbaas-oid="ws0v61h" className="rounded-control bg-rose-500/100/15 px-2 py-0.5 font-semibold text-rose-600">
                              오류 - 수정 필요
                            </span>
                            <p data-mbaas-oid="luk02ha" className="mt-1 text-[11px] leading-snug text-rose-500">
                              {r.reason}
                              <br data-mbaas-oid="nmr89a1" />
                              "비행기록 관리 &gt; 새 비행 기록 추가" 폼에서 직접 입력해 주세요.
                            </p>
                          </div>
                        )}
                      </td>
                      <td data-mbaas-oid="4mj3c88" className="px-3 py-2 font-mono-data text-ink">{r.display.date}</td>
                      <td data-mbaas-oid="82vmhho" className="px-3 py-2 font-mono-data text-ink">{r.display.departure}</td>
                      <td data-mbaas-oid="4kj2c88" className="px-3 py-2 font-mono-data text-ink">{r.display.arrival}</td>
                      <td data-mbaas-oid="alrc4sm" className="px-3 py-2 text-ink">{r.display.aircraftType}</td>
                      <td data-mbaas-oid="elj77kd" className="px-3 py-2 font-mono-data text-ink">{r.display.aircraftIdentification}</td>
                      <td data-mbaas-oid="8iu0s97" className="px-3 py-2 font-mono-data tabular-nums text-ink">{r.display.blockTime}</td>
                      <td data-mbaas-oid="tup3ris" className="px-3 py-2 font-mono-data tabular-nums text-ink">
                        {r.display.dayLandings} / {r.display.nightLandings}
                      </td>
                      <td data-mbaas-oid="0ltoms6" className="px-3 py-2 font-mono-data tabular-nums text-ink">{r.display.picTime}</td>
                      <td data-mbaas-oid="xkaeqx4" className="px-3 py-2 font-mono-data tabular-nums text-ink">{r.display.sicTime}</td>
                      <td data-mbaas-oid="pok96ry" className="px-3 py-2 font-mono-data tabular-nums text-ink">{r.display.dualReceivedTime}</td>
                      <td data-mbaas-oid="4i4riho" className="px-3 py-2 font-mono-data tabular-nums text-ink">{r.display.flightInstructorTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRows.length > visibleMaxRows && (
              <p data-mbaas-oid="pely1c5" className="mt-2 text-xs text-slate-400">
                최대 {visibleMaxRows}행까지만 미리보기로 표시됩니다. 가져오기는 전체 유효 행에 적용됩니다.
              </p>
            )}
          </div>

          <div data-mbaas-oid="2z7edif" className="mt-5">
            {hasImported ? (
              <p data-mbaas-oid="sez2w5c" className="text-sm font-medium text-go">
                이미 유효한 {validRows.length}건을 가져왔습니다.
                {invalidCount > 0 && ' 오류 행은 위 목록에서 계속 확인할 수 있습니다.'}
              </p>
            ) : (
              <Button data-mbaas-oid="sez2w5b" type="button" tone="brand" size="md" disabled={validRows.length === 0} onClick={handleImport}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                유효한 {validRows.length}건 가져오기
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
