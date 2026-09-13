// "비행경력증명서" 게시판 전용 제목/본문 포맷 유틸리티
//
// [승인 주체] 관리자(대표)다. 기관·학교가 아니다 — 기관과 협의가 되면 그때 역할을 넘긴다.
// [승인 경로] 댓글이 아니라 `approval_requests` 테이블(schema12)이다. 아래 댓글 빌더들은
// 게시글 본문 포맷과 과거 기록 파싱에만 쓰인다(신규 승인 판정에는 쓰이지 않는다).
// 게시글 숨김 토글(`PATCH .../hidden`)은 작성자 본인 또는 프로젝트 소유자만 호출할 수 있다는
// BUG-004/BUG-006 교훈은 그대로 유효하다.
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
    `기장 ${fmt(input.pilotingTime?.pic)} · 기장감독하 ${fmt(input.pilotingTime?.picSupervised)} · SIC ${fmt(input.pilotingTime?.sic)} · 교관 ${fmt(input.pilotingTime?.flightInstructor)} · 학생조종사(계산) ${fmt(Math.max(0, (input.blockTime ?? 0) - (input.pilotingTime?.pic ?? 0) - (input.pilotingTime?.picSupervised ?? 0) - (input.pilotingTime?.sic ?? 0)))} · Dual ${input.pilotingTime?.dualReceived === undefined ? '(증명서에 없음)' : fmt(input.pilotingTime?.dualReceived)}`,
    '',
    '[비행 조건별 누적 시간]',
    `주간 ${fmt(input.conditions?.day)} · 야간 ${fmt(input.conditions?.night)} · 크로스컨트리 ${fmt(input.conditions?.crossCountry)} · 야간 크로스컨트리 ${fmt(input.conditions?.nightCrossCountry)} · 실제계기 ${fmt(input.conditions?.actualInstrument)} · 모의계기 ${fmt(input.conditions?.simulatedInstrument)}`,
    '',
    `지상훈련장비: ${fmt(input.groundTrainerTime)}시간`,
    `계기접근 ${input.instrumentApproaches ?? 0}회 · 주간이착륙 ${input.dayLandings ?? 0}회 · 야간이착륙 ${input.nightLandings ?? 0}회`,
  ]

  return lines.join('\n')
}
