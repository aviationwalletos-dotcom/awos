// 기관 Flight Radar(/fleet) 정적 목업 데이터
// 실제 실시간 항공기 위치 연동(FlightRadar24 등) 없이 보유 항공기 현황 예시를 보여줍니다.

export type FleetStatus = '운항중' | '정비중' | '대기'

export interface Aircraft {
  tailNumber: string
  model: string
  status: FleetStatus
  lastMaintenance: string
  nextMaintenance: string
  route: string
  radarPosition: { x: number; y: number }
  altitude: string | null
  speed: string | null
}

export interface MaintenanceRecord {
  id: string
  tailNumber: string
  date: string
  work: string
  mechanic: string
}

export type ScheduleKind = '운항' | '정비' | '대기'

export interface ScheduleItem {
  id: string
  tailNumber: string
  dayOffset: number
  startHour: number
  durationHour: number
  kind: ScheduleKind
  label: string
}

export const FLEET_STATUS_LABELS: Record<FleetStatus, string> = {
  운항중: '운항중',
  정비중: '정비중',
  대기: '대기',
}

export const AIRCRAFT: Aircraft[] = [
  {
    tailNumber: 'HL8501',
    model: 'B737-800',
    status: '운항중',
    lastMaintenance: '2026-05-12',
    nextMaintenance: '2026-08-10',
    route: 'ICN → CJU',
    radarPosition: { x: 62, y: 28 },
    altitude: '11,000m',
    speed: '820km/h',
  },
  {
    tailNumber: 'HL8502',
    model: 'B737-800',
    status: '대기',
    lastMaintenance: '2026-04-20',
    nextMaintenance: '2026-07-18',
    route: '김포공항 계류장 A3',
    radarPosition: { x: 30, y: 62 },
    altitude: null,
    speed: null,
  },
  {
    tailNumber: 'HL8503',
    model: 'A320neo',
    status: '정비중',
    lastMaintenance: '2026-07-01',
    nextMaintenance: '2026-07-09',
    route: '격납고 2번 베이',
    radarPosition: { x: 46, y: 74 },
    altitude: null,
    speed: null,
  },
  {
    tailNumber: 'HL8504',
    model: 'A320neo',
    status: '운항중',
    lastMaintenance: '2026-06-02',
    nextMaintenance: '2026-09-01',
    route: 'GMP → PUS',
    radarPosition: { x: 74, y: 55 },
    altitude: '9,500m',
    speed: '780km/h',
  },
  {
    tailNumber: 'HL8505',
    model: 'A320neo',
    status: '대기',
    lastMaintenance: '2026-05-28',
    nextMaintenance: '2026-08-25',
    route: '김포공항 계류장 B1',
    radarPosition: { x: 20, y: 30 },
    altitude: null,
    speed: null,
  },
  {
    tailNumber: 'HL9201',
    model: 'AS350',
    status: '운항중',
    lastMaintenance: '2026-06-15',
    nextMaintenance: '2026-07-15',
    route: '강남 → 인천 헬기장',
    radarPosition: { x: 55, y: 40 },
    altitude: '600m',
    speed: '230km/h',
  },
  {
    tailNumber: 'HL9202',
    model: 'AS350',
    status: '정비중',
    lastMaintenance: '2026-07-03',
    nextMaintenance: '2026-07-11',
    route: '격납고 1번 베이',
    radarPosition: { x: 38, y: 82 },
    altitude: null,
    speed: null,
  },
  {
    tailNumber: 'HL9601',
    model: 'KC-100',
    status: '대기',
    lastMaintenance: '2026-06-10',
    nextMaintenance: '2026-07-20',
    route: '훈련원 계류장',
    radarPosition: { x: 80, y: 22 },
    altitude: null,
    speed: null,
  },
  {
    tailNumber: 'HL9602',
    model: 'KC-100',
    status: '운항중',
    lastMaintenance: '2026-05-30',
    nextMaintenance: '2026-08-28',
    route: '훈련 공역 A',
    radarPosition: { x: 68, y: 68 },
    altitude: '1,200m',
    speed: '210km/h',
  },
  {
    tailNumber: 'HL8506',
    model: 'B737-800',
    status: '운항중',
    lastMaintenance: '2026-06-20',
    nextMaintenance: '2026-09-18',
    route: 'ICN → NRT',
    radarPosition: { x: 15, y: 48 },
    altitude: '10,600m',
    speed: '860km/h',
  },
]

export const AIRCRAFT_MODELS = Array.from(new Set(AIRCRAFT.map((a) => a.model)))

