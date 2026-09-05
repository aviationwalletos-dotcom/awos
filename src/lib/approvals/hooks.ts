// approval_requests 훅 모음. 목록 조회는 서버 필터 1회, 필요하면 폴링.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type ListApprovalParams, fetchApprovalRequest, fetchApprovedInstructors, listApprovalRequests } from './api'
import { approvedTracksOf, pickInstructorRequestByTrack } from './select'
import type { ApprovalRequest, ApprovedInstructor, PilotTrack } from './types'

interface UseApprovalRequestsOptions {
  enabled?: boolean
  /** ms. 주면 주기적으로 다시 읽는다(학생 화면의 서명 반영 등). */
  pollMs?: number
}

export interface UseApprovalRequestsReturn {
  data: ApprovalRequest[] | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<ApprovalRequest[] | null>
}

export function useApprovalRequests(params: ListApprovalParams, options: UseApprovalRequestsOptions = {}): UseApprovalRequestsReturn {
  const { enabled = true, pollMs } = options
  const [data, setData] = useState<ApprovalRequest[] | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // params 객체가 렌더마다 새로 만들어져도 내용이 같으면 재조회하지 않도록 직렬화 키를 쓴다
  const key = JSON.stringify(params)
  const paramsRef = useRef(params)
  paramsRef.current = params

  const refetch = useCallback(async () => {
    setError(null)
    try {
      const rows = await listApprovalRequests(paramsRef.current)
      setData(rows)
      return rows
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 목록을 불러오지 못했습니다.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 필터(key)가 바뀌면 이전 필터의 목록은 버린다 — 탭을 바꿨는데 옛 탭 목록이 남아 보이면 안 된다.
  // (같은 필터의 주기적 재조회가 실패할 때만 마지막 목록을 유지한다)
  const lastKeyRef = useRef(key)
  useEffect(() => {
    if (!enabled) return
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key
      setData(null)
    }
    setIsLoading(true)
    let retryTimer: number | undefined
    // 첫 조회가 일시적 네트워크 문제로 실패하면 3초 뒤 한 번 더 시도한다
    // (교관 승인 조회가 실패하면 서명 요청함 탭이 그 세션 내내 안 보이는 문제 방지)
    void refetch().then((rows) => {
      if (rows === null) retryTimer = window.setTimeout(() => void refetch(), 3000)
    })
    if (!pollMs) return () => window.clearTimeout(retryTimer)
    const timer = window.setInterval(() => void refetch(), pollMs)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(retryTimer)
    }
    // key 가 바뀌면(필터 변경) 다시 읽는다
  }, [enabled, key, pollMs, refetch])

  return { data, isLoading, error, refetch }
}

/** 승인된 교관 목록(전 구분). 로딩 중이면 null. */
export function useApprovedInstructors(): { instructors: ApprovedInstructor[] | null; refetch: () => Promise<void> } {
  const [instructors, setInstructors] = useState<ApprovedInstructor[] | null>(null)
  const refetch = useCallback(async () => {
    const list = await fetchApprovedInstructors()
    setInstructors(list)
  }, [])
  useEffect(() => {
    let alive = true
    void fetchApprovedInstructors().then((list) => {
      if (alive) setInstructors(list)
    })
    return () => {
      alive = false
    }
  }, [])
  return { instructors, refetch }
}

/** 내가 승인받은 구분 집합 + 구분별 최신 신청 상태 */
export function useMyInstructorApprovals(userId: string | null | undefined): {
  byTrack: Partial<Record<PilotTrack, ApprovalRequest>>
  approvedTracks: PilotTrack[]
  isApprovedAny: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<ApprovalRequest[] | null>
} {
  const { data, isLoading, error, refetch } = useApprovalRequests(
    { scope: 'mine', kind: 'instructor', limit: 50 },
    { enabled: Boolean(userId) },
  )
  const byTrack = useMemo(() => pickInstructorRequestByTrack(data ?? []), [data])
  const approvedTracks = useMemo(() => approvedTracksOf(byTrack), [byTrack])
  return { byTrack, approvedTracks, isApprovedAny: approvedTracks.length > 0, isLoading, error, refetch }
}

/** 요청 1건 조회(학생 화면의 서명/증명서 판정 반영용). pollMs 를 주면 주기적으로 다시 읽는다. */
export function useApprovalRequestById(
  id: string | null | undefined,
  options: { enabled?: boolean; pollMs?: number } = {},
): { request: ApprovalRequest | null; isLoading: boolean; error: string | null; refetch: () => Promise<ApprovalRequest | null> } {
  const { enabled = true, pollMs } = options
  const [request, setRequest] = useState<ApprovalRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(id)
  idRef.current = id

  const refetch = useCallback(async () => {
    const target = idRef.current
    if (!target) {
      setRequest(null)
      return null
    }
    setIsLoading(true)
    setError(null)
    try {
      const row = await fetchApprovalRequest(target)
      setRequest(row)
      return row
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 상태를 확인하지 못했습니다.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || !id) {
      setRequest(null)
      return
    }
    void refetch()
    if (!pollMs) return
    const timer = window.setInterval(() => void refetch(), pollMs)
    return () => window.clearInterval(timer)
  }, [enabled, id, pollMs, refetch])

  return { request, isLoading, error, refetch }
}
