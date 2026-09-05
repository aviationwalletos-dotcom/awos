// "오늘" 날짜 문자열(YYYY-MM-DD)을 기기의 현지 시간 기준으로 만든다.
// new Date().toISOString() 은 UTC 라 한국 시각 00:00~09:00 사이엔 어제 날짜가 나온다(만료·기한 판정이 하루 어긋남).
export function localToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
