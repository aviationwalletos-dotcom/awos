// BaaS 계정 API 관련 유효성 검사/포맷 유틸리티
// 참고: baas-integration skill의 templates/react/utils.ts (010-XXXX-XXXX 형식)

/** 전화번호 유효성 검사 (010-XXXX-XXXX 형식) */
export function validatePhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone)
}

/** 전화번호 입력값을 010-XXXX-XXXX 형식으로 자동 포맷 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  }
  return phone
}

/** 이메일 형식 간단 검사 (user_id는 이메일 형식 권장) */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
