// "개인설정" 게시판을 이용한 개인설정(개인 역할 오버라이드/소속 기관 오버라이드/커런시 override 3종)
// 서버 동기화 제목/본문 포맷, 파싱 유틸, 로컬(localStorage) 읽기 유틸입니다.
//
// 다른 "게시글 1건당 데이터 1건"류 연동(자격증/비행기록/업무기록)과 달리, 이 게시판은 계정당 딱
// 1개의 "개인설정" 게시글만 유지합니다(있으면 갱신, 없으면 생성). content에는 5개 설정값을 하나의
// 객체로 묶어 JSON.stringify로 한 줄 문자열(들여쓰기 없음 → 줄바꿈 없음)로 그대로 담습니다. 목록 조회
// API(`GET /public/boards/{project_id}/{board_id}/posts`)의 content는 "미리보기(HTML 태그 제거)"라서
// 원본 줄바꿈이 보존된다는 보장이 없는데(다른 게시판 연동에서 실제로 겪은 문제, 관련 주석은
// src/lib/certificateSync.ts 참고), 애초에 줄바꿈이 없는 한 줄 JSON 문자열을 쓰면 이 문제 자체를 피할 수
// 있다. 실제 설정값을 읽어야 하는 곳(초기 동기화 등)은 항상 상세 조회(`GET /public/boards/posts/{post_id}`,
// 원본 content를 그대로 준다)를 사용한다.
//
// 제목에는 본인 게시글 필터링에 쓰이는 계정 아이디(이메일)를 포함한다("자격증관리"/"비행기록"/"업무기록"
// 게시판과 동일한 패턴). 목록 조회 API 응답에는 author_id가 없어(author_name만 제공), 제목에 포함해두지
// 않으면 다른 회원의 게시글과 구분할 방법이 없다.

import type { IndividualRole } from './baas/types'
import type { BoardPostListItem } from './baas/boardTypes'
import { isOperationType, parsePilotTracks } from './tracks'
import type { OperationType, PilotTrack } from './tracks'
import { isVehicle } from '../types/vehicle'
import type { Vehicle } from '../types/vehicle'

const TITLE_PREFIX = '개인설정'

/** "개인설정" 게시글 1건에 묶어 저장하는 5개 설정값. */
export interface ProfileSettings {
  individualRoleOverride?: IndividualRole
  organizationAffiliation?: string
  instrumentCheckDate?: string
  instructorFirstCertDate?: string
  instructorRecoveryChecked?: boolean
  // v1.1
  pilotTracks?: PilotTrack[]
  activeTrack?: PilotTrack
  birthDate?: string
  operationType?: OperationType
  /** v1.1 — 초경량 기체 카드 목록 */
  vehicles?: Vehicle[]
}

/** "개인설정" 게시글 제목 — 본인 게시글 필터링용으로 계정 아이디(이메일)를 포함한다. */
export function buildProfileSettingsTitle(userId: string): string {
  return `${TITLE_PREFIX} - ${userId}`
}

/** 제목에 포함된 이메일(userId)로 본인 명의의 "개인설정" 게시글 1건을 찾는다(계정당 1건만 존재해야 함). */
export function findProfileSettingsPostByUserId(items: BoardPostListItem[], userId: string): BoardPostListItem | null {
  const marker = `${TITLE_PREFIX} - ${userId}`
  return items.find((item) => item.title === marker) ?? null
}

/** "개인설정" 게시글 본문 — JSON.stringify는 들여쓰기 없이 호출하면 줄바꿈 없는 한 줄 문자열이 된다. */
export function buildProfileSettingsContent(settings: ProfileSettings): string {
  return JSON.stringify(settings)
}

function isIndividualRoleValue(value: unknown): value is IndividualRole {
  return value === 'pilot' || value === 'atc' || value === 'mechanic' || value === 'dispatcher' || value === 'drone_pilot'
}

function isValidDateStringValue(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
}

/**
 * 게시글 content(JSON 문자열)를 ProfileSettings 객체로 복원한다.
 * 파싱 실패 시 안전하게 null을, 형식은 맞지만 유효한 필드가 없으면 빈 객체를 반환한다(호출부에서 조용히 무시할 것).
 * 필드별로 유효성을 검사해, 알 수 없는 값이 섞여 있어도 나머지 유효한 필드는 그대로 살린다.
 */
export function parseProfileSettingsFromContent(content: string | null | undefined): ProfileSettings | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Partial<Record<keyof ProfileSettings, unknown>>
    const settings: ProfileSettings = {}

    if (isIndividualRoleValue(candidate.individualRoleOverride)) {
      settings.individualRoleOverride = candidate.individualRoleOverride
    }
    if (typeof candidate.organizationAffiliation === 'string' && candidate.organizationAffiliation.trim()) {
      settings.organizationAffiliation = candidate.organizationAffiliation.trim()
    }
    if (isValidDateStringValue(candidate.instrumentCheckDate)) {
      settings.instrumentCheckDate = candidate.instrumentCheckDate
    }
    if (isValidDateStringValue(candidate.instructorFirstCertDate)) {
      settings.instructorFirstCertDate = candidate.instructorFirstCertDate
    }
    if (typeof candidate.instructorRecoveryChecked === 'boolean') {
      settings.instructorRecoveryChecked = candidate.instructorRecoveryChecked
    }
    // v1.1
    const tracks = parsePilotTracks(candidate.pilotTracks)
    if (tracks.length > 0) settings.pilotTracks = tracks
    const active = parsePilotTracks([candidate.activeTrack])[0]
    if (active) settings.activeTrack = active
    if (isValidDateStringValue(candidate.birthDate)) settings.birthDate = candidate.birthDate
    if (isOperationType(candidate.operationType)) settings.operationType = candidate.operationType
    if (Array.isArray(candidate.vehicles)) {
      const vehicles = candidate.vehicles.filter(isVehicle)
      if (vehicles.length > 0) settings.vehicles = vehicles
    }

    return settings
  } catch {
    return null
  }
}

