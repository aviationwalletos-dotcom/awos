// 서명 요청 제목·요약 빌더.
// 부채 3단계 이후 서명 요청은 approval_requests(schema12) 행으로 저장되며, 이 파일은
// 교관 서명함 카드와 관리자 화면에 그대로 보여줄 사람용 텍스트만 만든다.
// (댓글 [SIGNED] 파싱·판정 유틸은 테이블의 status/decided_by 로 대체되어 제거했다.)

import type { AccountResponse } from './types'
import type { LogbookEntry } from '../../types/logbook'

function formatBlockTime(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)}시간`
}

export function buildSignatureRequestTitle(entry: LogbookEntry): string {
  return `[서명요청] ${entry.date} ${entry.aircraftType} ${entry.departure}→${entry.arrival}`
}

/** 서명 요청 대상으로 특정 교관을 지정할 때 사용하는 식별 정보. */
export interface SignatureTargetInstructor {
  name: string
  userId: string
}

/** 서명 요청 요약 — 비행 상세를 사람이 읽기 쉬운 텍스트로 정리한다. */
export function buildSignatureRequestContent(
  entry: LogbookEntry,
  account: AccountResponse,
  targetInstructor?: SignatureTargetInstructor,
): string {
  const lines: string[] = []
  if (targetInstructor) {
    lines.push(`대상 교관: ${targetInstructor.name} (${targetInstructor.userId})`)
  }
  lines.push(
    `날짜: ${entry.date}`,
    `기종: ${entry.aircraftType}`,
    `구간: ${entry.departure} → ${entry.arrival}`,
    `블록타임: ${formatBlockTime(entry.blockTime)}`,
    `비행 종류: ${entry.flightCategory}`,
    `이착륙: 주간 ${entry.dayLandings ?? 0}회 / 야간 ${entry.nightLandings ?? 0}회`,
    `메모: ${entry.notes?.trim() ? entry.notes.trim() : '-'}`,
    '',
    `요청자: ${account.name} (${account.user_id})`,
  )
  return lines.join('\n')
}
