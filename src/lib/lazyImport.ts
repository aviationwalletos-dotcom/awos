// 동적 import(lazy 페이지·PDF 모듈·xlsx) 실패 시 자동 복구.
//
// 배경: 배포가 되면 조각 파일 이름(해시)이 바뀐다. 이미 열어둔 옛 앱이 나중에 조각을 요청하면
// 서버에 그 파일이 없어 "Failed to fetch dynamically imported module" 로 실패한다.
// 사용자에게 새로고침을 시키는 대신, 한 번만 자동으로 새로고침해 새 버전을 받게 한다.
// (같은 조각에서 새로고침 뒤에도 또 실패하면 진짜 오류이므로 그대로 던진다)

const RELOAD_FLAG_PREFIX = 'awos:chunk-reload:'

function isChunkLoadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|error loading dynamically imported module/i.test(message)
}

export async function importWithReload<T>(key: string, loader: () => Promise<T>): Promise<T> {
  try {
    const mod = await loader()
    try {
      window.sessionStorage.removeItem(RELOAD_FLAG_PREFIX + key)
    } catch {
      // 무시
    }
    return mod
  } catch (err) {
    if (!isChunkLoadError(err)) throw err
    let alreadyReloaded = false
    try {
      alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG_PREFIX + key) === '1'
      if (!alreadyReloaded) window.sessionStorage.setItem(RELOAD_FLAG_PREFIX + key, '1')
    } catch {
      // sessionStorage 사용 불가 환경 — 그냥 새로고침 시도
    }
    if (alreadyReloaded) throw err
    // 새 배포본을 받도록 새로고침. 이 Promise 는 페이지가 내려가며 끝나지 않으므로 pending 으로 둔다.
    window.location.reload()
    return new Promise<T>(() => undefined)
  }
}

/** 사용자에게 보여줄 안내 문구 — 새로고침으로 해결되는 오류인지 알려준다 */
export function describeImportError(err: unknown): string {
  if (isChunkLoadError(err)) return '앱이 새 버전으로 업데이트되었어요. 화면을 새로고침한 뒤 다시 시도해 주세요.'
  return err instanceof Error ? err.message : String(err)
}
