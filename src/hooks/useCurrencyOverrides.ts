import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccountResponse } from '../lib/baas/types'
import {
  INSTRUCTOR_FIRST_CERT_DATE_KEY_PREFIX,
  INSTRUCTOR_RECOVERY_CHECK_KEY_PREFIX,
  INSTRUMENT_CHECK_DATE_KEY_PREFIX,
  buildProfileFieldKey,
  isValidDateString,
} from '../lib/profileSettingsSync'
import { useProfileSettingsSync } from './baas/useProfileSettingsSync'

// 계정별로 스코프된 "커런시 관리" 탭 예외 규정 입력값(계기비행심사 이수일, 조종교육증명
// 최초 취득일, 교관 커런시 회복 자기 신고 체크)을 브라우저 localStorage에 저장하는 훅입니다.
// 로컬 저장은 즉시 반영을 위한 캐시 성격이며, useIndividualRoleOverride / useOrganizationAffiliationOverride와
// 동일하게 "개인설정" 게시판(useProfileSettingsSync)을 통해 서버에도 best-effort로 동기화합니다.

function buildKey(prefix: string, accountId: string | null | undefined): string | null {
  if (!accountId) return null
  return buildProfileFieldKey(prefix, accountId)
}

function loadDate(key: string | null): string | null {
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return isValidDateString(raw) ? raw : null
  } catch {
    return null
  }
}

function loadBoolean(key: string | null): boolean {
  if (!key) return false
  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

/**
 * 계기비행심사 이수일 / 조종교육증명 최초 취득일 / 교관 커런시 회복 자기 신고 체크를
 * 계정(account)별로 관리합니다. account가 없으면(비로그인) 조회/저장이 비활성화됩니다.
 */
export function useCurrencyOverrides(account: AccountResponse | null | undefined) {
  const accountId = account?.id
  const instrumentCheckKey = buildKey(INSTRUMENT_CHECK_DATE_KEY_PREFIX, accountId)
  const instructorFirstCertKey = buildKey(INSTRUCTOR_FIRST_CERT_DATE_KEY_PREFIX, accountId)
  const recoveryCheckKey = buildKey(INSTRUCTOR_RECOVERY_CHECK_KEY_PREFIX, accountId)

  const [instrumentCheckDate, setInstrumentCheckDateState] = useState<string | null>(null)
  const [instructorFirstCertDate, setInstructorFirstCertDateState] = useState<string | null>(null)
  const [instructorRecoveryChecked, setInstructorRecoveryCheckedState] = useState(false)

  const { ready: serverReady, serverSettings, syncNow } = useProfileSettingsSync(account)

  useEffect(() => {
    setInstrumentCheckDateState(loadDate(instrumentCheckKey))
    setInstructorFirstCertDateState(loadDate(instructorFirstCertKey))
    setInstructorRecoveryCheckedState(loadBoolean(recoveryCheckKey))
  }, [instrumentCheckKey, instructorFirstCertKey, recoveryCheckKey])

  // 초기 서버 동기화: 로컬에 값이 없는 필드만 서버 값(다른 기기에서 저장한 최신값)으로 채운다.
  // 사용자가 이 훅 인스턴스에서 이미 어떤 필드든 설정/해제한 적이 있으면(initialFillDoneRef) 더 이상
  // 시도하지 않는다(방금 사용자가 바꾼 값을 뒤늦게 도착한 서버 값으로 되살리지 않기 위함).
  const initialFillDoneRef = useRef(false)
  useEffect(() => {
    if (initialFillDoneRef.current) return
    if (!serverReady || !instrumentCheckKey || !instructorFirstCertKey || !recoveryCheckKey) return
    initialFillDoneRef.current = true

    if (!instrumentCheckDate && serverSettings?.instrumentCheckDate) {
      try {
        window.localStorage.setItem(instrumentCheckKey, serverSettings.instrumentCheckDate)
      } catch {
        // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
      }
      setInstrumentCheckDateState(serverSettings.instrumentCheckDate)
    }

    if (!instructorFirstCertDate && serverSettings?.instructorFirstCertDate) {
      try {
        window.localStorage.setItem(instructorFirstCertKey, serverSettings.instructorFirstCertDate)
      } catch {
        // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
      }
      setInstructorFirstCertDateState(serverSettings.instructorFirstCertDate)
    }

    // instructorRecoveryChecked는 boolean이라 "값 없음"을 구분할 수 없으므로, 로컬이 false(기본값)이고
    // 서버가 true를 신고한 경우에만 채운다(로컬에서 이미 true로 설정했다면 그대로 유지).
    if (!instructorRecoveryChecked && serverSettings?.instructorRecoveryChecked) {
      try {
        window.localStorage.setItem(recoveryCheckKey, 'true')
      } catch {
        // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
      }
      setInstructorRecoveryCheckedState(true)
    }
  }, [serverReady, serverSettings, instrumentCheckKey, instructorFirstCertKey, recoveryCheckKey])

  const setInstrumentCheckDate = useCallback(
    (value: string) => {
      if (!instrumentCheckKey || !isValidDateString(value)) return
      initialFillDoneRef.current = true
      try {
        window.localStorage.setItem(instrumentCheckKey, value)
      } catch {
        // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
      }
      setInstrumentCheckDateState(value)
      syncNow()
    },
    [instrumentCheckKey, syncNow],
  )

  const clearInstrumentCheckDate = useCallback(() => {
    if (!instrumentCheckKey) return
    initialFillDoneRef.current = true
    try {
      window.localStorage.removeItem(instrumentCheckKey)
    } catch {
      // 접근 차단 시 조용히 무시합니다.
    }
    setInstrumentCheckDateState(null)
    syncNow()
  }, [instrumentCheckKey, syncNow])

  const setInstructorFirstCertDate = useCallback(
    (value: string) => {
      if (!instructorFirstCertKey || !isValidDateString(value)) return
      initialFillDoneRef.current = true
      try {
        window.localStorage.setItem(instructorFirstCertKey, value)
      } catch {
        // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
      }
      setInstructorFirstCertDateState(value)
      syncNow()
    },
    [instructorFirstCertKey, syncNow],
  )

  const clearInstructorFirstCertDate = useCallback(() => {
    if (!instructorFirstCertKey) return
    initialFillDoneRef.current = true
    try {
      window.localStorage.removeItem(instructorFirstCertKey)
    } catch {
      // 접근 차단 시 조용히 무시합니다.
    }
    setInstructorFirstCertDateState(null)
    syncNow()
  }, [instructorFirstCertKey, syncNow])

  const setInstructorRecoveryChecked = useCallback(
    (value: boolean) => {
      if (!recoveryCheckKey) return
      initialFillDoneRef.current = true
      try {
        window.localStorage.setItem(recoveryCheckKey, value ? 'true' : 'false')
      } catch {
        // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
      }
      setInstructorRecoveryCheckedState(value)
      syncNow()
    },
    [recoveryCheckKey, syncNow],
  )

  return {
    instrumentCheckDate,
    setInstrumentCheckDate,
    clearInstrumentCheckDate,
    instructorFirstCertDate,
    setInstructorFirstCertDate,
    clearInstructorFirstCertDate,
    instructorRecoveryChecked,
    setInstructorRecoveryChecked,
  }
}
