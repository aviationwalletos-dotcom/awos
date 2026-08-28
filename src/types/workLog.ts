// 비조종사 직군(정비사/관제사/운항관리사) 업무기록 데이터 모델
// 계정+역할별 브라우저 localStorage에 즉시 반영되며, "업무기록" 동적 게시판에도 best-effort로
// 동기화되는 간단한 업무 로그 타입 정의입니다(src/hooks/useWorkLogEntries.ts, src/lib/workLogSync.ts 참고).
// 조종사의 비행기록(LogbookEntry)과 달리, 이 직군들은 항공안전법상 커런시(자격 유지 기준) 수치가
// 아직 제공되지 않아 CRUD 위주의 단순 기록 관리만 제공합니다.

export type WorkLogRole = 'mechanic' | 'atc' | 'dispatcher'

export interface WorkLogEntry {
  id: string
  date: string // YYYY-MM-DD, 작업/근무/업무 일자
  targetLabel: string // 대상 항공기(정비) / 관제소·포지션(관제) / 담당 편명·노선(운항관리)
  taskDetail: string // 정비 항목·작업내용 / 근무내용 / 업무내용
  hours?: number // 소요시간·근무시간·업무시간 (선택)
  /** 정비확인서 발급 여부. 정비사 역할에서만 사용합니다. */
  verified?: boolean
  notes?: string
  createdAt: number
  updatedAt: number
  /** "업무기록" 게시판에 동기화된 게시글 id (서버 동기화 성공 시에만 존재). */
  syncPostId?: string
}

export type WorkLogEntryInput = Omit<WorkLogEntry, 'id' | 'createdAt' | 'updatedAt'>

export interface WorkLogRoleCopy {
  /** 탭 라벨 */
  tabLabel: string
  /** 등록 폼 섹션 제목/설명 */
  formTitle: string
  formDesc: string
  /** 목록 섹션 제목 */
  listTitle: string
  dateLabel: string
  targetLabel: string
  targetPlaceholder: string
  detailLabel: string
  detailPlaceholder: string
  hoursLabel: string
  showVerified: boolean
  verifiedLabel: string
  emptyMessage: string
}

export const WORK_LOG_ROLE_COPY: Record<WorkLogRole, WorkLogRoleCopy> = {
  mechanic: {
    tabLabel: '정비기록 관리',
    formTitle: '새 정비 작업 기록 추가',
    formDesc: '작업 일자, 대상 항공기, 정비 항목/작업내용, 소요시간, 정비확인서 발급 여부를 기록합니다.',
    listTitle: '정비 작업 기록 목록',
    dateLabel: '작업 일자',
    targetLabel: '대상 항공기(등록번호/기종)',
    targetPlaceholder: '예: HL1234 / B737-800',
    detailLabel: '정비 항목 / 작업내용',
    detailPlaceholder: '예: A-Check 엔진오일 교환, 유압계통 점검 등',
    hoursLabel: '소요시간(시간, 선택)',
    showVerified: true,
    verifiedLabel: '정비확인서(정비완료서) 발급 완료',
    emptyMessage: '등록된 정비 기록이 없습니다. 위 등록 폼으로 첫 정비 기록을 추가해 보세요.',
  },
  atc: {
    tabLabel: '관제 근무기록 관리',
    formTitle: '새 관제 근무 기록 추가',
    formDesc: '근무 일자, 관제소/포지션, 근무 내용, 근무시간을 기록합니다.',
    listTitle: '관제 근무 기록 목록',
    dateLabel: '근무 일자',
    targetLabel: '관제소 / 포지션',
    targetPlaceholder: '예: 인천접근관제소 / Approach',
    detailLabel: '근무 내용',
    detailPlaceholder: '예: 접근관제 근무, 관제소 교육훈련 등',
    hoursLabel: '근무시간(시간, 선택)',
    showVerified: false,
    verifiedLabel: '',
    emptyMessage: '등록된 근무 기록이 없습니다. 위 등록 폼으로 첫 근무 기록을 추가해 보세요.',
  },
  dispatcher: {
    tabLabel: '운항관리 업무기록 관리',
    formTitle: '새 운항관리 업무 기록 추가',
    formDesc: '업무 일자, 담당 편명/노선, 업무내용, 업무시간을 기록합니다.',
    listTitle: '운항관리 업무 기록 목록',
    dateLabel: '업무 일자',
    targetLabel: '담당 편명 / 노선',
    targetPlaceholder: '예: KE123 / ICN-NRT',
    detailLabel: '업무 내용',
    detailPlaceholder: '예: 비행계획 수립, 기상 브리핑, 위험물 취급 확인 등',
    hoursLabel: '업무시간(시간, 선택)',
    showVerified: false,
    verifiedLabel: '',
    emptyMessage: '등록된 업무 기록이 없습니다. 위 등록 폼으로 첫 업무 기록을 추가해 보세요.',
  },
}
