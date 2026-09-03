// v1.1 — 보유 트랙(복수)·현재 보는 트랙·생년월일·운항형태를 계정별로 관리하는 훅.
//
// 저장 계층은 useIndividualRoleOverride와 동일한 3중 구조를 따른다.
//   1) localStorage(즉시 반영)  2) "개인설정" 게시글(기기 간 동기화)  3) profiles 테이블(best-effort)
// 3)은 schema10-pilot-tracks.sql 적용 전에는 컬럼이 없어 실패하므로 조용히 무시한다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useProfileSettingsSync } from './baas/useProfileSettingsSync'
import { updateMyProfileFields } from '../lib/baas/supabaseTransport'
import type { AccountResponse, IndividualRole } from '../lib/baas/types'
import {
  ACTIVE_TRACK_KEY_PREFIX,
  ADDRESS_KEY_PREFIX,
  BIRTH_DATE_KEY_PREFIX,
  NATIONALITY_KEY_PREFIX,
  OPERATION_TYPE_KEY_PREFIX,
  PILOT_TRACKS_KEY_PREFIX,
  SIGNUP_TRACKS_KEY_PREFIX,
  buildProfileFieldKey,
  isValidDateString,
} from '../lib/profileSettingsSync'
import { isOperationType, isPilotTrack, parsePilotTracks, tracksFromLegacyRole } from '../lib/tracks'
import type { OperationType, PilotTrack } from '../lib/tracks'

/**
 * 같은 훅이 여러 컴포넌트(LogbookPage·CurrencyDashboard·FlightReadinessPanel·AccountPage)에서 동시에 쓰인다.
 * 각 인스턴스가 자기 state만 갖고 있으면 한쪽에서 바꾼 운항형태가 다른 쪽엔 새로고침 전까지 반영되지 않는다.
 * 쓰기 후 커스텀 이벤트를 쏘고 모든 인스턴스가 localStorage를 다시 읽어 맞춘다.
 */
const CHANGE_EVENT = 'awos:pilot-tracks-changed'
function broadcast() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readLocal(key: string | undefined): string | null {
  if (!key) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string | undefined, value: string | null) {
  if (!key) return
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // 저장 공간 부족/접근 차단 시 조용히 무시
  }
}

export interface PilotTracksState {
  /** 보유 트랙(정렬·중복 제거됨). 비어 있으면 아직 설정 전. */
  tracks: PilotTrack[]
  /** 지금 화면에서 보고 있는 트랙. tracks에 없으면 첫 번째로 보정된다. */
  activeTrack: PilotTrack
  birthDate: string | null
  operationType: OperationType
  address: string | null
  nationality: string | null
  /** tracks가 명시 저장된 값이 아니라 기존 individual_role에서 파생된 값인지 */
  isDerivedFromLegacyRole: boolean
  ready: boolean
  setTracks: (next: PilotTrack[]) => void
  setActiveTrack: (track: PilotTrack) => void
  setBirthDate: (date: string | null) => void
  setOperationType: (type: OperationType) => void
  setAddress: (v: string | null) => void
  setNationality: (v: string | null) => void
}

