// 디지털 로그북 데이터 모델
// 실 서버 연동 전까지 브라우저 localStorage에 저장되는 비행 기록 타입 정의입니다.

import type { PilotTrack } from '../lib/tracks'

export type FlightCategory = '주간' | '야간' | '계기'

/** 모의비행훈련장치 구분 — 별표 4 인정 상한이 장치별로 다르므로 시뮬 기록에 남긴다 */
export type SimDeviceKind = 'FFS' | 'FTD' | 'BATD'

export const SIM_DEVICE_LABEL: Record<SimDeviceKind, string> = {
  FFS: '모의비행장치(FFS)',
  FTD: '비행훈련장치(FTD)',
  BATD: '기본비행훈련장치(BATD)',
}

// 이 기록이 어떻게 만들어졌는지 구분합니다.
// - manual: 앱에서 직접 입력한 일반 기록(값이 없으면 manual로 간주)
// - legacy_excel: 종이 로그북(탈론 로그 등) 기록을 개인 엑셀 파일로 업로드해 일괄 이관한 기록
// - flight_experience_certificate: 엑셀 파일이 없는 사용자가 비행경력증명서(사진)와 항목별 누적
//   비행시간을 직접 입력해 이관한 기록. 실제 기관 검토 전까지는 본인 자기 확인 방식으로만 인증된다.
export type LogbookEntryOrigin = 'manual' | 'legacy_excel' | 'flight_experience_certificate'

// 항공기 범주/등급별 누적 시간 (모두 선택 입력, 기본 0)
export interface CategoryHours {
  singleEngineLand?: number // 단발육상
  multiEngineLand?: number // 다발육상
  rotorcraftHelicopter?: number // 회전익(헬리콥터)
  otherLabel?: string // 기타 범주 명칭
  otherHours?: number // 기타 범주 시간
}

// 비행 자격 시간 종류별 탑승 시간 (모두 선택 입력, 기본 0)
export interface PilotingTime {
  dualReceived?: number // 교관으로부터 교육받은 시간
  pic?: number // 기장(PIC) 시간
  sic?: number // 부기장(SIC) 시간
  flightInstructor?: number // 비행교관으로서 탑승 시간
  // v1.1 — 별표 4 응시경력 계산에 필요한 세부 구분(선택 입력)
  solo?: number // 단독 비행
  picSupervised?: number // 기장 감독 하 기장 임무 수행(SIC U/S) — 운송용 응시경력
  // v1.1 초경량 — 운영세칙 제10조 "훈련시간": 지도조종자의 조종장치와 연결된 훈련용 조종장치로 비행한 시간
  training?: number
}

// 비행 조건별 시간 (모두 선택 입력, 기본 0)
export interface FlightConditionHours {
  day?: number // 주간
  night?: number // 야간
  crossCountry?: number // 크로스컨트리
  actualInstrument?: number // 실제계기
  simulatedInstrument?: number // 모의계기
  // v1.1 — 별표 4 응시경력 계산용(선택 입력)
  soloCrossCountry?: number // 단독 야외
  crossCountryDistanceKm?: number // 야외비행 구간거리(270km·540km 조건 판정용)
}

