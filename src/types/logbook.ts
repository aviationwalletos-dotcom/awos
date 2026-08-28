// 디지털 로그북 데이터 모델
// 실 서버 연동 전까지 브라우저 localStorage에 저장되는 비행 기록 타입 정의입니다.

export type FlightCategory = '주간' | '야간' | '계기'

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
}

// 비행 조건별 시간 (모두 선택 입력, 기본 0)
export interface FlightConditionHours {
  day?: number // 주간
  night?: number // 야간
  crossCountry?: number // 크로스컨트리
  actualInstrument?: number // 실제계기
  simulatedInstrument?: number // 모의계기
}

export interface LogbookEntry {
  id: string
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
  notes?: string
  // 조종사 본인 서명(자기 인증). 교관 서명 요청과 별개로, 본인이 직접 캔버스에 서명해
  // "이 기록에 기재된 내용이 사실임"을 스스로 확정하는 용도입니다.
  pilotCertification?: {
    signatureDataUrl?: string
    certifiedAt: number
  }
  instructorSignature?: {
    instructorName: string
    instructorUserId: string // 서명(댓글 작성) 당시 로그인되어 있던 교관 계정의 로그인 ID(이메일)
    // "서명 요청" 흐름에서는 손그림 서명 이미지가 없다 — 로그인된 교관 계정 자체를 전자서명으로
    // 간주하므로, 서명 이미지가 있을 때만 값이 채워진다(과거 캔버스 서명 방식과의 호환용).
    signatureDataUrl?: string // canvas.toDataURL() 결과
    signedAt: number // Date.now() 또는 서명 댓글의 작성 시각
  }
  // "서명 요청" 게시판(동적 게시판)에 이 기록에 대해 생성한 요청 게시글의 id.
  // 값이 있고 instructorSignature가 없으면 "서명 요청 대기중" 상태로 간주한다.
  signatureRequestPostId?: string
  // 값이 없으면 'manual'(직접 입력)로 간주한다.
  origin?: LogbookEntryOrigin
  // 이관 출처 메모. 예: "엑셀 로그북 파일명"
  legacySourceNote?: string
  // 아래 3개 필드는 origin === 'flight_experience_certificate'일 때만 의미가 있다.
  // 비행경력증명서 사진(FileReader로 만든 data URL). 로컬에만 저장되며 서버 업로드는 하지 않는다.
  certificateImageDataUrl?: string
  // "비행경력증명서" 게시판(동적 게시판)에 실제 기관 인증을 요청하며 제출한 게시글의 id.
  // 값이 있으면 그 게시글의 댓글([APPROVED]/[REJECTED])로 승인/반려 판정을 자동 감지한다.
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

export type LogbookFilterKind = 'all' | 'aircraftType' | 'flightCategory' | 'month'

export const FILTER_KIND_LABEL: Record<LogbookFilterKind, string> = {
  all: '전체',
  aircraftType: '기종별',
  flightCategory: '비행종류별',
  month: '월별',
}
