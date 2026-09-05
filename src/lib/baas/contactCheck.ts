// 가입 전 이메일·전화번호 중복 확인(schema13 contact_exists). 익명 상태에서 호출한다.
// 함수가 아직 없으면(schema13 미실행) 확인을 건너뛴다 — 가입 자체는 서버 유니크 제약이 지킨다.

import { supabase } from '../supabase/client'

export interface ContactCheck {
  emailTaken: boolean
  phoneTaken: boolean
  /** 그 이메일이 묶인 로그인 방법('email' | 'google' | 'kakao' ...). schema15 이전 서버면 빈 배열 */
  emailProviders: string[]
}

export async function checkContactExists(email?: string | null, phone?: string | null): Promise<ContactCheck | null> {
  try {
    const { data, error } = await supabase.rpc('contact_exists', {
      p_email: email?.trim() || null,
      p_phone: phone?.trim() || null,
    })
    if (error) return null
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { emailTaken: false, phoneTaken: false, emailProviders: [] }
    return {
      emailTaken: Boolean(row.email_taken),
      phoneTaken: Boolean(row.phone_taken),
      emailProviders: Array.isArray(row.email_providers) ? (row.email_providers as string[]) : [],
    }
  } catch {
    return null
  }
}

export const EMAIL_TAKEN_MESSAGE =
  '이미 가입된 이메일이에요. 로그인해 주세요. 구글·카카오로 가입했다면 그 방법으로 로그인한 뒤 계정정보의 "이메일 로그인 연결하기"에서 비밀번호를 설정할 수 있어요.'

const PROVIDER_LABEL: Record<string, string> = { email: '이메일·비밀번호', google: '구글', kakao: '카카오' }

/** 로그인 방법별로 다른 안내 — 어떤 버튼을 눌러야 하는지 바로 알 수 있게 */
export function emailTakenMessageFor(providers: string[]): string {
  const social = providers.filter((p) => p !== 'email')
  const hasEmail = providers.includes('email')
  const socialLabel = social.map((p) => PROVIDER_LABEL[p] ?? p).join('·')
  if (social.length > 0 && !hasEmail) {
    return `이 이메일은 ${socialLabel} 로그인으로 가입돼 있어요. 로그인 화면에서 "${socialLabel}로 시작하기"를 눌러 주세요. 비밀번호 로그인도 쓰고 싶다면 로그인 후 계정정보의 "이메일 로그인 연결하기"에서 설정할 수 있어요.`
  }
  if (social.length > 0 && hasEmail) {
    return `이 이메일은 이미 가입돼 있어요(${socialLabel} 로그인과 비밀번호 로그인 모두 연결됨). 로그인 화면에서 아무 방법으로나 로그인하세요.`
  }
  if (hasEmail) {
    return '이 이메일은 이미 비밀번호로 가입돼 있어요. 로그인해 주세요. 비밀번호를 잊었다면 "비밀번호 찾기"를 이용하세요.'
  }
  return EMAIL_TAKEN_MESSAGE
}
export const PHONE_TAKEN_MESSAGE =
  '이 전화번호로 가입된 계정이 이미 있어요. 계정은 전화번호당 하나만 만들 수 있어요. 기존 계정으로 로그인하거나, 로그인 방법을 잊었다면 비밀번호 찾기를 이용해 주세요.'

/** 프로필 저장 시 유니크 제약 위반 메시지를 사용자 문구로 바꾼다 */
export function translateProfileUniqueError(message: string): string | null {
  if (/profiles_phone_unique_idx/.test(message)) return PHONE_TAKEN_MESSAGE
  return null
}
