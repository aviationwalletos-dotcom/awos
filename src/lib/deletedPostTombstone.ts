// 서버 게시글 삭제 tombstone 유틸 (BUG-014)
//
// 배경: 비행기록/자격증/업무기록 삭제 시 연결된 서버 게시글 삭제(DELETE)는 best-effort로
// 시도되며, 실패해도(네트워크 오류, 배포 환경의 일시적 인증/경로 문제 등) 로컬 삭제는 그대로
// 유지된다. 문제는, 로그인할 때마다 실행되는 "초기 서버 동기화" 병합 로직이 서버에 남아있는
// 게시글을 "로컬에 없는 새 항목"으로 오인해 무조건 다시 병합해버린다는 점이다. 그 결과 서버
// 게시글 삭제가 실패/지연된 경우, 로컬에서는 지웠지만 다음 로그인 때 그 기록이 되살아난다.
//
// 해결: 삭제를 시도한 게시글 id를 계정별 localStorage에 tombstone(삭제 완료 표시)으로 기록해두고,
// 초기 동기화 병합 로직이 이 목록에 있는 게시글은 서버에 남아있어도 다시 병합하지 않도록 걸러낸다.
// 삭제 API 호출이 실패/지연되어도 최소한 "되살아나는" 문제는 방지된다(백그라운드 삭제 재시도는
// 이번 범위 밖 — 로컬 삭제 시점에 tombstone만 남기면 충분하다).

function buildTombstoneStorageKey(featurePrefix: string, accountId: string): string {
  return `${featurePrefix}:${accountId}`
}

function loadTombstoneSet(storageKey: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function saveTombstoneSet(storageKey: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)))
  } catch {
    // 저장 공간 부족/접근 차단 시 조용히 무시합니다.
  }
}

/**
 * 계정별 tombstone 목록에 게시글 id들을 추가합니다.
 * 삭제 API 호출 성공 여부와 무관하게, 로컬 삭제와 동시에 즉시 호출해야 합니다
 * (best-effort 삭제 호출이 실패해도 이미 tombstone에 있으므로 재부활하지 않습니다).
 */
export function addDeletedPostIds(featurePrefix: string, accountId: string, postIds: string[]): void {
  if (postIds.length === 0) return
  const storageKey = buildTombstoneStorageKey(featurePrefix, accountId)
  const current = loadTombstoneSet(storageKey)
  let changed = false
  for (const id of postIds) {
    if (!current.has(id)) {
      current.add(id)
      changed = true
    }
  }
  if (changed) saveTombstoneSet(storageKey, current)
}

/**
 * 계정별 tombstone 목록을 불러옵니다.
 * 초기 서버 동기화 병합 시 이 목록에 있는 게시글 id는 병합 대상에서 제외해야 합니다.
 */
export function loadDeletedPostIds(featurePrefix: string, accountId: string): Set<string> {
  return loadTombstoneSet(buildTombstoneStorageKey(featurePrefix, accountId))
}
