import { useCallback, useEffect, useRef, useState } from 'react'

import type { WorkLogEntry, WorkLogEntryInput, WorkLogRole } from '../types/workLog'
import type { AccountResponse } from '../lib/baas/types'
import {
  DETAIL_FETCH_BATCH_SIZE,
  RETRY_CREATE_BATCH_DELAY_MS,
  RETRY_CREATE_BATCH_SIZE,
  chunkArray,
} from '../lib/batchFetch'
import { addDeletedPostIds, loadDeletedPostIds } from '../lib/deletedPostTombstone'
import {
  buildDeletedWorkLogEntryContent,
  buildWorkLogEntryContent,
  buildWorkLogEntryTitle,
  findWorkLogEntryPostsByUserId,
  parseWorkLogEntryFromContent,
} from '../lib/workLogSync'
import { useBoardPostDetail } from './baas/useBoardPostDetail'
import { useCreateWorkLogPost } from './baas/useCreateWorkLogPost'
import { useDeleteBoardPost } from './baas/useDeleteBoardPost'
import { useUpdateBoardPost } from './baas/useUpdateBoardPost'
import { useWorkLogBoardPosts } from './baas/useWorkLogBoardPosts'

const STORAGE_KEY_PREFIX = 'awos_work_log_v1'
// 삭제된(삭제를 시도한) 서버 게시글 id를 계정별로 기록해두는 tombstone 저장 키 접두사(BUG-014).
// 초기 서버 동기화 병합 로직이 이 목록에 있는 게시글은 다시 병합하지 않도록 걸러낸다.
const DELETED_POST_IDS_STORAGE_KEY_PREFIX = 'awos_work_log_deleted_post_ids_v1'

/**
 * 계정별 + 역할별로 스코프된 localStorage 키를 만듭니다.
 * accountId나 role이 없으면(비로그인, 역할 미해당 등) null을 반환해 조회/저장을 막습니다.
 * 주의: 로컬 저장은 즉시 반영을 위한 캐시 성격이며, 이 훅은 best-effort로 "업무기록" 게시판에도
 * 업무기록 데이터를 동기화한다(같은 계정이라면 다른 브라우저/기기에서도 초기 동기화로 병합된다).
 */
