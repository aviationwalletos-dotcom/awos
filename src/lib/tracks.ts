// v1.1 — "보유 트랙(Pilot Track)" 모델
//
// [왜 이 모듈이 필요한가]
// 기존 individual_role은 하나만 고를 수 있어서 조종사 자격과 경량항공기 자격을 동시에 가진
// 사람이 두 기록을 분리해 볼 수 없었다. 더 심각하게는, 역할을 '드론조종사'로 바꾸면 C172·DA42로
// 쌓은 비행시간이 그대로 드론 누적시간으로 집계되는 오염이 있었다(로그가 역할과 무관하게 한 덩어리였음).
//
// 해법: 로그 원장은 하나로 두되, 비행 1건마다 "어떤 장치로 비행했는가(vehicleClass)"를 태그하고,
// 사용자는 트랙을 여러 개 보유할 수 있게 한다. 집계·커런시·자격 덱은 항상 트랙 단위로 계산한다.
//
// 트랙 3종은 항공안전법의 구분을 그대로 따른다.
//   aircraft   — 항공기(비행기·헬리콥터) 조종사 (법 제34조 자격증명)
//   lsa        — 경량항공기 조종사 (법 제109조)
//   ultralight — 초경량비행장치 조종자 (법 제125조 조종자증명; 유인 동력계열 + 무인비행장치)

import type { LogbookEntry } from '../types/logbook'
import type { IndividualRole } from './baas/types'

export type PilotTrack = 'aircraft' | 'lsa' | 'ultralight'

export const ALL_PILOT_TRACKS: PilotTrack[] = ['aircraft', 'lsa', 'ultralight']

export const PILOT_TRACK_LABEL: Record<PilotTrack, string> = {
  aircraft: '조종사',
  lsa: '경량항공기 조종사',
  ultralight: '초경량비행장치 조종자',
}

export const PILOT_TRACK_SHORT: Record<PilotTrack, string> = {
  aircraft: '항공기',
  lsa: '경량항공기',
  ultralight: '초경량',
}

export const PILOT_TRACK_DESCRIPTION: Record<PilotTrack, string> = {
  aircraft: '비행기·헬리콥터. 자가용·사업용·운송용 조종사 자격증명 체계.',
  lsa: '타면조종형비행기·경량헬리콥터·자이로플레인 등. 경량항공기 조종사 자격증명.',
  ultralight: '동력비행장치·회전익비행장치·무인멀티콥터 등. 초경량비행장치 조종자증명.',
}

/** 법령상 근거 조문(카드·배너 표기용) */
export const PILOT_TRACK_LEGAL_BASIS: Record<PilotTrack, string> = {
  aircraft: '항공안전법 제34조',
  lsa: '항공안전법 제109조',
  ultralight: '항공안전법 제125조',
}

export function isPilotTrack(value: unknown): value is PilotTrack {
  return value === 'aircraft' || value === 'lsa' || value === 'ultralight'
}

/** 알 수 없는 값(서버·로컬)에서 트랙 배열을 안전하게 복원한다. 순서는 ALL_PILOT_TRACKS 기준으로 정규화. */
export function parsePilotTracks(value: unknown): PilotTrack[] {
  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((s) => s.trim())
      : []
  const set = new Set(raw.filter(isPilotTrack))
  return ALL_PILOT_TRACKS.filter((t) => set.has(t))
}

/**
 * 기존 단일 역할(individual_role)에서 트랙 집합으로의 이관 규칙.
 * - pilot → 항공기
 * - drone_pilot → 초경량
 * - 그 외(관제사·정비사·운항관리사) → 조종 트랙 없음
 * - 미설정 → 기존 관례(조종사 기본 화면)대로 항공기
 */
export function tracksFromLegacyRole(role: IndividualRole | null | undefined): PilotTrack[] {
  if (!role) return ['aircraft']
  if (role === 'pilot') return ['aircraft']
  if (role === 'drone_pilot') return ['ultralight']
  return []
}

// ── 장치 종류(vehicleKind) — 트랙 안의 세부 구분 ────────────────────────────
// 경량·초경량은 "종류"가 자격 한정 단위이므로 비행기록에도 남겨야 이후 응시경력 계산이 가능하다.

export interface VehicleKindDef {
  key: string
  label: string
  /** 무인비행장치 여부 — 야간 카드 제거·Remote ID 연동 대상 판별에 쓴다 */
  unmanned?: boolean
}