export function usePilotTracks(account: AccountResponse | null | undefined): PilotTracksState {
  const accountId = account?.id
  const keys = useMemo(
    () =>
      accountId
        ? {
            tracks: buildProfileFieldKey(PILOT_TRACKS_KEY_PREFIX, accountId),
            active: buildProfileFieldKey(ACTIVE_TRACK_KEY_PREFIX, accountId),
            birth: buildProfileFieldKey(BIRTH_DATE_KEY_PREFIX, accountId),
            op: buildProfileFieldKey(OPERATION_TYPE_KEY_PREFIX, accountId),
            addr: buildProfileFieldKey(ADDRESS_KEY_PREFIX, accountId),
            nat: buildProfileFieldKey(NATIONALITY_KEY_PREFIX, accountId),
          }
        : undefined,
    [accountId],
  )

  const { ready: serverReady, serverSettings, syncNow } = useProfileSettingsSync(account)

  const [tracksState, setTracksState] = useState<PilotTrack[] | null>(null)
  const [activeState, setActiveState] = useState<PilotTrack | null>(null)
  const [birthState, setBirthState] = useState<string | null>(null)
  const [opState, setOpState] = useState<OperationType | null>(null)
  const [addrState, setAddrState] = useState<string | null>(null)
  const [natState, setNatState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // 1) 로컬 로드 (+ 다른 인스턴스의 변경 이벤트 시 재로드)
  useEffect(() => {
    if (!keys) {
      setTracksState(null)
      setActiveState(null)
      setBirthState(null)
      setOpState(null)
      setReady(false)
      return
    }
    const load = () => {
      const rawTracks = readLocal(keys.tracks)
      let tracks: PilotTrack[] | null = null
      if (rawTracks) {
        try {
          const parsed = parsePilotTracks(JSON.parse(rawTracks))
          tracks = parsed.length > 0 ? parsed : null
        } catch {
          tracks = null
        }
      }
      setTracksState(tracks)
      const active = readLocal(keys.active)
      setActiveState(isPilotTrack(active) ? active : null)
      const birth = readLocal(keys.birth)
      setBirthState(birth && isValidDateString(birth) ? birth : null)
      const op = readLocal(keys.op)
      setOpState(isOperationType(op) ? op : null)
      setAddrState(readLocal(keys.addr))
      setNatState(readLocal(keys.nat))
      setReady(true)
    }
    load()
    window.addEventListener(CHANGE_EVENT, load)
    window.addEventListener('storage', load) // 다른 탭
    return () => {
      window.removeEventListener(CHANGE_EVENT, load)
      window.removeEventListener('storage', load)
    }
  }, [keys])

  // 2) 서버 값으로 초기 채움(로컬 우선, 최초 1회)
  const initialFillDoneRef = useRef(false)
  useEffect(() => {
    if (initialFillDoneRef.current) return
    if (!ready || !serverReady || !keys) return
    initialFillDoneRef.current = true

    if (!tracksState) {
      let fromServer = serverSettings?.pilotTracks ?? parsePilotTracks(account?.data?.pilot_tracks)
      if (fromServer.length === 0 && account?.user_id) {
        // 가입 폼에서 고른 구분(이 브라우저에 이메일 키로 보관) 복원 — profiles 컬럼이 없는 환경 대비
        const pendingKey = `${SIGNUP_TRACKS_KEY_PREFIX}:${account.user_id.toLowerCase()}`
        const pending = readLocal(pendingKey)
        if (pending) {
          try {
            fromServer = parsePilotTracks(JSON.parse(pending))
          } catch {
            fromServer = []
          }
          writeLocal(pendingKey, null)
          if (fromServer.length > 0) {
            syncNow()
            void updateMyProfileFields({ pilot_tracks: fromServer }).catch(() => undefined)
          }
        }
      }
      if (fromServer.length > 0) {
        writeLocal(keys.tracks, JSON.stringify(fromServer))
        setTracksState(fromServer)
      }
    }
    if (!activeState && serverSettings?.activeTrack) {
      writeLocal(keys.active, serverSettings.activeTrack)
      setActiveState(serverSettings.activeTrack)
    }
    if (!birthState) {
      const b = serverSettings?.birthDate ?? account?.data?.birth_date
      if (b && isValidDateString(b)) {
        writeLocal(keys.birth, b)
        setBirthState(b)
      }
    }
    if (!opState) {
      const o = serverSettings?.operationType ?? account?.data?.operation_type
      if (isOperationType(o)) {
        writeLocal(keys.op, o)
        setOpState(o)
      }
    }
    if (!addrState && serverSettings?.address) {
      writeLocal(keys.addr, serverSettings.address)
      setAddrState(serverSettings.address)
    }
    if (!natState && serverSettings?.nationality) {
      writeLocal(keys.nat, serverSettings.nationality)
      setNatState(serverSettings.nationality)
    }
  }, [ready, serverReady, serverSettings, keys, tracksState, activeState, birthState, opState, addrState, natState, account, syncNow])

  // 파생값: 명시 저장이 없으면 기존 역할에서 이관
  const legacyRole = account?.data?.individual_role as IndividualRole | undefined
  const isDerivedFromLegacyRole = !tracksState
  const tracks = tracksState ?? tracksFromLegacyRole(legacyRole)
  const activeTrack: PilotTrack = activeState && tracks.includes(activeState) ? activeState : (tracks[0] ?? 'aircraft')
  const operationType: OperationType = opState ?? 'general'

  const setTracks = useCallback(
    (next: PilotTrack[]) => {
      if (!keys) return
      initialFillDoneRef.current = true
      const normalized = parsePilotTracks(next)
      writeLocal(keys.tracks, JSON.stringify(normalized))
      setTracksState(normalized.length > 0 ? normalized : null)
      // 활성 트랙이 사라졌으면 첫 번째로
      if (activeState && !normalized.includes(activeState)) {
        writeLocal(keys.active, normalized[0] ?? null)
        setActiveState(normalized[0] ?? null)
      }
      broadcast()
      syncNow()
      void updateMyProfileFields({ pilot_tracks: normalized }).catch(() => undefined)
    },
    [keys, activeState, syncNow],
  )

  const setActiveTrack = useCallback(
    (track: PilotTrack) => {
      if (!keys) return
      writeLocal(keys.active, track)
      setActiveState(track)
      broadcast()
      syncNow()
    },
    [keys, syncNow],
  )

  const setBirthDate = useCallback(
    (date: string | null) => {
      if (!keys) return
      initialFillDoneRef.current = true
      const valid = date && isValidDateString(date) ? date : null
      writeLocal(keys.birth, valid)
      setBirthState(valid)
      broadcast()
      syncNow()
      void updateMyProfileFields({ birth_date: valid }).catch(() => undefined)
    },
    [keys, syncNow],
  )

  const setOperationType = useCallback(
    (type: OperationType) => {
      if (!keys) return
      initialFillDoneRef.current = true
      writeLocal(keys.op, type)
      setOpState(type)
      broadcast()
      syncNow()
      void updateMyProfileFields({ operation_type: type }).catch(() => undefined)
    },
    [keys, syncNow],
  )

  const setAddress = useCallback(
    (v: string | null) => {
      if (!keys) return
      const clean = v?.trim() || null
      writeLocal(keys.addr, clean)
      setAddrState(clean)
      broadcast()
      syncNow()
    },
    [keys, syncNow],
  )
  const setNationality = useCallback(
    (v: string | null) => {
      if (!keys) return
      const clean = v?.trim() || null
      writeLocal(keys.nat, clean)
      setNatState(clean)
      broadcast()
      syncNow()
    },
    [keys, syncNow],
  )

  return {
    tracks,
    activeTrack,
    birthDate: birthState,
    operationType,
    address: addrState,
    nationality: natState,
    setAddress,
    setNationality,
    isDerivedFromLegacyRole,
    ready,
    setTracks,
    setActiveTrack,
    setBirthDate,
    setOperationType,
  }
}
