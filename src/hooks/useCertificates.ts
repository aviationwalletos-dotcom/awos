import { useCallback, useEffect, useRef, useState } from 'react'

import type { Certificate, CertificateInput } from '../types/certificate'
import type { AccountResponse } from '../lib/baas/types'
import {
  DETAIL_FETCH_BATCH_SIZE,
  RETRY_CREATE_BATCH_DELAY_MS,
  RETRY_CREATE_BATCH_SIZE,
  chunkArray,
} from '../lib/batchFetch'
import { addDeletedPostIds, loadDeletedPostIds } from '../lib/deletedPostTombstone'
import {
  buildCertificateContent,
  buildCertificateTitle,
  buildDeletedCertificateContent,
  findCertificatePostsByUserId,
  parseCertificateFromContent,
} from '../lib/certificateSync'
import { useBoardPostDetail } from './baas/useBoardPostDetail'
import { useCertificateBoardPosts } from './baas/useCertificateBoardPosts'
import { useCreateCertificatePost } from './baas/useCreateCertificatePost'
import { useDeleteBoardPost } from './baas/useDeleteBoardPost'
import { useUpdateBoardPost } from './baas/useUpdateBoardPost'

const STORAGE_KEY_PREFIX = 'awos_certificates_v1'
// 삭제된(삭제를 시도한) 서버 게시글 id를 계정별로 기록해두는 tombstone 저장 키 접두사(BUG-014).
// 초기 서버 동기화 병합 로직이 이 목록에 있는 게시글은 다시 병합하지 않도록 걸러낸다.
const DELETED_POST_IDS_STORAGE_KEY_PREFIX = 'awos_certificates_deleted_post_ids_v1'

/**
 * 계정별로 스코프된 localStorage 키를 만듭니다.
 * accountId가 없으면(비로그인 등) null을 반환해 조회/저장을 막습니다.
 * 주의: 로컬 저장은 즉시 반영을 위한 캐시 성격이며, 이 훅은 best-effort로 "자격증관리" 게시판에도
 * 자격증 데이터를 동기화한다(같은 계정이라면 다른 브라우저/기기에서도 초기 동기화로 병합된다).
 */
