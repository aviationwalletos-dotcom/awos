import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccountResponse } from '../lib/baas/types'
import { AFFILIATION_OVERRIDE_KEY_PREFIX, buildProfileFieldKey } from '../lib/profileSettingsSync'
import { useProfileSettingsSync } from './baas/useProfileSettingsSync'

/**
 * 계정별로 스코프된 localStorage 키를 만듭니다.
 * accountId가 없으면(비로그인 등) null을 반환해 조회/저장을 막습니다.
 * 로컬 저장은 즉시 반영을 위한 캐시 성격이며, 이 훅은 best-effort로 "개인설정" 게시판에도
 * 값을 동기화한다(같은 계정이라면 다른 브라우저/기기에서도 초기 동기화로 값을 가져올 수 있다).
 */
function buildStorageKey(accountId: string | null | undefined): string | null {
  if (!accountId) return null
  return buildProfileFieldKey(AFFILIATION_OVERRIDE_KEY_PREFIX, accountId)
}

function loadOverride(storageKey: string): string | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    const trimmed = raw?.trim()
    return trimmed ? trimmed : null
  } catch {
    return null
  }
}

/**
 * 로그인한 계정(account)별로 분리된 "소속 기관" 로컬 오버라이드를 관리합니다.
 * 회원가입 시 저장된 organization_affiliation을 변경할 수 있는 서버 API가 없어,
 * 이 브라우저에서 소속 기관을 나중에 등록/변경할 수 있게 하되, "개인설정" 게시판
 * (useProfileSettingsSync)을 통해 서버에도 best-effort로 동기화해 다른 기기에서도 값을
 * 확인/공유할 수 있게 합니다. (개인/기관 계정 모두 사용 가능)
 */
export function useOrganizationAffiliationOverride(account: AccountResponse | null | undefined) {
  const accountId = account?.id
  const storageKey = buildStorageKey(accountId)
  const [override, setOverrideState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const { ready: serverReady, serverSettings, syncNow } = useProfileSettingsSync(account)

  useEffect(() => {
    if (!storageKey) {
      setOverrideState(null)
      setReady(false)
      return
    }
    setOverrideState(loadOverride(storageKey))
    setReady(true)
  }, [storageKey])

  // 초기 서버 동기화: 로컬에 값이 없고 서버에 값이 있으면 서버 값(다른 기기에서 저장한 최신값)으로
  // 채운다. 사용자가 이 훅 인스턴스에서 이미 값을 설정/해제한 적이 있으면(initialFillDoneRef) 더 이상
  // 시도하지 않는다(방금 사용자가 지운 값을 뒤늦게 도착한 서버 값으로 되살리지 않기 위함).
  const initialFillDoneRef = useRef(false)
  useEffect(() => {
    if (initialFillDoneRef.current) return
    if (!ready || !serverReady || !storageKey) return
    initialFillDoneRef.current = true

    if (override) return // 로컬 값이 이미 있으면 그대로 사용(로컬 우선)
    const serverAffiliation = serverSettings?.organizationAffiliation
    if (!serverAffiliation) return

    try {
      window.localStorage.setItem(storageKey, serverAffiliation)
    } catch {
      // 저장 공간이 부족하거나 접근이 차단된 경우 조용히 무시합니다.
    }
    setOverrideState(serverAffiliation)
  }, [ready, serverReady, serverSettings, storageKey, override])

  const setOverride = useCallback(
    (value: string) => {
      if (!storageKey) return
      initialFillDoneRef.current = true
      const trimmed = value.trim()
      try {
        if (trimmed) {
          window.localStorage.setItem(storageKey, trimmed)
        } else {
          window.localStorage.removeItem(storageKey)
        }
      } catch {
        // 저장 공간이 부족하거나 접근이 차단된 경우 조용히 무시합니다.
      }
      setOverrideState(trimmed ? trimmed : null)
      syncNow()
    },
    [storageKey, syncNow],
  )

  const clearOverride = useCallback(() => {
    if (!storageKey) return
    initialFillDoneRef.current = true
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // 접근이 차단된 경우 조용히 무시합니다.
    }
    setOverrideState(null)
    syncNow()
  }, [storageKey, syncNow])

  return { override, ready, setOverride, clearOverride }
}