export interface LogbookEntry {
  id: string
  // v1.1 — 이 비행이 어떤 트랙(항공기/경량/초경량)의 기록인지. 값이 없으면 기종명으로 추정한다
  // (entryTrack 참고). 신규 입력은 항상 채워진다.
  vehicleClass?: PilotTrack
  // v1.1 — 경량·초경량 종류(타면조종형비행기·무인멀티콥터 등). 항공기 트랙은 비워 둔다.
  vehicleKind?: string
  // v1.1 — 시뮬레이터 기록의 장치 구분. groundTrainerTime > 0 일 때만 의미가 있다.
  simDevice?: SimDeviceKind
  year?: number // 연도(선택, 없으면 date에서 파생해 표시)
  date: string // YYYY-MM-DD
  departure: string
  arrival: string
  viaAirports?: string // 경유 공항(쉼표로 구분된 문자열, 선택)
  aircraftType: string // 항공기 제작사 및 모델
  aircraftIdentification?: string // 항공기 등록번호(테일넘버), 선택
  blockTime: number // 시간 단위 소수(예: 1.5)
  flightCategory: FlightCategory
  categoryHours?: CategoryHours
  pilotingTime?: PilotingTime
  groundTrainerTime?: number // 지상훈련장비(시뮬레이터) 시간, 선택
  conditions?: FlightConditionHours
  instrumentApproaches?: number // 계기 접근 횟수, 선택
  dayLandings?: number // 주간 이착륙 횟수(선택, 기본 0)
  nightLandings?: number // 야간 이착륙 횟수(선택, 기본 0)
  nightTakeoffs?: number // v1.1 — 야간 이륙 횟수(사업용 응시경력: 야간 이륙·착륙 각 5회)
  // ── v1.1 초경량(로그기록지 · 비행경력증명서 별지 제2호) 전용 ──
  vehicleId?: string // 기체 카드 참조(types/vehicle.ts). 종류·형식·신고번호·인증검사일은 카드에서 가져온다
  flightCount?: number // 무인: 해당 일자 비행 횟수(②). 유인은 dayLandings(착륙횟수)를 쓴다
  takeoffTime?: string // HH:MM
  landingTime?: string // HH:MM
  hourMeterStart?: number // 이륙시점 아워미터
  hourMeterEnd?: number // 착륙시점 아워미터
  flightPurpose?: string // 비행목적(자격 보유자) 또는 훈련내용(교육생)
  instructorLicenceNo?: string // 지도조종자 자격번호(⑧)
  traineeName?: string // 로그기록지 ⑥ 교육생 성명(본인이 아닌 경우)
  notes?: string
  // 조종사 본인 서명(자기 인증). 교관 서명 요청과 별개로, 본인이 직접 캔버스에 서명해
  // "이 기록에 기재된 내용이 사실임"을 스스로 확정하는 용도입니다.
  pilotCertification?: {
    signatureDataUrl?: string
    certifiedAt: number
  }
  instructorSignature?: {
    instructorName: string
    instructorUserId: string // [3단계] 서명한 교관의 auth 사용자 uuid(approval_requests.decided_by). 구 데이터는 이메일일 수 있다.
    // "서명 요청" 흐름에서는 손그림 서명 이미지가 없다 — 로그인된 교관 계정 자체를 전자서명으로
    // 간주하므로, 서명 이미지가 있을 때만 값이 채워진다(과거 캔버스 서명 방식과의 호환용).
    signatureDataUrl?: string // canvas.toDataURL() 결과
    signedAt: number // Date.now() 또는 서명 댓글의 작성 시각
  }
  // [3단계] 이 기록에 대해 만든 서명 요청(approval_requests.id, schema12). 필드 이름은 호환을 위해 유지.
  // 값이 있고 instructorSignature가 없으면 "서명 요청 대기중" 상태로 간주한다.
  signatureRequestPostId?: string
  // 교관이 서명 요청을 반려했을 때의 사유. 새 요청을 보내면 지운다(상세 화면에서 안내).
  lastSignatureRejection?: { note: string; at: number; instructorName: string }
  // [증거] 마지막으로 서명이 완료된 요청 id. 서명 뒤 기록을 고쳐 서명이 해제돼도 유지되어,
  // 상세 화면에서 "서명 당시 내용"(approval_requests.payload.signedSnapshot)을 나란히 보여준다.
  signedRequestId?: string
  // 값이 없으면 'manual'(직접 입력)로 간주한다.
  origin?: LogbookEntryOrigin
  /** 비행교범상 2인 이상 조종이 필요한 항공기 여부 — 시행규칙 제78조 제2호 나·다목(1인 조종 항공기의 부기장 시간은 1/2 인정) */
  twoPilotAircraft?: boolean
  // 이관 출처 메모. 예: "엑셀 로그북 파일명"
  legacySourceNote?: string
  // 아래 3개 필드는 origin === 'flight_experience_certificate'일 때만 의미가 있다.
  // 비행경력증명서 사진(FileReader로 만든 data URL). 로컬에만 저장되며 서버 업로드는 하지 않는다.
  certificateImageDataUrl?: string
  // [3단계] 비행경력증명서 인증 요청(approval_requests.id, schema12). 필드 이름은 호환을 위해 유지.
  // 값이 있으면 그 행의 status 로 승인/반려 판정을 자동 감지한다(AutoSyncEntryDecisions).
  // 업로드/게시글 생성이 실패해 값이 없는 경우(로컬 폴백)에는 본인이 직접 "확인받았습니다"
  // 버튼으로만 'confirmed'로 전환할 수 있다.
  certificateRequestPostId?: string
  // 'pending'(대기중)/'rejected'(반려)이면 총 비행시간 공식 합계에서 제외된다. 실제 기관 계정이
  // "비행경력증명서" 게시판에서 승인/반려하면 이 값이 자동으로 갱신되며, 요청이 제출되지 않은
  // 경우(폴백)에는 본인이 직접 "확인받았습니다" 버튼으로 'confirmed'로 전환할 수 있다.
  certificateApprovalStatus?: 'pending' | 'confirmed' | 'rejected'
  // 비행경력증명서 발급기관명
  certificateIssuer?: string
  // "기록관리" 게시판(동적 게시판)에 이 비행기록을 동기화한 게시글의 id.
  // 서버 동기화가 아직 되지 않았거나 실패한 경우 값이 없을 수 있다(로컬 저장은 항상 유지됨).
  syncPostId?: string
  createdAt: number
  updatedAt: number
}

export type LogbookEntryInput = Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'>

export const FLIGHT_CATEGORIES: FlightCategory[] = ['주간', '야간', '계기']

export type LogbookFilterKind = 'all' | 'date' | 'aircraftType' | 'flightCategory' | 'month' | 'imported' | 'unsigned'

export const FILTER_KIND_LABEL: Record<LogbookFilterKind, string> = {
  all: '전체',
  date: '날짜',
  aircraftType: '기종별',
  flightCategory: '비행종류별',
  month: '월별',
  imported: '이월 기록',
  unsigned: '미서명 기록',
}
