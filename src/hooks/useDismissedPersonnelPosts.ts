// 기관 대시보드 "구성원 현황" 탭에서, 관리자가 특정 회원(상태공유 게시글) 항목을
// "이 계정 화면에서만" 제외(숨기기)할 수 있게 하는 로컬 전용 훅.
//
// 배경(구조적 제약): 이 프로젝트가 사용할 수 있는 BaaS 계정 기능에는 회원 탈퇴(계정 삭제) API도,
// "현재 존재하는 계정 목록을 조회"하는 API도 없다(features.json 기준). "구성원 현황"은 "상태공유"
// 동적 게시판 게시글을 모아 보여주는 구조인데, 게시글은 계정과 독립적으로 존재하는 데이터라
// 계정이 삭제돼도 게시글이 자동으로 지워지지 않고, 이 앱에는 "이 게시글 작성자 계정이 아직
// 존재하는지" 확인할 방법 자체가 없다. 즉 탈퇴 여부를 자동으로 감지해 필터링하는 것은 불가능하다.
// 또한 게시글 삭제(`DELETE /boards/posts/{post_id}`)는 작성자 본인만 호출할 수 있어, 기관 관리자에게
// 다른 회원의 게시글을 실제로 삭제할 권한도 없다.
//
// 대응: 기관 계정별로 스코프된 localStorage에 "숨김 처리한 게시글 id" 목록을 저장해, 그 기관
// 계정으로 이 화면을 볼 때만 걸러낸다. 실제 게시글은 삭제되지 않으며, 다른 기관 관리자의 화면이나
// 서버 데이터에는 전혀 영향을 주지 않는다.

import { useCallback, useEffect, useState } from 'react'

const STORAGE_PREFIX = 'awos_dismissed_personnel_posts'

function buildStorageKey(accountId: string): string {
  return `${STORAGE_PREFIX}:${accountId}`
}

function loadDismissedIds(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

function saveDismissedIds(storageKey: string, ids: string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids))
  } catch {
    // 저장 공간이 부족하거나 접근이 차단된 경우 조용히 무시합니다.
  }
}

interface UseDismissedPersonnelPostsReturn {
  /** 이 기관 계정이 숨김 처리한 상태공유 게시글 id 집합. */
  dismissedIds: Set<string>
  /** 게시글 id를 숨김 목록에 추가합니다(즉시 반영, 확인 절차 없음). */
  dismiss: (postId: string) => void
  /** 게시글 id를 숨김 목록에서 제거해 다시 노출시킵니다. */
  restore: (postId: string) => void
}

export function useDismissedPersonnelPosts(
  accountId: string | null | undefined,
): UseDismissedPersonnelPostsReturn {
  const storageKey = accountId ? buildStorageKey(accountId) : null
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!storageKey) {
      setDismissedIds(new Set())
      return
    }
    setDismissedIds(new Set(loadDismissedIds(storageKey)))
  }, [storageKey])

  const dismiss = useCallback(
    (postId: string) => {
      if (!storageKey) return
      setDismissedIds((prev) => {
        if (prev.has(postId)) return prev
        const next = new Set(prev)
        next.add(postId)
        saveDismissedIds(storageKey, Array.from(next))
        return next
      })
    },
    [storageKey],
  )

  const restore = useCallback(
    (postId: string) => {
      if (!storageKey) return
      setDismissedIds((prev) => {
        if (!prev.has(postId)) return prev
        const next = new Set(prev)
        next.delete(postId)
        saveDismissedIds(storageKey, Array.from(next))
        return next
      })
    },
    [storageKey],
  )

  return { dismissedIds, dismiss, restore }
}
