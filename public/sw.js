/*
 * AWOS 서비스 워커 — 홈화면 설치(PWA) + 오프라인 재열람 지원
 *
 * 전략(보수적으로 설계):
 * - API 요청은 절대 가로채지 않는다: 데이터 요청 캐싱은 동기화 로직을 오염시킬 수 있다.
 *   (현재 모든 API는 코드 내부에서 Supabase로 직접 통신하므로 SW에 도달하는 API 경로 자체가 없다.)
 * - 페이지 이동(navigate): 네트워크 우선, 실패 시(오프라인) 캐시된 앱 셸(index.html)로 폴백.
 *   앱 자체가 로컬우선 구조라, 셸만 열리면 격납고 앞 오프라인 상태에서도 기록 열람이 된다.
 * - 정적 자산(/assets/*, /icons/*, 매니페스트): 캐시 우선. 파일명에 해시가 붙어 있어 안전하다.
 */
const CACHE = 'awos-shell-v4'
const MAX_STATIC_ENTRIES = 120 // 해시 파일명이 배포마다 바뀌므로 오래된 항목을 정리한다

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  const isStatic =
    url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/') || url.pathname === '/manifest.webmanifest'
  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then(async (c) => {
                await c.put(req, copy)
                const keys = await c.keys()
                if (keys.length > MAX_STATIC_ENTRIES) {
                  await Promise.all(keys.slice(0, keys.length - MAX_STATIC_ENTRIES).map((k) => c.delete(k)))
                }
              })
            }
            return res
          }),
      ),
    )
  }
})
