// 자주 나는 이메일 도메인 오타를 감지해 "혹시 ○○ 아닌가요?" 제안. 입력을 막지는 않는다.
const SUGGEST: Record<string, string> = {
  'naer.com': 'naver.com', 'navr.com': 'naver.com', 'nver.com': 'naver.com', 'naver.co': 'naver.com', 'naver.con': 'naver.com', 'naver.cm': 'naver.com', 'navercom': 'naver.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmali.com': 'gmail.com',
  'daum.ne': 'daum.net', 'duam.net': 'daum.net', 'hanmail.ne': 'hanmail.net', 'hanmial.net': 'hanmail.net',
  'kakao.co': 'kakao.com', 'outlook.co': 'outlook.com', 'hotmail.co': 'hotmail.com', 'nate.co': 'nate.com',
}

export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0) return null
  const domain = email.slice(at + 1).toLowerCase().trim()
  const fixed = SUGGEST[domain]
  return fixed ? `${email.slice(0, at)}@${fixed}` : null
}
