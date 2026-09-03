// Aviation Wallet OS 랜딩 페이지 정적 목업 데이터
// 실제 백엔드 연동 전까지 예시 데이터로 빈 화면을 방지합니다.

import type { IndividualRole } from '../lib/baas/types'

export type RoleKey = 'pilot' | 'mechanic' | 'controller' | 'ops' | 'drone'

export interface RoleCredential {
  label: string
  expiry: string
  status: 'GO' | '만료임박'
}

export interface RoleContent {
  key: RoleKey
  name: string
  colorClass: string
  bgClass: string
  borderClass: string
  /** 자격증 관리 탭 등에서 hover 강조 시 사용하는 배경/테두리 클래스 (Tailwind 정적 스캔을 위해 리터럴로 선언) */
  hoverBgClass: string
  hoverBorderClass: string
  summary: string
  credentials: RoleCredential[]
}

export const ROLES: RoleContent[] = [
  {
    key: 'pilot',
    name: '조종사',
    colorClass: 'text-role-pilot',
    bgClass: 'bg-role-pilot/10',
    borderClass: 'border-role-pilot/40',
    hoverBgClass: 'hover:bg-role-pilot/10',
    hoverBorderClass: 'hover:border-role-pilot/60',
    summary: '자가용/사업용 조종사 면허와 항공신체검사, 정기 기량심사 상태를 한눈에 확인합니다.',
    credentials: [
      { label: '사업용 조종사 면허', expiry: '2027-03-14', status: 'GO' },
      { label: '항공신체검사 (1종)', expiry: '2026-08-02', status: '만료임박' },
      { label: '연간 기량심사(OPC)', expiry: '2026-12-20', status: 'GO' },
    ],
  },
  {
    key: 'mechanic',
    name: '정비사',
    colorClass: 'text-role-mechanic',
    bgClass: 'bg-role-mechanic/10',
    borderClass: 'border-role-mechanic/40',
    hoverBgClass: 'hover:bg-role-mechanic/10',
    hoverBorderClass: 'hover:border-role-mechanic/60',
    summary: '항공정비사 자격증명과 기종 한정 자격, 법정 보수교육 이수 현황을 관리합니다.',
    credentials: [
      { label: '항공정비사 자격증명', expiry: '2028-01-10', status: 'GO' },
      { label: 'B737 기종 한정 자격', expiry: '2026-07-22', status: '만료임박' },
      { label: '법정 보수교육', expiry: '2027-02-05', status: 'GO' },
    ],
  },
  {
    key: 'controller',
    name: '관제사',
    colorClass: 'text-role-controller',
    bgClass: 'bg-role-controller/10',
    borderClass: 'border-role-controller/40',
    hoverBgClass: 'hover:bg-role-controller/10',
    hoverBorderClass: 'hover:border-role-controller/60',
    summary: '관제자격증명과 영어구술능력증명(EPTA), 관제소별 자격 유효기간을 추적합니다.',
    credentials: [
      { label: '관제자격증명(접근관제)', expiry: '2027-09-30', status: 'GO' },
      { label: '영어구술능력증명(EPTA)', expiry: '2026-08-15', status: '만료임박' },
      { label: '관제소 자격 갱신', expiry: '2027-04-01', status: 'GO' },
    ],
  },
  {
    key: 'ops',
    name: '운항관리사',
    colorClass: 'text-role-ops',
    bgClass: 'bg-role-ops/10',
    borderClass: 'border-role-ops/40',
    hoverBgClass: 'hover:bg-role-ops/10',
    hoverBorderClass: 'hover:border-role-ops/60',
    summary: '운항관리사 자격증명과 노선 지식 평가, 위험물 취급 교육 이수 상태를 관리합니다.',
    credentials: [
      { label: '운항관리사 자격증명', expiry: '2027-11-18', status: 'GO' },
      { label: '위험물 취급 교육', expiry: '2026-07-30', status: '만료임박' },
      { label: '노선 지식 평가', expiry: '2027-01-25', status: 'GO' },
    ],
  },
  {
    key: 'drone',
    name: '드론 조종자',
    colorClass: 'text-role-drone',
    bgClass: 'bg-role-drone/10',
    borderClass: 'border-role-drone/40',
    hoverBgClass: 'hover:bg-role-drone/10',
    hoverBorderClass: 'hover:border-role-drone/60',
    summary: '초경량비행장치 조종자 증명과 기체 신고, 특별비행승인 유효기간을 확인합니다.',
    credentials: [
      { label: '초경량비행장치 조종자 증명', expiry: '2027-05-12', status: 'GO' },
      { label: '기체 신고 갱신', expiry: '2026-09-01', status: 'GO' },
      { label: '특별비행승인', expiry: '2026-08-08', status: '만료임박' },
    ],
  },
]

/** 계정에 저장되는 개인 역할(IndividualRole)과 역할별 쇼케이스 데이터 키(RoleKey) 매핑 */
export const INDIVIDUAL_ROLE_TO_ROLE_KEY: Record<IndividualRole, RoleKey> = {
  pilot: 'pilot',
  atc: 'controller',
  mechanic: 'mechanic',
  dispatcher: 'ops',
  drone_pilot: 'drone',
}

/** 로그인한 개인 사용자의 역할에 해당하는 역할별 쇼케이스 데이터(자격 템플릿·컬러)를 반환합니다. */
export function getRoleContentByIndividualRole(role?: IndividualRole | null): RoleContent | undefined {
  if (!role) return undefined
  const key = INDIVIDUAL_ROLE_TO_ROLE_KEY[role]
  return ROLES.find((r) => r.key === key)
}

