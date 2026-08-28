// BaaS API 호출 공통 재시도 유틸리티
//
// 배경(BUG-020/BUG-022 근본 원인): 엑셀 대량 가져오기처럼 짧은 시간에 수백 건의 게시글 생성
// 요청이 몰리면, 서버의 (문서화되지 않은) 요청 빈도 제한에 걸려 상당수가 429/5xx로 거절된다.
// 기존 생성/수정 API 훅은 재시도가 전혀 없어, 한 번 거절당한 기록은 그대로 실패 처리되어
// syncPostId가 채워지지 않은 채 로컬에만 남았다(→ 다른 기기에서 영영 볼 수 없음, "기기마다
// 비행시간이 다름"의 근본 원인).
//
// 이 유틸리티는 일시적으로 실패할 수 있는(retryable) 요청을 지수 백오프로 자동 재시도한다.
// - 429(Too Many Requests) / 5xx(서버 일시 오류) / 네트워크 예외(fetch reject)만 재시도한다.
// - 4xx(400/401/403/404 등 "다시 보내도 똑같이 실패"하는 클라이언트 오류)는 재시도하지 않고 즉시 던진다.
// - 매 재시도마다 대기 시간을 늘리고(지수), 소량의 무작위 지터를 더해 여러 요청이 동시에
//   같은 순간 재시도(thundering herd)하는 것을 피한다.

/** 재시도 대상임을 표시하는 에러(HTTP 상태 코드를 함께 실어 호출부가 판단할 수 있게 한다). */
export class RetryableHttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'RetryableHttpError'
    this.status = status
  }
}

export interface RetryOptions {
  /** 최대 시도 횟수(최초 시도 포함). 기본값: 5 → 최초 1회 + 재시도 4회. */
  maxAttempts?: number
  /** 첫 재시도 전 대기(ms). 기본값: 500ms. 이후 시도마다 2배씩 증가한다. */
  baseDelayMs?: number
  /** 대기 상한(ms). 지수 증가가 이 값을 넘지 않는다. 기본값: 8000ms. */
  maxDelayMs?: number
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_BASE_DELAY_MS = 500
const DEFAULT_MAX_DELAY_MS = 8000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** HTTP 상태 코드가 "재시도해볼 가치가 있는" 일시적 오류인지 판단한다. */
export function isRetryableStatus(status: number): boolean {
  // 429: 요청 과다(빈도 제한). 408: 요청 타임아웃. 5xx: 서버 일시 오류.
  return status === 429 || status === 408 || status >= 500
}

/**
 * 주어진 비동기 작업을 지수 백오프로 재시도한다.
 *
 * `task`는 다음 규칙을 따라야 한다:
 * - 재시도 가능한 실패는 `RetryableHttpError`(또는 네트워크 예외)를 던진다.
 * - 재시도 불가능한 실패(4xx 등)는 일반 `Error`를 던진다 → 즉시 상위로 전파된다.
 *
 * 네트워크 예외(fetch가 TypeError로 reject되는 경우)는 상태 코드가 없으므로 재시도 대상으로 본다.
 */
export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const baseDelay = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxDelay = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await task()
    } catch (err) {
      lastError = err

      // 재시도 가능 여부 판단: RetryableHttpError면 상태 코드로, 그 외에는 네트워크 예외로 간주.
      const retryable =
        err instanceof RetryableHttpError
          ? isRetryableStatus(err.status)
          : err instanceof TypeError // fetch 자체가 실패(오프라인/연결 끊김 등)하면 TypeError를 던진다.

      // 재시도 불가이거나 마지막 시도였다면 즉시 전파한다.
      if (!retryable || attempt === maxAttempts) {
        throw err instanceof Error ? err : new Error(String(err))
      }

      // 지수 백오프 + 지터(대기 시간의 0~25%를 무작위로 더한다).
      const backoff = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay)
      const jitter = backoff * 0.25 * Math.random()
      await sleep(backoff + jitter)
    }
  }

  // 이론상 도달하지 않지만, 타입 안전을 위해 마지막 에러를 던진다.
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/**
 * BaaS 공통 응답 처리 + 재시도 판단을 한 곳에서 처리하는 헬퍼.
 *
 * fetch 응답을 받아:
 * - HTTP 상태가 재시도 가능(429/5xx 등)하면 `RetryableHttpError`를 던진다(→ withRetry가 재시도).
 * - 그 외 비정상 상태이거나 `result !== 'SUCCESS'`면 일반 `Error`를 던진다(→ 재시도 없이 전파).
 * - 정상이면 `result.data`를 반환한다.
 */
export async function handleBaasResponse<T = unknown>(response: Response, fallbackMessage: string): Promise<T> {
  // 응답 본문을 텍스트로 먼저 읽어, 에러 페이지(HTML) 응답에도 JS 파싱 예외가 새지 않게 한다.
  const text = await response.text()

  if (!response.ok) {
    const message = `${fallbackMessage} (상태 코드: ${response.status})`
    if (isRetryableStatus(response.status)) {
      throw new RetryableHttpError(response.status, message)
    }
    throw new Error(message)
  }

  let parsed: { result?: string; data?: T; message?: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    // 200인데 본문이 JSON이 아니면 서버 일시 이상으로 보고 재시도 대상으로 처리한다.
    throw new RetryableHttpError(response.status, `${fallbackMessage} (응답 해석 실패)`)
  }

  if (parsed.result !== 'SUCCESS') {
    throw new Error(parsed.message || fallbackMessage)
  }

  return parsed.data as T
}
