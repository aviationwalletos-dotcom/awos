// 해외 기록 — 미국 등 외국에서 훈련·비행한 기록.
//
// 정책(2026-09-11 대표 결정):
//   · 해외 기록은 국내 교관 서명 대상이 아니다(제77조①은 "비행이 끝날 때마다 해당 기장이 증명" — 사후 확인은 법적 의미가 없다).
//   · 증거는 관리자가 비행경력증명서(원본)를 대조 승인한 것으로 갈음한다.
//   · 표시는 자동(발급기관이 외국이면) + 사용자가 고칠 수 있음.
//   · 커런시: 착륙 횟수가 없어 제외되는 건 "기재 없음" 처리로 이미 다룬다. 해외 기록임을 ⓘ 안에서 알려준다.
//   · 별지 36호·총계에는 포함한다(별표 4는 외국 경력을 인정).

import type { LogbookEntry, LogbookEntryInput } from '../types/logbook'

/** 발급기관 이름만으로 외국 기관인지 추정한다. 못 맞히면 사용자가 체크박스로 고친다. */
export function guessForeignIssuer(issuer: string | undefined | null): boolean {
  const s = (issuer ?? '').trim()
  if (!s) return false
  // 한글이 하나라도 있으면 국내로 본다(외국 기관을 한글로 적은 경우는 사용자가 고침)
  if (/[가-힣]/.test(s)) return false
  // 영문 기관명이면 외국으로 본다. 국내 기관의 영문 표기(예: KAU, Korea Aerospace University)는 제외
  if (/korea|kau|kaist|kotsa|kac|jeju|ulsan|hanseo|cheongju|wonju/i.test(s)) return false
  return /[A-Za-z]/.test(s)
}

export function isForeignRecord(entry: Pick<LogbookEntry, 'foreignRecord' | 'certificateIssuer'> | Pick<LogbookEntryInput, 'foreignRecord' | 'certificateIssuer'>): boolean {
  if (entry.foreignRecord !== undefined) return entry.foreignRecord
  return guessForeignIssuer(entry.certificateIssuer)
}
