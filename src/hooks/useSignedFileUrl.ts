// [SEC-003] 첨부 이미지 표시 훅
//
// 스토리지 버킷(board-files)이 비공개로 전환되면 기존의 public URL은 그대로 열리지 않는다.
// 이 훅은 저장된 값이 data: URL이면 그대로, 스토리지 URL이면 로그인 토큰으로 만료형
// 서명 URL을 발급해 돌려준다. 발급 실패 시 원본 값을 폴백으로 반환해, 버킷을 아직
// 비공개로 전환하지 않은 기간에도 화면이 깨지지 않는다(전환 전·후 모두 호환).

import { useEffect, useState } from 'react'

import { createSignedBoardFileUrl } from '../lib/baas/supabaseTransport'

export function useSignedFileUrl(raw: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (!raw) {
      setUrl(null)
      return
    }
    if (raw.startsWith('data:')) {
      setUrl(raw)
      return
    }
    setUrl(null)
    void createSignedBoardFileUrl(raw).then((signed) => {
      if (alive) setUrl(signed ?? raw)
    })
    return () => {
      alive = false
    }
  }, [raw])

  return url
}
