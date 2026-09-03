// v1.1 — 초경량 기체 카드 목록. 저장은 usePilotTracks와 같은 2중 구조(localStorage → "개인설정" 게시글).
// profiles 컬럼은 두지 않는다(목록형 데이터라 JSON이 맞고, 기관이 볼 필요는 아직 없음).

import { useCallback, useEffect, useRef, useState } from 'react'

import { useProfileSettingsSync } from './baas/useProfileSettingsSync'
import type { AccountResponse } from '../lib/baas/types'
import { VEHICLES_KEY_PREFIX, buildProfileFieldKey } from '../lib/profileSettingsSync'
import { isVehicle } from '../types/vehicle'
import type { Vehicle, VehicleInput } from '../types/vehicle'

function loadLocal(key: string | undefined): Vehicle[] {
  if (!key) return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isVehicle) : []
  } catch {
    return []
  }
}

function saveLocal(key: string | undefined, vehicles: Vehicle[]) {
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(vehicles))
  } catch {
    // 저장 실패는 조용히 무시
  }
}

function makeId(): string {
  return `veh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function useVehicles(account: AccountResponse | null | undefined) {
  const accountId = account?.id
  const storageKey = accountId ? buildProfileFieldKey(VEHICLES_KEY_PREFIX, accountId) : undefined
  const { ready: serverReady, serverSettings, syncNow } = useProfileSettingsSync(account)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setVehicles(loadLocal(storageKey))
    setReady(Boolean(storageKey))
  }, [storageKey])

  // 서버 값으로 초기 채움(로컬이 비어 있을 때만, 1회)
  const filledRef = useRef(false)
  useEffect(() => {
    if (filledRef.current || !ready || !serverReady || !storageKey) return
    filledRef.current = true
    if (vehicles.length > 0) return
    const fromServer = serverSettings?.vehicles ?? []
    if (fromServer.length > 0) {
      saveLocal(storageKey, fromServer)
      setVehicles(fromServer)
    }
  }, [ready, serverReady, serverSettings, storageKey, vehicles.length])

  const persist = useCallback(
    (next: Vehicle[]) => {
      filledRef.current = true
      saveLocal(storageKey, next)
      setVehicles(next)
      syncNow()
    },
    [storageKey, syncNow],
  )

  const addVehicle = useCallback(
    (input: VehicleInput): Vehicle => {
      const now = Date.now()
      const created: Vehicle = { ...input, id: makeId(), createdAt: now, updatedAt: now }
      persist([...vehicles, created])
      return created
    },
    [vehicles, persist],
  )

  const updateVehicle = useCallback(
    (id: string, input: Partial<VehicleInput>) => {
      persist(vehicles.map((v) => (v.id === id ? { ...v, ...input, updatedAt: Date.now() } : v)))
    },
    [vehicles, persist],
  )

  const deleteVehicle = useCallback(
    (id: string) => {
      persist(vehicles.filter((v) => v.id !== id))
    },
    [vehicles, persist],
  )

  const byId = useCallback((id: string | undefined) => (id ? vehicles.find((v) => v.id === id) : undefined), [vehicles])

  return { vehicles, ready, addVehicle, updateVehicle, deleteVehicle, byId }
}
