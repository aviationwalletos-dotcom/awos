// 미리보기/빌드 공통으로 자산 절대 경로를 만들어주기 위한 헬퍼
// 우선순위: document.baseURI(런타임에서 <base> 주입) → __PREVIEW_BASE__ → 현재 location
let _cachedBaseUrl: string | null = null

export function getPreviewBaseUrl(): string {
  if (_cachedBaseUrl !== null) return _cachedBaseUrl

  let base = ''

  try {
    if (typeof document !== 'undefined' && typeof document.baseURI === 'string') {
      base = document.baseURI
    }
  } catch {
    // document에 접근할 수 없으면 다음 후보로 넘어간다
  }

  if (!base) {
    try {
      const previewBase =
        (typeof window !== 'undefined' && (window as { __PREVIEW_BASE__?: unknown }).__PREVIEW_BASE__) || ''
      base = typeof previewBase === 'string' ? previewBase : ''
    } catch {
      // __PREVIEW_BASE__에 접근할 수 없으면 다음 후보로 넘어간다
    }
  }

  if (!base) {
    try {
      base = typeof window !== 'undefined' && window.location?.href ? window.location.href : ''
    } catch {
      // location에 접근할 수 없으면 빈 값으로 둔다
    }
  }

  _cachedBaseUrl = base
  return base
}

let _cachedBasePathname: string | null = null

function extractPreviewBasePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const match = normalized.match(/^\/(?:local|dev|stg|stage|prod)\/preview\/[^/]+\/[^/]+/)
  return match ? match[0] : '/'
}

export function getPreviewBasePathname(): string {
  if (_cachedBasePathname !== null) return _cachedBasePathname
  try {
    const baseUrl = getPreviewBaseUrl()
    if (!baseUrl) return '/'
    const parsed = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    _cachedBasePathname = extractPreviewBasePathname(parsed.pathname)
    return _cachedBasePathname
  } catch {
    _cachedBasePathname = '/'
    return '/'
  }
}

export function assetUrl(rel: string): string {
  const cleaned = rel && rel.startsWith('/') ? rel.slice(1) : rel

  const base = getPreviewBaseUrl()

  if (!cleaned) return base

  try {
    return new URL(cleaned, base || 'http://localhost/').toString()
  } catch {
    return (base || '') + cleaned
  }
}
