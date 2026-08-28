// "비행경력증명서" 게시판 전용 제목/본문 포맷 유틸리티
//
// 이 게시판은 "교관 승인" 게시판과 동일한 요청-승인 워크플로우 패턴을 따른다: 학생이 인증 요청
// 게시글(사진 첨부 가능)을 작성하면, 소속 기관 계정이 그 게시글에 [APPROVED]/[REJECTED] 댓글을
// 남겨 승인/반려를 표시한다. 게시글 숨김 토글(`PATCH .../hidden`)은 작성자 본인 또는 프로젝트
// 소유자만 호출할 수 있어 기관 계정으로는 사용할 수 없다는 BUG-004/BUG-006 교훈을 그대로 따른다.
// 승인/반려 댓글 빌더·판정 유틸(`buildApprovalCommentContent`/`buildRejectionCommentContent`/
// `resolveApprovalDecision` 등)과 소속 파싱(`parseAffiliationFromTitle`)은 게시판에 독립적인 범용
// 로직이므로 `instructorApproval.ts`의 것을 그대로 재사용한다(중복 구현하지 않음).
//
// 목록 조회 API의 content는 "미리보기(HTML 태그 제거)"라 원본 줄바꿈이 보존된다는 보장이 없다
// (BUG-005 교훈). 소속 기관 필터링은 목록 API에서도 가공 없이 내려오는 title에 `[{affiliation}]`
// 접미사로 포함해 `instructorApproval.ts`의 parseAffiliationFromTitle로 그대로 파싱한다. 본문(content)은
// 다시 파싱하는 곳이 없는(기관 담당자가 읽기만 하는) 사람이 읽기용 요약 텍스트이므로 자유 형식으로
// 작성한다.

import type { LogbookEntryInput } from '../types/logbook'

const TITLE_PREFIX = '비행경력증명서'

/**
 * 인증 요청 게시글 제목 — 소속 기관 필터링(`instructorApproval.ts`의 parseAffiliationFromTitle)에
 * 필요한 `[{affiliation}]` 접미사를 포함한다. 소속이 없으면 접미사를 생략한다.
 */
export function buildFlightExperienceCertificateTitle(name: string, userId: string, affiliation?: string): string {
  const base = `${TITLE_PREFIX} - ${name} (${userId})`
  const trimmed = affiliation?.trim()
  return trimmed ? `${base} [${trimmed}]` : base
}

interface CertificateSummaryInput {
  date: string
  issuer?: string
  blockTime: number
  categoryHours?: LogbookEntryInput['categoryHours']
  pilotingTime?: LogbookEntryInput['pilotingTime']
  groundTrainerTime?: number
  conditions?: LogbookEntryInput['conditions']
  instrumentApproaches?: number
  dayLandings?: number
  nightLandings?: number
}

function fmt(n: number | undefined): string {
  return (n ?? 0).toFixed(1)
}

/** 인증 요청 게시글 본문 — 기관 담당자가 읽을 누적 비행경력 요약(자유 형식 텍스트). */
export function buildFlightExperienceCertificateContent(input: CertificateSummaryInput): string {
  const categoryLine = [
    `단발육상 ${fmt(input.categoryHours?.singleEngineLand)}`,
    `다발육상 ${fmt(input.categoryHours?.multiEngineLand)}`,
    `회전익 ${fmt(input.categoryHours?.rotorcraftHelicopter)}`,
    input.categoryHours?.otherLabel ? `${input.categoryHours.otherLabel} ${fmt(input.categoryHours?.otherHours)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const lines = [
    '비행경력증명서 인증 요청입니다. 아래 누적 비행경력을 확인하고 승인/반려해 주세요.',
    '',
    `기준일: ${input.date}`,
    `발급기관: ${input.issuer || '미기재'}`,
    `총 블록타임: ${fmt(input.blockTime)}시간`,
    '',
    '[항공기 범주별 누적 시간]',
    categoryLine,
    '',
    '[비행 자격 시간별 누적]',
    `DUAL RECEIVED ${fmt(input.pilotingTime?.dualReceived)} · PIC ${fmt(input.pilotingTime?.pic)} · SIC ${fmt(input.pilotingTime?.sic)} · AS FLIGHT INSTRUCTOR ${fmt(input.pilotingTime?.flightInstructor)}`,
    '',
    '[비행 조건별 누적 시간]',
    `주간 ${fmt(input.conditions?.day)} · 야간 ${fmt(input.conditions?.night)} · 크로스컨트리 ${fmt(input.conditions?.crossCountry)} · 실제계기 ${fmt(input.conditions?.actualInstrument)} · 모의계기 ${fmt(input.conditions?.simulatedInstrument)}`,
    '',
    `지상훈련장비: ${fmt(input.groundTrainerTime)}시간`,
    `계기접근 ${input.instrumentApproaches ?? 0}회 · 주간이착륙 ${input.dayLandings ?? 0}회 · 야간이착륙 ${input.nightLandings ?? 0}회`,
  ]

  return lines.join('\n')
}
