// BaaS 계정(회원 인증) API 타입 정의
// 참고: baas-integration skill의 references/account.md

export type UserType = 'individual' | 'organization'

/** 개인 사용자의 세부 역할 */
export type IndividualRole = 'pilot' | 'atc' | 'mechanic' | 'dispatcher' | 'drone_pilot'

/** 개인 역할 한글 라벨 */
export const INDIVIDUAL_ROLE_LABEL: Record<IndividualRole, string> = {
  pilot: '조종사',
  atc: '관제사',
  mechanic: '정비사',
  dispatcher: '운항관리사',
  drone_pilot: '드론조종사',
}

/** 계정에 저장하는 확장 데이터 (개인/기관 유형 및 개인 역할 구분) */
export interface AccountExtraData {
  user_type?: UserType
  individual_role?: IndividualRole
  /** v1.1 — 보유 조종 트랙(복수). 없으면 individual_role에서 이관 규칙으로 파생한다. */
  pilot_tracks?: string[] | string
  /** v1.1 — 생년월일(YYYY-MM-DD). 항공신체검사 유효기간(별표 8)이 연령으로 갈리므로 필요하다. */
  birth_date?: string
  /** v1.1 — 운항형태(general/commercial). 커런시 기준(180일/90일+야간)을 가른다. */
  operation_type?: string
  /** 소속 기관(예: "항공대학교 비행교육원"). 개인/기관 계정 모두 설정 가능한 자유 입력 텍스트. */
  organization_affiliation?: string
  [key: string]: unknown
}

/** 계정 정보 응답 */
export interface AccountResponse {
  id: string
  user_id: string
  name: string
  phone: string
  is_profile_completed: boolean
  last_logged_at: string | null
  created_at: string
  data: AccountExtraData
}

/** 로그인 토큰 응답 */
export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
}

/** 회원가입 추가 옵션 */
export interface SignupOptions {
  terms_agreed?: boolean
  privacy_agreed?: boolean
  data?: AccountExtraData
}

export interface UseLoginReturn {
  login: (userId: string, userPw: string) => Promise<TokenResponse>
  isLoading: boolean
  error: string | null
  data: TokenResponse | null
  reset: () => void
}

export interface UseSignupReturn {
  signup: (userId: string, userPw: string, name: string, phone: string, options?: SignupOptions) => Promise<AccountResponse>
  isLoading: boolean
  error: string | null
  data: AccountResponse | null
  reset: () => void
}

export interface UseLogoutOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface UseLogoutReturn {
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export interface UseAccountInfoOptions {
  enabled?: boolean
  onError?: (error: Error) => void
}

export interface UseAccountInfoReturn {
  data: AccountResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<AccountResponse | null>
  reset: () => void
}

export interface UseChangePasswordReturn {
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  isLoading: boolean
  error: string | null
  isSuccess: boolean
  reset: () => void
}

/** 교관 본인 인증(로그인 검증) 결과 — 로그북 소유자 세션과 무관한 별도 검증 전용 값 */
export interface VerifiedInstructor {
  name: string
  userId: string
}