// ── 로컬(localStorage) 저장 — 계정별 스코프 키 ──────────────────────────────
// 기존에 각각 독립적으로 존재하던 useIndividualRoleOverride/useOrganizationAffiliationOverride/
// useCurrencyOverrides 3개 훅이 그대로 사용하던 localStorage 키 프리픽스를 그대로 재사용한다(하위 호환:
// 이미 저장된 로컬 값이 이 리팩터링으로 사라지지 않는다).

export const ROLE_OVERRIDE_KEY_PREFIX = 'awos_individual_role_override'
export const AFFILIATION_OVERRIDE_KEY_PREFIX = 'awos_organization_affiliation_override'
export const INSTRUMENT_CHECK_DATE_KEY_PREFIX = 'awos_currency_instrument_check_date'
export const INSTRUCTOR_FIRST_CERT_DATE_KEY_PREFIX = 'awos_currency_instructor_first_cert_date'
export const INSTRUCTOR_RECOVERY_CHECK_KEY_PREFIX = 'awos_currency_instructor_recovery_check'
// v1.1
export const PILOT_TRACKS_KEY_PREFIX = 'awos_pilot_tracks'
export const ACTIVE_TRACK_KEY_PREFIX = 'awos_active_track'
export const BIRTH_DATE_KEY_PREFIX = 'awos_birth_date'
export const OPERATION_TYPE_KEY_PREFIX = 'awos_operation_type'
export const VEHICLES_KEY_PREFIX = 'awos_vehicles'

/** 계정별로 스코프된 localStorage 키를 만든다. */
export function buildProfileFieldKey(prefix: string, accountId: string): string {
  return `${prefix}:${accountId}`
}

export function isIndividualRole(value: unknown): value is IndividualRole {
  return isIndividualRoleValue(value)
}

export function isValidDateString(value: unknown): value is string {
  return isValidDateStringValue(value)
}

function readRawLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * 이 계정의 5개 개인설정 값을 localStorage에서 직접(각 훅의 React state를 거치지 않고) 읽어
 * 하나의 ProfileSettings 스냅샷으로 합친다. 서버 업서트 시 "지금 이 브라우저가 알고 있는 전체 값"을
 * 항상 함께 보내기 위한 용도로, 필드 하나만 바뀌어도 다른 필드가 유실되지 않도록 한다(read-modify-write).
 */
export function readLocalProfileSettings(accountId: string): ProfileSettings {
  const settings: ProfileSettings = {}

  const role = readRawLocal(buildProfileFieldKey(ROLE_OVERRIDE_KEY_PREFIX, accountId))
  if (role && isIndividualRoleValue(role)) settings.individualRoleOverride = role

  const affiliation = readRawLocal(buildProfileFieldKey(AFFILIATION_OVERRIDE_KEY_PREFIX, accountId))?.trim()
  if (affiliation) settings.organizationAffiliation = affiliation

  const instrumentCheckDate = readRawLocal(buildProfileFieldKey(INSTRUMENT_CHECK_DATE_KEY_PREFIX, accountId))
  if (instrumentCheckDate && isValidDateStringValue(instrumentCheckDate)) settings.instrumentCheckDate = instrumentCheckDate

  const instructorFirstCertDate = readRawLocal(buildProfileFieldKey(INSTRUCTOR_FIRST_CERT_DATE_KEY_PREFIX, accountId))
  if (instructorFirstCertDate && isValidDateStringValue(instructorFirstCertDate)) {
    settings.instructorFirstCertDate = instructorFirstCertDate
  }

  const instructorRecoveryChecked = readRawLocal(buildProfileFieldKey(INSTRUCTOR_RECOVERY_CHECK_KEY_PREFIX, accountId))
  settings.instructorRecoveryChecked = instructorRecoveryChecked === 'true'

  // v1.1
  const tracksRaw = readRawLocal(buildProfileFieldKey(PILOT_TRACKS_KEY_PREFIX, accountId))
  if (tracksRaw) {
    try {
      const tracks = parsePilotTracks(JSON.parse(tracksRaw))
      if (tracks.length > 0) settings.pilotTracks = tracks
    } catch {
      // 손상된 값은 무시
    }
  }
  const activeRaw = readRawLocal(buildProfileFieldKey(ACTIVE_TRACK_KEY_PREFIX, accountId))
  const active = parsePilotTracks([activeRaw])[0]
  if (active) settings.activeTrack = active
  const birth = readRawLocal(buildProfileFieldKey(BIRTH_DATE_KEY_PREFIX, accountId))
  if (birth && isValidDateStringValue(birth)) settings.birthDate = birth
  const op = readRawLocal(buildProfileFieldKey(OPERATION_TYPE_KEY_PREFIX, accountId))
  if (isOperationType(op)) settings.operationType = op
  const vehiclesRaw = readRawLocal(buildProfileFieldKey(VEHICLES_KEY_PREFIX, accountId))
  if (vehiclesRaw) {
    try {
      const parsed = JSON.parse(vehiclesRaw)
      if (Array.isArray(parsed)) {
        const vehicles = parsed.filter(isVehicle)
        if (vehicles.length > 0) settings.vehicles = vehicles
      }
    } catch {
      // 손상된 값은 무시
    }
  }

  return settings
}