export const MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: 'MX-001', tailNumber: 'HL8501', date: '2026-05-12', work: 'A-check 정기점검', mechanic: '최하은' },
  { id: 'MX-002', tailNumber: 'HL8501', date: '2026-02-08', work: '엔진 오일 교환', mechanic: '정민재' },
  { id: 'MX-003', tailNumber: 'HL8502', date: '2026-04-20', work: '타이어 교체', mechanic: '최하은' },
  { id: 'MX-004', tailNumber: 'HL8503', date: '2026-07-01', work: 'C-check 종합정비 (진행중)', mechanic: '정민재' },
  { id: 'MX-005', tailNumber: 'HL8503', date: '2026-01-15', work: '항전장비 교정', mechanic: '최하은' },
  { id: 'MX-006', tailNumber: 'HL8504', date: '2026-06-02', work: 'A-check 정기점검', mechanic: '최하은' },
  { id: 'MX-007', tailNumber: 'HL8505', date: '2026-05-28', work: '브레이크 패드 교체', mechanic: '정민재' },
  { id: 'MX-008', tailNumber: 'HL9201', date: '2026-06-15', work: '로터 블레이드 점검', mechanic: '정민재' },
  { id: 'MX-009', tailNumber: 'HL9202', date: '2026-07-03', work: '엔진 정밀 정비 (진행중)', mechanic: '최하은' },
  { id: 'MX-010', tailNumber: 'HL9601', date: '2026-06-10', work: '정기 안전점검', mechanic: '정민재' },
  { id: 'MX-011', tailNumber: 'HL9602', date: '2026-05-30', work: '배터리 교체', mechanic: '최하은' },
  { id: 'MX-012', tailNumber: 'HL8506', date: '2026-06-20', work: 'A-check 정기점검', mechanic: '정민재' },
]

export const SCHEDULE_ITEMS: ScheduleItem[] = [
  { id: 'SC-001', tailNumber: 'HL8501', dayOffset: 0, startHour: 8, durationHour: 3, kind: '운항', label: 'ICN → CJU' },
  { id: 'SC-002', tailNumber: 'HL8501', dayOffset: 0, startHour: 15, durationHour: 3, kind: '운항', label: 'CJU → ICN' },
  { id: 'SC-003', tailNumber: 'HL8502', dayOffset: 1, startHour: 9, durationHour: 2, kind: '정비', label: '정기 점검' },
  { id: 'SC-004', tailNumber: 'HL8502', dayOffset: 2, startHour: 10, durationHour: 4, kind: '운항', label: 'GMP → CJU' },
  { id: 'SC-005', tailNumber: 'HL8503', dayOffset: 0, startHour: 6, durationHour: 8, kind: '정비', label: 'C-check 진행' },
  { id: 'SC-006', tailNumber: 'HL8503', dayOffset: 1, startHour: 6, durationHour: 8, kind: '정비', label: 'C-check 진행' },
  { id: 'SC-007', tailNumber: 'HL8504', dayOffset: 0, startHour: 7, durationHour: 2, kind: '운항', label: 'GMP → PUS' },
  { id: 'SC-008', tailNumber: 'HL8504', dayOffset: 2, startHour: 13, durationHour: 2, kind: '운항', label: 'PUS → GMP' },
  { id: 'SC-009', tailNumber: 'HL8505', dayOffset: 1, startHour: 8, durationHour: 5, kind: '대기', label: '계류장 대기' },
  { id: 'SC-010', tailNumber: 'HL9201', dayOffset: 0, startHour: 9, durationHour: 1, kind: '운항', label: '강남 → 인천' },
  { id: 'SC-011', tailNumber: 'HL9201', dayOffset: 3, startHour: 14, durationHour: 1, kind: '운항', label: '인천 → 강남' },
  { id: 'SC-012', tailNumber: 'HL9202', dayOffset: 0, startHour: 8, durationHour: 6, kind: '정비', label: '엔진 정밀 정비' },
  { id: 'SC-013', tailNumber: 'HL9601', dayOffset: 2, startHour: 9, durationHour: 3, kind: '운항', label: '훈련 비행' },
  { id: 'SC-014', tailNumber: 'HL9602', dayOffset: 1, startHour: 10, durationHour: 2, kind: '운항', label: '훈련 공역 A' },
  { id: 'SC-015', tailNumber: 'HL8506', dayOffset: 0, startHour: 22, durationHour: 2, kind: '운항', label: 'ICN → NRT' },
  { id: 'SC-016', tailNumber: 'HL8506', dayOffset: 3, startHour: 9, durationHour: 2, kind: '운항', label: 'NRT → ICN' },
]

export function getMaintenanceFor(tailNumber: string): MaintenanceRecord[] {
  return MAINTENANCE_RECORDS.filter((m) => m.tailNumber === tailNumber).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  )
}

export function getScheduleFor(tailNumber: string): ScheduleItem[] {
  return SCHEDULE_ITEMS.filter((s) => s.tailNumber === tailNumber).sort(
    (a, b) => a.dayOffset - b.dayOffset || a.startHour - b.startHour,
  )
}

export const SCHEDULE_DAY_LABELS = ['오늘', '내일', 'D+2', 'D+3']
