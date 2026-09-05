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
}

export function snapshotFromPayload(payload: Record<string, unknown> | null | undefined): SignedSnapshot | null {
  const raw = payload?.signedSnapshot as Partial<SignedSnapshot> | undefined
  if (!raw || typeof raw.hash !== 'string' || !raw.fields) return null
  return { version: 1, fields: raw.fields as Record<string, unknown>, hash: raw.hash, capturedAt: String(raw.capturedAt ?? '') }
}
