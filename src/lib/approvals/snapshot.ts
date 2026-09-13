// 서명 시점 기록 스냅샷·해시 — "서명 당시 내용이 무엇이었는지"를 서버(approval_requests.payload)에 남긴다.
//
// 종이 로그북의 "줄 긋고 옆에 적기"에 해당한다. 서명 뒤 기록을 고치면 서명은 해제되지만,
// 서명 당시 내용은 요청 행에 그대로 남아 있어 상세 화면에서 나란히 볼 수 있고, 해시로 위변조를 검증할 수 있다.

import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

/** 서명 대상이 되는 필드만 고정 순서로 뽑는다(서명·요청 id·증명서 상태 같은 메타는 제외). */
export function pickSignedFields(entry: LogbookEntry | LogbookEntryInput): Record<string, unknown> {
  return {
    date: entry.date ?? null,
    departure: entry.departure ?? null,
    arrival: entry.arrival ?? null,
    viaAirports: entry.viaAirports ?? null,
    aircraftType: entry.aircraftType ?? null,
    aircraftIdentification: entry.aircraftIdentification ?? null,
    blockTime: entry.blockTime ?? null,
    flightCategory: entry.flightCategory ?? null,
    categoryHours: entry.categoryHours ?? null,
    pilotingTime: entry.pilotingTime ?? null,
    groundTrainerTime: entry.groundTrainerTime ?? null,
    conditions: entry.conditions ?? null,
    instrumentApproaches: entry.instrumentApproaches ?? null,
    dayLandings: entry.dayLandings ?? null,
    nightLandings: entry.nightLandings ?? null,
    notes: entry.notes ?? null,
    twoPilotAircraft: entry.twoPilotAircraft ?? null,
    nightTakeoffs: entry.nightTakeoffs ?? null,
    // 구분·기종(경량/초경량)·시뮬레이터
    vehicleClass: entry.vehicleClass ?? null,
    vehicleKind: entry.vehicleKind ?? null,
    simDevice: entry.simDevice ?? null,
    // 초경량 로그기록지(별지 제2호) 항목 — 빠지면 초경량 서명은 시간·아워미터를 바꿔도 못 잡는다
    vehicleId: entry.vehicleId ?? null,
    flightCount: entry.flightCount ?? null,
    takeoffTime: entry.takeoffTime ?? null,
    landingTime: entry.landingTime ?? null,
    hourMeterStart: entry.hourMeterStart ?? null,
    hourMeterEnd: entry.hourMeterEnd ?? null,
    flightPurpose: entry.flightPurpose ?? null,
    instructorLicenceNo: entry.instructorLicenceNo ?? null,
    traineeName: entry.traineeName ?? null,
  }
}

/** 키 순서를 고정한 JSON(같은 내용이면 항상 같은 문자열) */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (v as Record<string, unknown>)[k]
          return acc
        }, {})
    }
    return v
  })
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SignedSnapshot {
  version: 1
  fields: Record<string, unknown>
  hash: string
  capturedAt: string
}

/** 교관 확인(Endorsement)처럼 비행 기록이 아닌 것도 같은 형식(필드 + 해시)으로 서명 대상을 고정한다 */
export async function buildFieldsSnapshot(fields: Record<string, unknown>): Promise<SignedSnapshot> {
  return { version: 1, fields, hash: await sha256Hex(canonicalJson(fields)), capturedAt: new Date().toISOString() }
}

export async function buildSignedSnapshot(entry: LogbookEntry | LogbookEntryInput): Promise<SignedSnapshot> {
  const fields = pickSignedFields(entry)
  return { version: 1, fields, hash: await sha256Hex(canonicalJson(fields)), capturedAt: new Date().toISOString() }
}

/**
 * 현재 기록이 서명 당시 내용과 같은지.
 * 스냅샷에 든 항목만 비교한다(나중에 서명 대상 항목이 늘어나도 예전 서명이 "불일치"로 오판되지 않게).
 * 저장된 스냅샷 자체의 해시도 확인해 스냅샷 변조를 잡는다.
 */
export async function matchesSnapshot(entry: LogbookEntry | LogbookEntryInput, snapshot: SignedSnapshot | null | undefined): Promise<boolean | null> {
  if (!snapshot?.hash || !snapshot.fields) return null
  const storedHash = await sha256Hex(canonicalJson(snapshot.fields))
  if (storedHash !== snapshot.hash) return false
  const current = pickSignedFields(entry) as Record<string, unknown>
  for (const [k, v] of Object.entries(snapshot.fields)) {
    if (JSON.stringify(v ?? null) !== JSON.stringify(current[k] ?? null)) return false
  }
  return true
}