function buildStorageKey(accountId: string | null | undefined, role: WorkLogRole | null | undefined): string | null {
  if (!accountId || !role) return null
  return `${STORAGE_KEY_PREFIX}:${role}:${accountId}`
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // crypto.randomUUID를 사용할 수 없으면 아래 fallback을 사용합니다.
  }
  return `wlog-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function loadEntries(storageKey: string): WorkLogEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as WorkLogEntry[]
  } catch {
    return []
  }
}

function saveEntries(storageKey: string, entries: WorkLogEntry[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entries))
  } catch {
    // 저장 공간이 부족하거나 접근이 차단된 경우 조용히 무시합니다.
  }
}

/**
 * 로그인한 계정(account)의 역할(role)별로 분리된 업무기록(정비/관제/운항관리)을 관리합니다.
 * 로컬(localStorage)에 즉시 반영하는 기존 동작은 그대로 유지하면서, "업무기록" 게시판
 * (`2966212a-877c-4964-a927-18e40802b32d`)에도 best-effort로 업무기록 데이터를 동기화합니다.
 *
 * 주의(구조적 한계): 이 게시판은 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는
 * 구조라, 다른 회원이 API를 직접 호출하면 내 업무기록 게시글을 볼 수 있는 한계가 있다(진짜
 * 비공개 저장이 아니다). 화면에서는 본인 게시글만 필터링해서 보여준다.
 */
export function useWorkLogEntries(account: AccountResponse | null | undefined, role: WorkLogRole | null | undefined) {
  const accountId = account?.id
  const userId = account?.user_id
  const storageKey = buildStorageKey(accountId, role)
  const [entries, setEntries] = useState<WorkLogEntry[]>([])
  const [ready, setReady] = useState(false)
  // 초기 서버 동기화 실패 시 화면에 원본 에러 메시지를 보여주기 위한 진단용 상태(FEAT-040).
  // best-effort 원칙은 그대로 유지되며(로컬 동작을 막지 않음), 이 값은 오직 배너 표시용이다.
  const [syncError, setSyncError] = useState<string | null>(null)

  const { createWorkLogPost } = useCreateWorkLogPost()
  const { updatePost } = useUpdateBoardPost()
  const { deletePost } = useDeleteBoardPost()
  const { fetchDetail } = useBoardPostDetail()
  const { refetchAll: refetchAllWorkLogPosts } = useWorkLogBoardPosts({ enabled: false })

  useEffect(() => {
    if (!storageKey) {
      setEntries([])
      setReady(false)
      return
    }
    setEntries(loadEntries(storageKey))
    setReady(true)
  }, [storageKey])

  useEffect(() => {
    if (!ready || !storageKey) return
    saveEntries(storageKey, entries)
  }, [entries, ready, storageKey])

  // 초기 서버 동기화: 계정 로그인 시 서버(게시판)에 저장된 본인 명의(+같은 역할) 업무기록 게시글을
  // 조회해, 로컬에 없는 업무기록(같은 id 없음)만 병합한다. 다른 기기에서 등록한 업무기록도 이
  // 브라우저에서 볼 수 있게 하기 위함이며, best-effort로 실패해도 로컬 데이터는 그대로 보여야 한다.
  // 마운트 시 1회(useEffect)와, 사용자가 버튼으로 직접 재시도(resyncFromServer)하는 경우 양쪽에서
  // 이 로직을 재사용하기 위해 useCallback으로 추출한다(FEAT-041). syncTokenRef는 이 함수가 여러 번
  // (거의) 동시에 실행되거나 언마운트/계정·역할 전환 이후에도 stale한 실행이 setEntries를 호출하는
  // 것을 막기 위한 토큰으로, 새 실행이 시작될 때마다(또는 언마운트 시) 증가시켜 이전 실행을 무효화한다.
  const syncedStorageKeyRef = useRef<string | null>(null)
  const syncTokenRef = useRef(0)

  const runInitialSync = useCallback(async () => {
    if (!storageKey || !userId || !role) return
    const token = ++syncTokenRef.current

    // 이번 시도를 시작하는 시점에 이전 진단 메시지를 지운다(FEAT-040).
    setSyncError(null)
    try {
      const allItems = await refetchAllWorkLogPosts()
      if (!allItems || syncTokenRef.current !== token) return

      // 이미 삭제 처리(tombstone)한 게시글은 서버에 남아있어도 다시 병합하지 않는다(BUG-014).
      const deletedPostIds = accountId ? loadDeletedPostIds(DELETED_POST_IDS_STORAGE_KEY_PREFIX, accountId) : new Set<string>()
      const myPosts = findWorkLogEntryPostsByUserId(allItems, userId, role).filter((post) => !deletedPostIds.has(post.id))
      if (myPosts.length === 0) return

      // 게시글마다 개별 상세조회 API를 호출해야 하므로, 업무기록이 수백 건이면 한꺼번에 수백 개의
      // 요청이 몰려 브라우저 오리진당 동시 연결 수 제한에 걸려 매우 오래 걸린다(BUG-022).
      // 적당한 크기(DETAIL_FETCH_BATCH_SIZE)로 나눠 배치 단위로 순차 처리하고, 배치가 끝날
      // 때마다 즉시 병합해 사용자가 진행 상황을 점진적으로 체감할 수 있게 한다.
      let allRejected = true
      let firstRejectedReason: unknown
      for (const batch of chunkArray(myPosts, DETAIL_FETCH_BATCH_SIZE)) {
        if (syncTokenRef.current !== token) return
        const details = await Promise.allSettled(batch.map((post) => fetchDetail(post.id)))
        if (syncTokenRef.current !== token) return

        for (const result of details) {
          if (result.status === 'fulfilled') {
            allRejected = false
          } else if (firstRejectedReason === undefined) {
            firstRejectedReason = result.reason
          }
        }

        setEntries((prev) => {
          const existingIds = new Set(prev.map((e) => e.id))
          const merged = [...prev]
          for (const result of details) {
            if (result.status !== 'fulfilled') continue
            const parsed = parseWorkLogEntryFromContent(result.value.content)
            if (!parsed) continue
            if (existingIds.has(parsed.id)) continue // 같은 업무기록 id면 스킵(로컬 값을 덮어쓰지 않음)
            existingIds.add(parsed.id)
            merged.push({ ...parsed, syncPostId: result.value.id })
          }
          return merged
        })
      }
      if (syncTokenRef.current !== token) return

      // 목록 조회는 성공했지만 상세 조회가 전부 실패한 경우(예: 401 인증 실패)도 진단 배너에 노출한다(FEAT-040).
      if (allRejected && firstRejectedReason !== undefined) {
        setSyncError(firstRejectedReason instanceof Error ? firstRejectedReason.message : String(firstRejectedReason))
      }
    } catch (err) {
      if (syncTokenRef.current !== token) return
      console.warn('[업무기록 초기 서버 동기화 실패]', err)
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }, [storageKey, userId, role, accountId, refetchAllWorkLogPosts, fetchDetail])

  useEffect(() => {
    if (!ready || !storageKey || !userId || !role) return
    if (syncedStorageKeyRef.current === storageKey) return // 이 계정+역할로는 이미 초기 동기화를 시도함
    syncedStorageKeyRef.current = storageKey
    void runInitialSync()
  }, [ready, storageKey, userId, role, runInitialSync])

  // 언마운트 시 진행 중인 동기화가 이후에도 setEntries를 호출하지 않도록 토큰을 무효화한다.
  useEffect(() => {
    return () => {
      syncTokenRef.current += 1
    }
  }, [])

  /**
   * 사용자가 "서버와 다시 동기화" 버튼 등으로 초기 서버 동기화를 즉시 재시도할 수 있게 하는 함수(FEAT-041).
   * 최초 시도에서 네트워크/서버 오류로 일부(또는 전부) 배치가 실패해도, 새로고침 없이 다시 시도할 수 있다.
   */
  const resyncFromServer = useCallback(() => {
    syncedStorageKeyRef.current = null
    return runInitialSync()
  }, [runInitialSync])

  // 동기화 안 된 업무기록 재시도(BUG-020, BUG-014/BUG-019 후속): addEntry의 서버 게시글 생성은
  // best-effort라 실패하면 syncPostId가 채워지지 않은 채 로컬에만 남는다. 이런 기록은 서버에 전혀
  // 존재하지 않아 다른 기기가 초기 동기화할 때 원천적으로 받아올 수 없다. 같은 렌더링 사이클에서
  // 같은 기록이 중복으로 재시도되지 않도록 처리 중인 id를 ref 세트로 추적한다.
  const retryingSyncPostIdsRef = useRef<Set<string>>(new Set())
  const autoRetriedStorageKeyRef = useRef<string | null>(null)

  /**
   * 미동기화 업무기록(syncPostId가 없는 항목)의 서버 게시글 생성을 재시도한다(BUG-020 후속).
   * 계정+역할이 로드될 때(마운트 시) 자동으로 1회 실행되며(아래 useEffect), 사용자가 "서버와 다시
   * 동기화" 버튼 등으로 이 함수를 직접 다시 호출할 수도 있다(가드 없이 매번 즉시 실행).
   * (BUG-020 후속 2) 한 건씩 순차 처리하면 미동기화 건수가 많을 때(수백 건) 너무 느려서, 작은
   * 동시 배치(RETRY_CREATE_BATCH_SIZE건)로 나눠 배치 내부는 동시에 요청을 보내고, 문서화되지 않은
   * 서버 요청 빈도 제한을 회피하기 위해 배치 사이에만 짧은 지연을 둔다.
   */
  const retryPendingSync = useCallback(async (): Promise<{ attempted: number; succeeded: number }> => {
    if (!storageKey || !userId || !role) return { attempted: 0, succeeded: 0 }

    const inFlight = retryingSyncPostIdsRef.current
    const pending = entries.filter((e) => !e.syncPostId && !inFlight.has(e.id))
    if (pending.length === 0) return { attempted: 0, succeeded: 0 }

    pending.forEach((entry) => inFlight.add(entry.id))

    let succeeded = 0
    const batches = chunkArray(pending, RETRY_CREATE_BATCH_SIZE)
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i]
      const results = await Promise.allSettled(
        batch.map((entry) =>
          createWorkLogPost({
            title: buildWorkLogEntryTitle(userId, role),
            content: buildWorkLogEntryContent(entry),
          }).then((post) => ({ entryId: entry.id, postId: post.id })),
        ),
      )
      batch.forEach((entry) => inFlight.delete(entry.id))

      const succeededPostIds = new Map<string, string>()
      for (const result of results) {
        if (result.status === 'fulfilled') {
          succeededPostIds.set(result.value.entryId, result.value.postId)
          succeeded += 1
        } else {
          console.warn('[업무기록 서버 동기화 재시도 실패]', result.reason)
        }
      }

      if (succeededPostIds.size > 0) {
        setEntries((prev) =>
          prev.map((e) => (succeededPostIds.has(e.id) ? { ...e, syncPostId: succeededPostIds.get(e.id)! } : e)),
        )
      }

      // 배치 사이에만 짧은 지연(마지막 배치 뒤에는 대기하지 않음). 배치 내부의 개별 요청은 동시에 나간다.
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_CREATE_BATCH_DELAY_MS))
      }
    }

    return { attempted: pending.length, succeeded }
  }, [storageKey, userId, role, entries, createWorkLogPost])

  useEffect(() => {
    if (!ready || !storageKey || !userId || !role) return
    if (autoRetriedStorageKeyRef.current === storageKey) return // 이 계정+역할로는 이미 자동 재시도를 시도함(마운트당 1회)
    autoRetriedStorageKeyRef.current = storageKey
    void retryPendingSync()
  }, [ready, storageKey, userId, role, retryPendingSync])

  const addEntry = useCallback(
    (input: WorkLogEntryInput) => {
      const now = Date.now()
      const entry: WorkLogEntry = { ...input, id: generateId(), createdAt: now, updatedAt: now }
      // 로컬에 즉시 반영(기존 동작 유지)
      setEntries((prev) => [entry, ...prev])

      if (userId && role) {
        void (async () => {
          try {
            const post = await createWorkLogPost({
              title: buildWorkLogEntryTitle(userId, role),
              content: buildWorkLogEntryContent(entry),
            })
            setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, syncPostId: post.id } : e)))
          } catch (err) {
            // 게시판 생성이 실패해도 로컬 저장은 유지되어야 하므로 콘솔 경고만 남기고 사용자 흐름은 막지 않는다.
            console.warn('[업무기록 서버 동기화 실패: 생성]', err)
          }
        })()
      }

      return entry
    },
    [userId, role, createWorkLogPost],
  )

  const updateEntry = useCallback(
    (id: string, input: WorkLogEntryInput) => {
      const now = Date.now()
      let updatedEntry: WorkLogEntry | null = null

      // 로컬 수정(기존 동작 유지)
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e
          const updated: WorkLogEntry = { ...e, ...input, updatedAt: now }
          updatedEntry = updated
          return updated
        }),
      )

      if (userId && role && updatedEntry) {
        const entryToSync = updatedEntry
        void (async () => {
          try {
            if (entryToSync.syncPostId) {
              await updatePost(entryToSync.syncPostId, { content: buildWorkLogEntryContent(entryToSync) })
            } else {
              // 과거에 서버 동기화되지 않은 업무기록이면 새로 게시글을 생성해 syncPostId를 채운다.
              const post = await createWorkLogPost({
                title: buildWorkLogEntryTitle(userId, role),
                content: buildWorkLogEntryContent(entryToSync),
              })
              setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, syncPostId: post.id } : e)))
            }
          } catch (err) {
            console.warn('[업무기록 서버 동기화 실패: 수정]', err)
          }
        })()
      }
    },
    [userId, role, updatePost, createWorkLogPost],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      const target = entries.find((e) => e.id === id)

      // 로컬 삭제(기존 동작 유지)
      setEntries((prev) => prev.filter((e) => e.id !== id))

      // 삭제 API 호출 성공 여부와 무관하게 즉시 tombstone에 기록한다(BUG-014: 재로그인 시 되살아남 방지, 하위 호환/추가 방어).
      if (accountId && target?.syncPostId) {
        addDeletedPostIds(DELETED_POST_IDS_STORAGE_KEY_PREFIX, accountId, [target.syncPostId])
      }

      // 서버 게시글에도 삭제 상태를 남긴다(BUG-014 후속: 기기 간 삭제 동기화 불일치 수정).
      // 로컬 tombstone은 이 기기에서만 유효하므로, ① content를 삭제 마커로 갱신(update, best-effort)
      // → ② 게시글 삭제(delete, best-effort) 순서로 시도해 다른 기기 동기화 시에도 병합되지 않게 한다.
      if (target?.syncPostId) {
        const postId = target.syncPostId
        void (async () => {
          try {
            await updatePost(postId, { content: buildDeletedWorkLogEntryContent() })
          } catch (err) {
            console.warn('[업무기록 서버 동기화 실패: 삭제 마킹]', err)
          }
          try {
            await deletePost(postId)
          } catch (err) {
            // 게시글 삭제가 실패해도(이미 삭제됨/네트워크 오류 등) 로컬 삭제는 그대로 유지한다.
            console.warn('[업무기록 서버 동기화 실패: 삭제]', err)
          }
        })()
      }
    },
    [entries, updatePost, deletePost, accountId],
  )

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))

  return {
    entries: sorted,
    ready,
    addEntry,
    updateEntry,
    deleteEntry,
    syncError,
    resyncFromServer,
    retryPendingSync,
  }
}