export const LSA_KINDS: VehicleKindDef[] = [
  { key: 'LSA_AIRPLANE', label: '타면조종형비행기' },
  { key: 'LSA_WEIGHT_SHIFT', label: '체중이동형비행기' },
  { key: 'LSA_HELICOPTER', label: '경량헬리콥터' },
  { key: 'LSA_GYROPLANE', label: '자이로플레인' },
  { key: 'LSA_POWERED_PARACHUTE', label: '동력패러슈트' },
]

export const ULTRALIGHT_KINDS: VehicleKindDef[] = [
  { key: 'UL_POWERED', label: '동력비행장치' },
  { key: 'UL_ROTOR', label: '회전익비행장치' },
  { key: 'UL_POWERED_PARAGLIDER', label: '동력패러글라이더' },
  { key: 'UAS_AIRPLANE', label: '무인비행기', unmanned: true },
  { key: 'UAS_HELICOPTER', label: '무인헬리콥터', unmanned: true },
  { key: 'UAS_MULTICOPTER', label: '무인멀티콥터', unmanned: true },
  { key: 'UAS_VTOL', label: '무인수직이착륙기', unmanned: true },
  { key: 'UAS_AIRSHIP', label: '무인비행선', unmanned: true },
]

export function vehicleKindsForTrack(track: PilotTrack): VehicleKindDef[] {
  if (track === 'lsa') return LSA_KINDS
  if (track === 'ultralight') return ULTRALIGHT_KINDS
  return []
}

export function vehicleKindLabel(key: string | undefined): string | undefined {
  if (!key) return undefined
  return [...LSA_KINDS, ...ULTRALIGHT_KINDS].find((k) => k.key === key)?.label
}

export function isUnmannedKind(key: string | undefined): boolean {
  if (!key) return false
  return ULTRALIGHT_KINDS.some((k) => k.key === key && k.unmanned)
}

// ── 비행기록 → 트랙 분류 ─────────────────────────────────────────────────────

/**
 * vehicleClass 태그가 없는 기존 기록(0902 이전)에 대한 추정 규칙.
 * 이 앱의 기존 사용자는 전원 항공기 조종사(울진 훈련기·FTD)였으므로 기본값은 항공기다.
 * 기종명에서 경량·초경량 흔적이 뚜렷할 때만 그쪽으로 분류한다.
 */
export function inferVehicleClass(entry: Pick<LogbookEntry, 'aircraftType' | 'aircraftIdentification'>): PilotTrack {
  const t = `${entry.aircraftType ?? ''} ${entry.aircraftIdentification ?? ''}`.toLowerCase()
  if (/드론|drone|멀티콥터|multicopter|uav|uas|mavic|phantom|matrice|inspire|무인/.test(t)) return 'ultralight'
  if (/패러|paraglid|동력비행장치|회전익비행장치|초경량/.test(t)) return 'ultralight'
  if (/경량|lsa|자이로|gyro|타면조종|체중이동/.test(t)) return 'lsa'
  return 'aircraft'
}

/** 기록의 트랙. 태그가 있으면 그 값, 없으면 추정값. */
export function entryTrack(entry: LogbookEntry): PilotTrack {
  return isPilotTrack(entry.vehicleClass) ? entry.vehicleClass : inferVehicleClass(entry)
}

export function filterEntriesByTrack(entries: LogbookEntry[], track: PilotTrack): LogbookEntry[] {
  return entries.filter((e) => entryTrack(e) === track)
}

/** 트랙별 기록 수 — 트랙 전환 탭 배지·미분류 안내에 쓴다 */
export function countEntriesByTrack(entries: LogbookEntry[]): Record<PilotTrack, number> {
  const counts: Record<PilotTrack, number> = { aircraft: 0, lsa: 0, ultralight: 0 }
  for (const e of entries) counts[entryTrack(e)] += 1
  return counts
}

/** 태그가 없어 추정으로 분류된 기록 수(사용자에게 "확인 필요"로 안내) */
export function countUntaggedEntries(entries: LogbookEntry[]): number {
  return entries.filter((e) => !isPilotTrack(e.vehicleClass)).length
}

// ── 운항형태(커런시 기준 분기) ─────────────────────────────────────────────

export type OperationType = 'general' | 'commercial'

export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  general: '일반 운항',
  commercial: '여객·2인조종·운송사업',
}

export const OPERATION_TYPE_DESCRIPTION: Record<OperationType, string> = {
  general: '최근 비행경험 180일 기준',
  commercial: '최근 비행경험 90일 + 야간 요건',
}

export function isOperationType(value: unknown): value is OperationType {
  return value === 'general' || value === 'commercial'
}
