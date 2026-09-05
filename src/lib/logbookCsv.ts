// 비행기록 CSV 내보내기 유틸리티
//
// "내 기록은 언제든 통째로 가져갈 수 있다"는 신뢰 장치입니다. 컬럼은 공식 비행경력증명서
// 분류(항공기 범주별 / 비행 자격별 / 비행 조건별 / 이착륙·계기접근)를 그대로 따르므로,
// 내보낸 파일을 자격 신청 서류 작성이나 다른 로그북 도구로 옮길 때 바로 쓸 수 있습니다.
// 참고: 이 앱의 "엑셀 가져오기"가 읽을 수 있는 형태이기도 해서, 백업→복원 왕복이 됩니다.

import { sumHours } from './hours'

import type { LogbookEntry } from '../types/logbook'
import { saveBlob } from './ui/saveFile'

const HEADERS = [
  '날짜',
  '출발지',
  '도착지',
  '경유',
  '기종',
  '등록번호',
  '블록타임',
  '비행종류',
  '단발육상',
  '다발육상',
  '회전익',
  '기타범주명',
  '기타범주시간',
  'DUAL RECEIVED',
  'PIC',
  'SIC',
  '교관탑승',
  '지상훈련장치',
  '주간',
  '야간',
  '크로스컨트리',
  '실제계기',
  '모의계기',
  '계기접근(회)',
  '주간이착륙(회)',
  '야간이착륙(회)',
  '비고',
]

/** 숫자 필드: 값이 없으면 빈 칸(0 강제 기입 대신 공란 유지 — 원본 데이터 왜곡 방지) */
function num(v: number | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : ''
}

/** CSV 셀 이스케이프: 쉼표/따옴표/줄바꿈 포함 시 따옴표로 감싼다 */
function cell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function entryToRow(e: LogbookEntry): string {
  const values = [
    e.date,
    e.departure,
    e.arrival,
    e.viaAirports ?? '',
    e.aircraftType,
    e.aircraftIdentification ?? '',
    num(e.blockTime),
    e.flightCategory,
    num(e.categoryHours?.singleEngineLand),
    num(e.categoryHours?.multiEngineLand),
    num(e.categoryHours?.rotorcraftHelicopter),
    e.categoryHours?.otherLabel ?? '',
    num(e.categoryHours?.otherHours),
    num(e.pilotingTime?.dualReceived),
    num(e.pilotingTime?.pic),
    num(e.pilotingTime?.sic),
    num(e.pilotingTime?.flightInstructor),
    num(e.groundTrainerTime),
    num(e.conditions?.day),
    num(e.conditions?.night),
    num(e.conditions?.crossCountry),
    num(e.conditions?.actualInstrument),
    num(e.conditions?.simulatedInstrument),
    num(e.instrumentApproaches),
    num(e.dayLandings),
    num(e.nightLandings),
    e.notes ?? '',
  ]
  return values.map(cell).join(',')
}

/** 공용 합산 유틸에 위임(모든 시간 합산은 lib/hours 한 곳에서만 구현·검증된다). */
const sum = sumHours

function totalsRow(entries: LogbookEntry[]): string {
  const values = [
    '합계',
    '', '', '', '',
    `${entries.length}건`,
    String(sum(entries.map((e) => e.blockTime))),
    '',
    String(sum(entries.map((e) => e.categoryHours?.singleEngineLand))),
    String(sum(entries.map((e) => e.categoryHours?.multiEngineLand))),
    String(sum(entries.map((e) => e.categoryHours?.rotorcraftHelicopter))),
    '',
    String(sum(entries.map((e) => e.categoryHours?.otherHours))),
    String(sum(entries.map((e) => e.pilotingTime?.dualReceived))),
    String(sum(entries.map((e) => e.pilotingTime?.pic))),
    String(sum(entries.map((e) => e.pilotingTime?.sic))),
    String(sum(entries.map((e) => e.pilotingTime?.flightInstructor))),
    String(sum(entries.map((e) => e.groundTrainerTime))),
    String(sum(entries.map((e) => e.conditions?.day))),
    String(sum(entries.map((e) => e.conditions?.night))),
    String(sum(entries.map((e) => e.conditions?.crossCountry))),
    String(sum(entries.map((e) => e.conditions?.actualInstrument))),
    String(sum(entries.map((e) => e.conditions?.simulatedInstrument))),
    String(entries.reduce((a, e) => a + (e.instrumentApproaches ?? 0), 0)),
    String(entries.reduce((a, e) => a + (e.dayLandings ?? 0), 0)),
    String(entries.reduce((a, e) => a + (e.nightLandings ?? 0), 0)),
    '',
  ]
  return values.map(cell).join(',')
}

/** 오래된 날짜 → 최신 순으로 정렬해 CSV 본문을 만든다(로그북 관례). */
export function buildLogbookCsv(entries: LogbookEntry[]): string {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
  const rows = sorted.map(entryToRow)
  rows.push(totalsRow(sorted))
  // \uFEFF(UTF-8 BOM): 엑셀에서 한글 컬럼이 깨지지 않게 하는 필수 접두사
  return '\uFEFF' + HEADERS.join(',') + '\n' + rows.join('\n')
}

/** CSV 파일을 저장한다(iOS·홈 화면 앱은 공유 시트, 그 외 다운로드). */
export function downloadLogbookCsv(entries: LogbookEntry[]): Promise<'shared' | 'downloaded'> {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  // buildLogbookCsv 가 이미 BOM 을 붙인다(엑셀 한글 깨짐 방지)
  const blob = new Blob([buildLogbookCsv(entries)], { type: 'text/csv;charset=utf-8' })
  return saveBlob(blob, `AWOS_logbook_${stamp}.csv`)
}
