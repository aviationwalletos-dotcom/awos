// BaaS API 공통 설정 (계정 인증 전용)
//
// 이 프로젝트는 esbuild-wasm 프리뷰(Node 프로세스 없음)와 Vite 배포 빌드
// 두 환경 모두에서 동작해야 하므로, `process` 전역 객체 존재 여부를 먼저
// 안전하게 확인한 뒤 `import.meta.env`를 확인하고, 마지막으로 이 프로젝트에
// 배정된 BaaS 프로젝트 ID로 폴백합니다.

export const BAAS_BASE_URL = '/aiapp-baas'

// 이 워크스페이스에 연결된 BaaS 프로젝트 ID (배포/프리뷰 공통 폴백)
const FALLBACK_BAAS_PROJECT_ID = '3ecd1885-15e0-408a-8a9c-560a3476b7ed'

// "교관 승인" 동적 게시판(FREE) ID — 관리자가 BaaS 콘솔에서 사전 생성한 고정 게시판.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
export const INSTRUCTOR_APPROVAL_BOARD_ID = 'c5e1b13b-30bb-4aac-b243-8ab1883d666e'

// "서명 요청" 동적 게시판(FREE) ID — 학생이 비행 기록 서명을 "요청"하고, 승인된 교관이
// 나중에 자신의 서명 요청함에서 확인 후 본인 명의 댓글([SIGNED] ...)로 서명 완료를 표시한다.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
export const SIGNATURE_REQUEST_BOARD_ID = '595930cb-8219-423f-afd1-a0a2365a4a6b'

// "공유 게시판" 동적 게시판(FREE) ID — 개인 회원이 본인의 GO/NO-GO 비행 적합성 상태를
// 소속 기관에 공유하는 용도(status share)로 재사용한다.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
export const STATUS_SHARE_BOARD_ID = 'b7c87a0e-cfc3-4c80-97cd-6ef7934c58e2'

// "자격증관리" 동적 게시판(FREE) ID — 계정별 localStorage에만 저장되던 자격증(자격/면허) 데이터를
// 실 서버에도 best-effort로 동기화하는 용도. 자격증 1건당 게시글 1건(content에 자격증 JSON을
// 한 줄로 직렬화)으로 저장한다.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
// 주의: 이 게시판은 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는 구조라, 다른 회원도
// API를 직접 호출하면 타인의 자격증 게시글을 볼 수 있는 구조적 한계가 있다(진짜 비공개 저장이 아님).
export const CERTIFICATE_BOARD_ID = 'd4df52f6-fd5d-4a19-a252-7a2ffd9e245d'

// "비행기록" 동적 게시판(FREE) ID — 계정별 localStorage에만 저장되던 비행기록(로그북) 데이터를
// 실 서버에도 best-effort로 동기화하는 용도. 비행기록 1건당 게시글 1건(content에 비행기록 JSON을
// 한 줄로 직렬화)으로 저장한다. "자격증관리" 게시판 연동과 동일한 패턴이다.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
// 주의: 이 게시판도 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는 구조라, 다른 회원도
// API를 직접 호출하면 타인의 비행기록 게시글을 볼 수 있는 구조적 한계가 있다(진짜 비공개 저장이 아님).
export const LOGBOOK_BOARD_ID = '634956de-9ab1-4417-84c0-088a5d655e20'

// "업무기록" 동적 게시판(FREE) ID — 정비사/관제사/운항관리사가 계정별 localStorage에만 저장하던
// 업무기록(정비/관제/운항관리) 데이터를 실 서버에도 best-effort로 동기화하는 용도. 업무기록 1건당
// 게시글 1건(content에 업무기록 JSON을 한 줄로 직렬화)으로 저장한다. "자격증관리"/"비행기록"
// 게시판 연동과 동일한 패턴이다.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
// 주의: 이 게시판도 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는 구조라, 다른 회원도
// API를 직접 호출하면 타인의 업무기록 게시글을 볼 수 있는 구조적 한계가 있다(진짜 비공개 저장이 아님).
export const WORK_LOG_BOARD_ID = '2966212a-877c-4964-a927-18e40802b32d'

// "개인설정" 동적 게시판(FREE) ID — 계정별 localStorage에만 저장되던 "개인설정"(개인 역할 오버라이드,
// 소속 기관 오버라이드, 커런시 관리 탭의 계기비행심사 이수일/조종교육증명 최초취득일/교관 커런시 회복
// 자기신고)을 실 서버에도 best-effort로 동기화하는 용도. 다른 "게시글 1건당 데이터 1건" 연동과 달리,
// 계정당 딱 1개의 "개인설정" 게시글만 유지한다(있으면 갱신, 없으면 생성).
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
// 주의: 이 게시판도 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는 구조라, 다른 회원도
// API를 직접 호출하면 타인의 개인설정 게시글을 볼 수 있는 구조적 한계가 있다(진짜 비공개 저장이 아님).
export const PROFILE_SETTINGS_BOARD_ID = 'bf6c2b9a-b210-4c3f-a1ad-9bcd06805270'

