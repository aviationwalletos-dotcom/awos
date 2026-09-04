// 승인 패널 첨부 사진(서명 URL) 캐시
//
// 배경: 관리자 패널의 승인 요청 카드는 첨부 사진을 얻으려고 카드마다
//   1) 게시글 상세 조회  2) 비공개 저장소 서명 URL 발급
// 을 수행했다. 카드가 화면에 뜨는 순간 무조건 실행돼, 요청이 100건이면
// 새로고침 한 번에 200번의 네트워크 호출이 나갔다.
//
// 이제 사용자가 "첨부 사진 보기"를 누른 카드만 불러오고, 그 결과를 짧게 캐시한다.
// 서명 URL은 만료가 있으므로 TTL 을 짧게 잡는다(만료 전 재사용만 노린다).

const TTL_MS = 4 * 60 * 1000

const cache = new Map<string, { url: string | null; at: number }>()

/** 캐시에 있으면 URL(또는 첨부 없음을 뜻하는 null), 없거나 만료면 undefined */
export function getCachedAttachmentUrl(postId: string): string | null | undefined {
  const hit = cache.get(postId)
  if (!hit) return undefined
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(postId)
    return undefined
  }
  return hit.url
}

export function setCachedAttachmentUrl(postId: string, url: string | null): void {
  cache.set(postId, { url, at: Date.now() })
}

/** 승인/반려 등으로 목록을 다시 읽을 때 호출 — 오래된 서명 URL 이 남지 않게 한다 */
export function clearAttachmentCache(): void {
  cache.clear()
}