export interface DashboardRow {
  name: string
  role: string
  credential: string
  expiry: string
  status: 'GO' | 'RISK'
}

export const DASHBOARD_ROWS: DashboardRow[] = [
  { name: '인력 A-102', role: '조종사', credential: '항공신체검사', expiry: '2026-08-02', status: 'RISK' },
  { name: '인력 A-118', role: '정비사', credential: 'B737 한정 자격', expiry: '2026-07-22', status: 'RISK' },
  { name: '인력 A-134', role: '관제사', credential: 'EPTA', expiry: '2027-02-11', status: 'GO' },
  { name: '인력 A-141', role: '운항관리사', credential: '위험물 취급 교육', expiry: '2026-07-30', status: 'RISK' },
  { name: '인력 A-157', role: '드론 조종자', credential: '특별비행승인', expiry: '2027-03-19', status: 'GO' },
]

export interface PricingTier {
  name: string
  target: string
  priceMonthly: string
  priceYearly: string
  highlight: boolean
  features: string[]
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    target: '비행훈련원·드론교육원',
    priceMonthly: '월 190,000원',
    priceYearly: '연 1,900,000원',
    highlight: false,
    features: ['개인 자격 월렛 최대 30인', '만료 D-30/D-7 자동 알림', 'QR 기반 즉시 자격 제시', '기본 대시보드 리포트'],
  },
  {
    name: 'Professional',
    target: '중소 항공사·정비업체(MRO)',
    priceMonthly: '월 490,000원',
    priceYearly: '연 4,900,000원',
    highlight: true,
    features: ['개인 자격 월렛 최대 150인', 'Red/Green 관제 대시보드', '감사 리포트 자동 생성', '역할별 권한 3계층 분리'],
  },
  {
    name: 'Enterprise',
    target: '대형 항공사·다지점 기관',
    priceMonthly: '별도 협의',
    priceYearly: '별도 협의',
    highlight: false,
    features: ['무제한 인력 등록', '전담 도입 매니저 배정', 'ISMS-P 인증 로드맵 우선 지원', '맞춤 감사 리포트 양식'],
  },
]

export const HERO_STAT = {
  value: '항공안전법 시행규칙 별지 서식',
  label: '비행경력증명서 항목 구조를 그대로 저장·집계합니다',
}

/** 기능 명세 — 홍보 문구 대신 지원 항목을 그대로 나열한다(LogTen/ForeFlight식 사양 표기). */
export interface FeatureSpec {
  key: string
  title: string
  items: string[]
}

export const FEATURE_SPECS: FeatureSpec[] = [
  {
    key: 'record',
    title: '기록 · 이관',
    items: [
      '최소 항목(날짜·구간·기종·블록타임) 입력으로 비행 기록',
      '기존 엑셀 로그북 일괄 가져오기 — 컬럼 자동 매핑',
      '비행경력증명서 기반 누적시간 이관',
      '로컬 우선 저장 후 서버 자동 동기화',
    ],
  },
  {
    key: 'aggregate',
    title: '집계 · 서식',
    items: [
      '항공기 범주별 집계 — 단발육상 · 다발육상 · 회전익 · 기타',
      '비행 자격별 집계 — PIC · SIC · Dual Received · 비행교관',
      '비행 조건별 집계 — 주간 · 야간 · 크로스컨트리 · 실제계기 · 모의계기',
      '이착륙 횟수 및 계기접근 횟수 관리',
    ],
  },
  {
    key: 'currency',
    title: '자격 · 커런시',
    items: [
      '자격증명 및 항공신체검사 유효기간 추적',
      '만료 D-day 표시 및 갱신 알림',
      '비행 가능 여부(GO / NO-GO) 판정',
      '한국교통안전공단(TS) 자격 연동 — 준비 중',
    ],
  },
  {
    key: 'verify',
    title: '검증 · 보관',
    items: [
      '교관 전자서명 요청 및 수신',
      '소속 교육기관 대시보드 연동',
      '전체 기록 CSV 내보내기 — 서비스 종속 없음',
      '비행경력증명서 PDF 저장',
    ],
  },
]

/** 종이·엑셀 관리에서 반복되는 문제 상황(주장이 아닌 상황 서술). */
export const PAIN_POINTS = [
  '기기별로 파일이 나뉘어 누적 시간이 일치하지 않습니다',
  '크로스컨트리 · 야간 · 계기 시간을 수동으로 합산해야 합니다',
  '자격 유효기간을 로그북과 별도로 추적해야 합니다',
  '증명서 발급 시 기록을 처음부터 다시 정리해야 합니다',
]

export const TRUST_ITEMS = [
  { title: '데이터 암호화', desc: '전송·저장 구간 모두 암호화하여 자격 정보를 보호합니다.' },
  { title: '접근 권한 3계층 분리', desc: '개인·기관 담당자·시스템 관리자 권한을 엄격히 분리합니다.' },
  { title: '국내 데이터센터 운영', desc: '국내 인프라에 데이터를 저장해 데이터 주권을 지킵니다.' },
  { title: 'ISMS-P 인증 추진', desc: '정보보호 관리체계 인증 취득을 로드맵으로 추진 중입니다.' },
]

export const ORG_TYPES = ['비행훈련원', '드론교육원', '항공사', '정비업체(MRO)', '기타']