// "비행경력증명서" 동적 게시판(FREE) ID — 엑셀 파일이 없는 사용자가 제출하는 비행경력증명서
// 인증 요청을 실제 기관 계정이 검토·승인/반려하는 워크플로우 용도. "교관 승인" 게시판과 동일하게
// 게시글 숨김 토글(작성자 본인만 가능)이 아니라 댓글([APPROVED]/[REJECTED])로 승인/반려를 표시한다
// (BUG-004/BUG-006 교훈). 사진 첨부는 이 게시판이 allow_attachment: true이므로 댓글이 아니라
// 게시글 자체의 정식 첨부파일(file_ids)로 넣는다.
// board_type: FREE, allow_comment: true, allow_attachment: true, require_login: true, categories: null
// 주의: 이 게시판도 프로젝트에 로그인한 모든 회원이 목록/상세를 조회할 수 있는 구조라, 다른 회원도
// API를 직접 호출하면 타인의 인증 요청 게시글을 볼 수 있는 구조적 한계가 있다(진짜 비공개가 아님).
export const FLIGHT_EXPERIENCE_CERTIFICATE_BOARD_ID = 'df0315ce-3c41-4a96-8a34-7bd9c3c591ec'

function readViteEnvProjectId(): string | undefined {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
    return env?.VITE_BAAS_PROJECT_ID
  } catch {
    return undefined
  }
}

/**
 * BaaS 프로젝트 ID를 반환합니다.
 * 환경변수가 설정되어 있으면 그 값을, 없으면 이 프로젝트의 고정 ID를 사용합니다.
 * 그마저도 없다면 명확한 설정 오류를 던집니다 (다른 오리진으로 폴백하지 않음).
 */
export function getBaasProjectId(): string {
  const projectId = readViteEnvProjectId() || FALLBACK_BAAS_PROJECT_ID

  if (!projectId) {
    throw new Error('[BaaS] 프로젝트 ID 설정이 필요합니다. VITE_BAAS_PROJECT_ID 환경변수를 확인해주세요.')
  }

  return projectId
}

// AI Studio 미리보기는 샌드박스 iframe 안에서 실행되어 BaaS 서버와 서드파티(크로스사이트)
// 관계가 되는 경우가 있다. 이때 브라우저 정책상 Set-Cookie로 내려온 access_token 쿠키가
// 저장/전송되지 않을 수 있으므로, 로그인 응답의 access_token을 별도로 보관했다가
// 이후 요청에 `Authorization: Bearer <token>` 헤더로 함께 실어 쿠키가 막힌 환경에서도
// 인증 상태가 유지되도록 폴백한다.
// 미리보기는 코드 수정 시마다 esbuild-wasm이 번들을 다시 만들고 미리보기 iframe이
// 새 브라우징 컨텍스트로 재생성될 수 있다. sessionStorage는 탭/컨텍스트에 종속되어
// 이 재생성 과정에서 값이 유실될 수 있으므로(BUG-XXX), 오리진에 종속되어 재로드/재생성
// 되어도 유지되는 localStorage를 사용해 탭을 닫거나 미리보기가 재생성되어도 토큰이
// 유지되도록 한다.
const ACCESS_TOKEN_STORAGE_KEY = 'aiapp_baas_access_token'

export function setStoredAccessToken(token: string | null | undefined): void {
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
  } catch {
    // localStorage 접근이 차단된 환경(예: 일부 샌드박스)에서는 조용히 무시한다.
  }
}

export function getStoredAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

/** 쿠키 인증이 막힌 환경을 대비해, 저장된 access_token이 있으면 Authorization 헤더를 함께 반환한다. */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** BaaS API 공통 응답 envelope. `result`가 'SUCCESS'가 아니면 `message`/`errorCode`로 실패 사유를 담는다. */
export interface ApiEnvelope<T = unknown> {
  result: string
  data?: T
  message?: string
  errorCode?: string
}

/**
 * fetch 응답 본문을 JSON으로 안전하게 파싱한다.
 * 서버가 에러 페이지(HTML 등) 응답이나 빈 본문을 내려줄 때 `response.json()`을 바로 호출하면
 * "Unexpected token '<', ... is not valid JSON" 같은 원본 JS 파싱 에러가 그대로 사용자에게 노출된다.
 * 이를 방지하기 위해 본문을 텍스트로 먼저 읽고, JSON 파싱에 실패하면 이해 가능한 에러 메시지로 변환한다.
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`서버 응답을 해석할 수 없습니다 (상태 코드: ${response.status}). 잠시 후 다시 시도해주세요.`)
  }
}