/** 사람이 읽는 라벨(상세 화면 "서명 당시 내용" 표) */
export const SIGNED_FIELD_LABEL: Record<string, string> = {
  date: '날짜',
  departure: '출발',
  arrival: '도착',
  viaAirports: '경유',
  aircraftType: '기종',
  aircraftIdentification: '등록기호',
  blockTime: '블록타임',
  flightCategory: '비행 종류',
  categoryHours: '범주별 시간',
  pilotingTime: '조종 시간',
  groundTrainerTime: '지상훈련',
  conditions: '비행 조건',
  instrumentApproaches: '계기접근',
  dayLandings: '주간 이착륙',
  nightLandings: '야간 이착륙',
  notes: '메모',
  twoPilotAircraft: '2인 조종 항공기',
  nightTakeoffs: '야간 이륙',
  vehicleClass: '구분',
  vehicleKind: '종류',
  simDevice: '시뮬레이터 장치',
  vehicleId: '기체',
  flightCount: '비행 횟수',
  takeoffTime: '이륙 시각',
  landingTime: '착륙 시각',
  hourMeterStart: '아워미터(이륙)',
  hourMeterEnd: '아워미터(착륙)',
  flightPurpose: '비행 목적/훈련 내용',
  instructorLicenceNo: '지도조종자 자격번호',
  traineeName: '교육생 성명',
  // 교관 확인(Endorsement)
  endorsementType: '확인 종류',
  endorsementDetail: '세부(기종·비행장·노선)',
  endorsedDate: '확인일',
  studentName: '학생',
  instructorName: '확인 교관',
}

/**
 * 중첩 객체(범주별 시간·조종 시간·비행 조건) 안쪽 키의 한글 이름.
 * 서명 표에 {"day":0.8,"night":0} 처럼 날것으로 나오던 걸 "주간 0.8 · 야간 0" 으로 읽히게 한다.
 */
export const SIGNED_SUBFIELD_LABEL: Record<string, string> = {
  // CategoryHours — 범주별 시간
  singleEngineLand: '단발육상',
  multiEngineLand: '다발육상',
  rotorcraftHelicopter: '회전익',
  otherLabel: '기타 범주',
  otherHours: '기타 시간',
  // PilotingTime — 조종 시간
  dualReceived: 'Dual',
  pic: '기장',
  sic: '부조종사',
  flightInstructor: '교관',
  solo: '단독',
  picSupervised: '기장 감독 하',
  training: '훈련',
  // FlightConditionHours — 비행 조건
  day: '주간',
  night: '야간',
  crossCountry: '야외',
  nightCrossCountry: '야간 야외',
  actualInstrument: '실계기',
  simulatedInstrument: '모의계기',
  soloCrossCountry: '단독 야외',
  crossCountryDistanceKm: '야외 거리(km)',
}

/**
 * 스냅샷 값 한 칸을 사람이 읽을 수 있는 문자열로 바꾼다.
 *
 * 값은 바꾸지 않는다 — 0 은 0 으로 그대로 보여준다. 로그북에서 `0` 과 `기재 없음`(undefined)은
 * 다른 뜻이고, 서명 대상 표는 "이 내용에 서명한다"는 증거라 임의로 숨기면 안 된다.
 * 비어 있는 객체({})만 '—' 로 바꾼다. 담긴 값이 없다는 뜻이라 보여줄 게 없다.
 */
export function formatSnapshotValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.map((v) => formatSnapshotValue(v)).join(', ')
  if (typeof value === 'boolean') return value ? '예' : '아니오'
  if (typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${SIGNED_SUBFIELD_LABEL[k] ?? k} ${formatSnapshotValue(v)}`)
    return parts.length > 0 ? parts.join(' · ') : '—'
  }
  return String(value)
}

/** 보여줄 내용이 없는 칸인지. 빈 객체·빈 배열·빈 값은 표에서 뺀다. */
export function isEmptySnapshotValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .every((v) => v === null || v === undefined || v === '')
  }
  return false
}

export function snapshotFromPayload(payload: Record<string, unknown> | null | undefined): SignedSnapshot | null {
  const raw = payload?.signedSnapshot as Partial<SignedSnapshot> | undefined
  if (!raw || typeof raw.hash !== 'string' || !raw.fields) return null
  return { version: 1, fields: raw.fields as Record<string, unknown>, hash: raw.hash, capturedAt: String(raw.capturedAt ?? '') }
}
