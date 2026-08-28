// "개인설정" 게시판 조회 + upsert(있으면 갱신/없으면 생성) 공용 훅.
//
// useIndividualRoleOverride / useOrganizationAffiliationOverride / useCurrencyOverrides 3개 훅이
// 공통으로 사용한다(각 훅이 각자 서버 게시글을 만들면 게시글이 3개로 늘어나므로, "계정당 딱 1개의
// 개인설정 게시글"을 계속 함께 조회/upsert하도록 이 훅으로 통합했다). 로컬(localStorage) 저장 자체는
// 여전히 각 훅이 담당하고, 이 훅은 서버 동기화(best-effort)만 담당한다.
//
// 동시성 주의: upsert 시점마다 이 계정의 5개 필드를 localStorage에서 새로 읽어(read-modify-write)
// 전체를 다시 보내므로, 한 훅에서만 바뀐 필드라도 다른 훅이 로컬에 저장해 둔 최신 필드 값을 함께
// 실어 보낸다(다른 필드를 과거 값으로 덮어쓰지 않는다). post_id는 최초 조회 또는 최초 생성 성공 시
// 이 훅 인스턴스 내에 기억해두어, 이후 upsert는 매번 목록을 다시 조회하지 않고 바로 PUT한다.

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccountResponse } from '../../lib/baas/types'
import {
  type ProfileSettings,
  buildProfileSettingsContent,
  buildProfileSettingsTitle,
  findProfileSettingsPostByUserId,
  parseProfileSettingsFromContent,
  readLocalProfileSettings,
} from '../../lib/profileSettingsSync'
import { useBoardPostDetail } from './useBoardPostDetail'
import { useCreateProfileSettingsPost } from './useCreateProfileSettingsPost'
import { useProfileSettingsBoardPosts } from './useProfileSettingsBoardPosts'
import { useUpdateBoardPost } from './useUpdateBoardPost'

interface UseProfileSettingsSyncReturn {
  /** 초기 서버 조회(본인 게시글 탐색 + 상세 조회)가 완료되었는지 여부. */
  ready: boolean
  /** 서버에 저장되어 있던 개인설정(파싱 결과). 게시글이 없거나 조회 실패 시 null. */
  serverSettings: ProfileSettings | null
  /**
   * 이 계정의 로컬(localStorage) 5개 필드를 다시 읽어(read-modify-write) 서버에 best-effort로
   * upsert한다(있으면 PUT, 없으면 POST 후 post_id를 기억). 실패해도 콘솔 경고만 남기고 예외를
   * 던지지 않는다 — 호출부(각 override 훅)의 로컬 저장/화면 흐름을 막지 않기 위함.
   */
  syncNow: () => void
}

export function useProfileSettingsSync(account: AccountResponse | null | undefined): UseProfileSettingsSyncReturn {
  const accountId = account?.id
  const userId = account?.user_id

  const [ready, setReady] = useState(false)
  const [serverSettings, setServerSettings] = useState<ProfileSettings | null>(null)
  const postIdRef = useRef<string | null>(null)

  const { refetch: refetchProfileSettingsPosts } = useProfileSettingsBoardPosts({ enabled: false })
  const { fetchDetail } = useBoardPostDetail()
  const { createProfileSettingsPost } = useCreateProfileSettingsPost()
  const { updatePost } = useUpdateBoardPost()

  // 초기 서버 조회: 계정(이메일)당 최초 1회만 시도한다.
  const discoveredForUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!userId) {
      setReady(false)
      setServerSettings(null)
      postIdRef.current = null
      discoveredForUserIdRef.current = null
      return
    }
    if (discoveredForUserIdRef.current === userId) return
    discoveredForUserIdRef.current = userId

    let cancelled = false

    void (async () => {
      try {
        const list = await refetchProfileSettingsPosts()
        if (!list || cancelled) return

        const found = findProfileSettingsPostByUserId(list.items, userId)
        if (!found) return

        const detail = await fetchDetail(found.id)
        if (cancelled) return

        postIdRef.current = detail.id
        setServerSettings(parseProfileSettingsFromContent(detail.content))
      } catch (err) {
        console.warn('[개인설정 초기 서버 조회 실패]', err)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, refetchProfileSettingsPosts, fetchDetail])

  const syncNow = useCallback(() => {
    if (!userId || !accountId) return

    void (async () => {
      try {
        // 이 계정의 5개 필드를 localStorage에서 새로 읽어(read-modify-write) 전체를 다시 보낸다.
        // 다른 override 훅이 방금 저장한 필드 값도 함께 실어 보내므로, 이 훅 하나만 바뀌었더라도
        // 다른 필드를 과거 값으로 덮어쓰지 않는다.
        const snapshot = readLocalProfileSettings(accountId)
        const title = buildProfileSettingsTitle(userId)
        const content = buildProfileSettingsContent(snapshot)

        if (postIdRef.current) {
          await updatePost(postIdRef.current, { title, content })
        } else {
          const created = await createProfileSettingsPost({ title, content })
          postIdRef.current = created.id
        }
        setServerSettings(snapshot)
      } catch (err) {
        // 게시판 동기화가 실패해도 로컬 저장/화면 흐름은 그대로 유지되어야 하므로 콘솔 경고만 남긴다.
        console.warn('[개인설정 서버 동기화 실패]', err)
      }
    })()
  }, [userId, accountId, updatePost, createProfileSettingsPost])

  return { ready, serverSettings, syncNow }
}