function buildStorageKey(accountId: string | null | undefined): string | null {
  if (!accountId) return null
  return `${STORAGE_KEY_PREFIX}:${accountId}`
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // crypto.randomUUID를 사용할 수 없으면 아래 fallback을 사용합니다.
  }
  return `cert-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function loadCertificates(storageKey: string): Certificate[] {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Certificate[]
  } catch {
    return []
  }
}

function saveCertificates(storageKey: string, certificates: Certificate[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(certificates))
  } catch {
    // 저장 공간이 부족하거나 접근이 차단된 경우 조용히 무시합니다.
  }
}

/**
 * 로그인한 계정(account)별로 분리된 자격증 데이터를 관리합니다.
 * 로컬(localStorage)에 즉시 반영하는 기존 동작은 그대로 유지하면서, "자격증관리" 게시판
 * (`d4df52f6-fd5d-4a19-a252-7a2ffd9e245d`)에도 best-effort로 자격증 데이터를 동기화합니다.
 *
 * 주의(구조적 한계): 이 게시판은 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는
 * 구조라, 다른 회원이 API를 직접 호출하면 내 자격증 게시글을 볼 수 있는 한계가 있다(진짜
 * 비공개 저장이 아니다). 화면에서는 본인 게시글만 필터링해서 보여준다.
 */
export function useCertificates(account: AccountResponse | null | undefined) {
  const accountId = account?.id
  const userId = account?.user_id
  const storageKey = buildStorageKey(accountId)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [ready, setReady] = useState(false)
  // 초기 서버 동기화 실패 시 화면에 원본 에러 메시지를 보여주기 위한 진단용 상태(FEAT-040).
  // best-effort 원칙은 그대로 유지되며(로컬 동작을 막지 않음), 이 값은 오직 배너 표시용이다.
  const [syncError, setSyncError] = useState<string | null>(null)

  const { createCertificatePost } = useCreateCertificatePost()
  const { updatePost } = useUpdateBoardPost()
  const { deletePost } = useDeleteBoardPost()
  const { fetchDetail } = useBoardPostDetail()
  const { refetchAll: refetchAllCertificatePosts } = useCertificateBoardPosts({ enabled: false })

  useEffect(() => {
    if (!storageKey) {
      setCertificates([])
      setReady(false)
      return
    }
    setCertificates(loadCertificates(storageKey))
    setReady(true)
  }, [storageKey])

  useEffect(() => {
    if (!ready || !storageKey) return
    saveCertificates(storageKey, certificates)
  }, [certificates, ready, storageKey])

  // 초기 서버 동기화: 계정 로그인 시 서버(게시판)에 저장된 본인 명의 자격증 게시글을 조회해,
  // 로컬에 없는 자격증(같은 id가 없는 것)만 병합한다. 다른 기기에서 등록한 자격증을 이 브라우저에서도
  // 볼 수 있게 하기 위함이며, best-effort로 실패해도 로컬 데이터는 그대로 보여야 한다.
  // 마운트 시 1회(useEffect)와, 사용자가 버튼으로 직접 재시도(resyncFromServer)하는 경우 양쪽에서
  // 이 로직을 재사용하기 위해 useCallback으로 추출한다(FEAT-041). syncTokenRef는 이 함수가 여러 번
  // (거의) 동시에 실행되거나 언마운트/계정 전환 이후에도 stale한 실행이 setCertificates를 호출하는
  // 것을 막기 위한 토큰으로, 새 실행이 시작될 때마다(또는 언마운트 시) 증가시켜 이전 실행을 무효화한다.
  const syncedStorageKeyRef = useRef<string | null>(null)
  const syncTokenRef = useRef(0)

  const runInitialSync = useCallback(async () => {
    if (!storageKey || !userId) return
    const token = ++syncTokenRef.current

    // 이번 시도를 시작하는 시점에 이전 진단 메시지를 지운다(FEAT-040).
    setSyncError(null)
    try {
      const allItems = await refetchAllCertificatePosts()
      if (!allItems || syncTokenRef.current !== token) return

      // 이미 삭제 처리(tombstone)한 게시글은 서버에 남아있어도 다시 병합하지 않는다(BUG-014).
      const deletedPostIds = accountId ? loadDeletedPostIds(DELETED_POST_IDS_STORAGE_KEY_PREFIX, accountId) : new Set<string>()
      const myPosts = findCertificatePostsByUserId(allItems, userId).filter((post) => !deletedPostIds.has(post.id))
      if (myPosts.length === 0) return

      // 게시글마다 개별 상세조회 API를 호출해야 하므로, 자격증이 수백 건이면 한꺼번에 수백 개의
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

        setCertificates((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const merged = [...prev]
          for (const result of details) {
            if (result.status !== 'fulfilled') continue
            const parsed = parseCertificateFromContent(result.value.content)
            if (!parsed) continue
            if (existingIds.has(parsed.id)) continue // 같은 자격증 id면 스킵(로컬 값을 덮어쓰지 않음)
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
      console.warn('[자격증 초기 서버 동기화 실패]', err)
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }, [storageKey, userId, accountId, refetchAllCertificatePosts, fetchDetail])

  useEffect(() => {
    if (!ready || !storageKey || !userId) return
    if (syncedStorageKeyRef.current === storageKey) return // 이 계정으로는 이미 초기 동기화를 시도함
    syncedStorageKeyRef.current = storageKey
    void runInitialSync()
  }, [ready, storageKey, userId, runInitialSync])

  // 언마운트 시 진행 중인 동기화가 이후에도 setCertificates를 호출하지 않도록 토큰을 무효화한다.
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

  // 동기화 안 된 자격증 재시도(BUG-020, BUG-014/BUG-019 후속): addCertificate의 서버 게시글
  // 생성은 best-effort라 실패하면 syncPostId가 채워지지 않은 채 로컬에만 남는다. 이런 기록은 서버에
  // 전혀 존재하지 않아 다른 기기가 초기 동기화할 때 원천적으로 받아올 수 없다. 같은 렌더링 사이클에서
  // 같은 기록이 중복으로 재시도되지 않도록 처리 중인 id를 ref 세트로 추적한다.
  const retryingSyncPostIdsRef = useRef<Set<string>>(new Set())
  const autoRetriedStorageKeyRef = useRef<string | null>(null)

  /**
   * 미동기화 자격증(syncPostId가 없는 항목)의 서버 게시글 생성을 재시도한다(BUG-020 후속).
   * 계정이 로드될 때(마운트 시) 자동으로 1회 실행되며(아래 useEffect), 사용자가 "서버와 다시
   * 동기화" 버튼 등으로 이 함수를 직접 다시 호출할 수도 있다(가드 없이 매번 즉시 실행).
   * (BUG-020 후속 2) 한 건씩 순차 처리하면 미동기화 건수가 많을 때(수백 건) 너무 느려서, 작은
   * 동시 배치(RETRY_CREATE_BATCH_SIZE건)로 나눠 배치 내부는 동시에 요청을 보내고, 문서화되지 않은
   * 서버 요청 빈도 제한을 회피하기 위해 배치 사이에만 짧은 지연을 둔다.
   */
  const retryPendingSync = useCallback(async (): Promise<{ attempted: number; succeeded: number }> => {
    if (!storageKey || !userId) return { attempted: 0, succeeded: 0 }

    const inFlight = retryingSyncPostIdsRef.current
    const pending = certificates.filter((c) => !c.syncPostId && !inFlight.has(c.id))
    if (pending.length === 0) return { attempted: 0, succeeded: 0 }

    pending.forEach((certificate) => inFlight.add(certificate.id))

    let succeeded = 0
    const batches = chunkArray(pending, RETRY_CREATE_BATCH_SIZE)
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i]
      const results = await Promise.allSettled(
        batch.map((certificate) =>
          createCertificatePost({
            title: buildCertificateTitle(userId),
            content: buildCertificateContent(certificate),
          }).then((post) => ({ certificateId: certificate.id, postId: post.id })),
        ),
      )
      batch.forEach((certificate) => inFlight.delete(certificate.id))

      const succeededPostIds = new Map<string, string>()
      for (const result of results) {
        if (result.status === 'fulfilled') {
          succeededPostIds.set(result.value.certificateId, result.value.postId)
          succeeded += 1
        } else {
          console.warn('[자격증 서버 동기화 재시도 실패]', result.reason)
        }
      }

      if (succeededPostIds.size > 0) {
        setCertificates((prev) =>
          prev.map((c) => (succeededPostIds.has(c.id) ? { ...c, syncPostId: succeededPostIds.get(c.id)! } : c)),
        )
      }

      // 배치 사이에만 짧은 지연(마지막 배치 뒤에는 대기하지 않음). 배치 내부의 개별 요청은 동시에 나간다.
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_CREATE_BATCH_DELAY_MS))
      }
    }

    return { attempted: pending.length, succeeded }
  }, [storageKey, userId, certificates, createCertificatePost])

  useEffect(() => {
    if (!ready || !storageKey || !userId) return
    if (autoRetriedStorageKeyRef.current === storageKey) return // 이 계정으로는 이미 자동 재시도를 시도함(마운트당 1회)
    autoRetriedStorageKeyRef.current = storageKey
    void retryPendingSync()
  }, [ready, storageKey, userId, retryPendingSync])

  const addCertificate = useCallback(
    (input: CertificateInput) => {
      const now = Date.now()
      const certificate: Certificate = {
        ...input,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }
      // 로컬에 즉시 반영(기존 동작 유지)
      setCertificates((prev) => [certificate, ...prev])

      if (userId) {
        void (async () => {
          try {
            const post = await createCertificatePost({
              title: buildCertificateTitle(userId),
              content: buildCertificateContent(certificate),
            })
            setCertificates((prev) => prev.map((c) => (c.id === certificate.id ? { ...c, syncPostId: post.id } : c)))
          } catch (err) {
            // 게시판 생성이 실패해도 로컬 저장은 유지되어야 하므로 콘솔 경고만 남기고 사용자 흐름은 막지 않는다.
            console.warn('[자격증 서버 동기화 실패: 생성]', err)
          }
        })()
      }

      return certificate
    },
    [userId, createCertificatePost],
  )

  const updateCertificate = useCallback(
    (id: string, input: CertificateInput) => {
      const now = Date.now()
      const current = certificates.find((c) => c.id === id)
      if (!current) return
      const updated: Certificate = { ...current, ...input, updatedAt: now }

      // 로컬 수정(기존 동작 유지)
      setCertificates((prev) => prev.map((c) => (c.id === id ? updated : c)))

      if (userId) {
        void (async () => {
          try {
            if (updated.syncPostId) {
              await updatePost(updated.syncPostId, { content: buildCertificateContent(updated) })
            } else {
              // 과거에 서버 동기화되지 않은 자격증이면 새로 게시글을 생성해 syncPostId를 채운다.
              const post = await createCertificatePost({
                title: buildCertificateTitle(userId),
                content: buildCertificateContent(updated),
              })
              setCertificates((prev) => prev.map((c) => (c.id === id ? { ...c, syncPostId: post.id } : c)))
            }
          } catch (err) {
            console.warn('[자격증 서버 동기화 실패: 수정]', err)
          }
        })()
      }
    },
    [certificates, userId, updatePost, createCertificatePost],
  )

  const deleteCertificate = useCallback(
    (id: string) => {
      const target = certificates.find((c) => c.id === id)

      // 로컬 삭제(기존 동작 유지)
      setCertificates((prev) => prev.filter((c) => c.id !== id))

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
            await updatePost(postId, { content: buildDeletedCertificateContent() })
          } catch (err) {
            console.warn('[자격증 서버 동기화 실패: 삭제 마킹]', err)
          }
          try {
            await deletePost(postId)
          } catch (err) {
            // 게시글 삭제가 실패해도(이미 삭제됨/네트워크 오류 등) 로컬 삭제는 그대로 유지한다.
            console.warn('[자격증 서버 동기화 실패: 삭제]', err)
          }
        })()
      }
    },
    [certificates, updatePost, deletePost, accountId],
  )

  // 만료일이 있는 자격증을 만료일 오름차순으로 먼저 보여주고, 만료 개념이 없는 자격증(조종사 자격증명/한정/조종교육증명 등)은 뒤로 정렬합니다.
  const sorted = [...certificates].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : 0
  })

  return {
    certificates: sorted,
    ready,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    syncError,
    resyncFromServer,
    retryPendingSync,
  }
}
