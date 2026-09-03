// v1.1 — 초경량비행장치 "기체 카드".
// 비행경력증명서(별지 제2호)에는 기록마다 종류·형식·신고번호·최종인증검사일·자체중량·최대이륙중량을 적어야 한다.
// 이 값들은 기체별 고정값이므로 비행 1건마다 다시 적지 않고, 기체 카드에 한 번 등록해 두고 기록이 참조한다.
//
// 기재요령(무인 별지 제2호 뒤쪽) 핵심 규칙:
//   - 안전성인증검사 면제 대상 기체는 최종인증검사일에 "면제"로 기재
//   - 자체중량(연료 제외)·최대이륙중량은 신고 당시 중량
//   - 최종인증검사일 유효기간이 지난 기체로 한 비행시간은 인정되지 않는다(면제 기체 제외)

export interface Vehicle {
  id: string
  /** 장치 종류 키 — lib/tracks.ts ULTRALIGHT_KINDS.key (예: UAS_MULTICOPTER) */
  kindKey: string
  /** 형식(모델명). 예: DJI Matrice 300 RTK */
  model: string
  /** 신고번호. 예: LM12-034567 (신고 면제 기체면 비워 둠) */
  registrationNo?: string
  /** 자체중량(kg, 연료 제외) */
  emptyWeightKg?: number
  /** 최대이륙중량(kg) */
  mtowKg?: number
  /** 안전성인증검사 면제 대상 여부 (면제면 검사일 대신 "면제"로 출력) */
  inspectionExempt?: boolean
  /** 최종인증검사일 YYYY-MM-DD */
  lastInspectionDate?: string
  /** 인증 유효기간 만료일 YYYY-MM-DD — 이 날짜 이후 비행은 경력 인정 제외 */
  inspectionValidUntil?: string
  /** 무인 조종자증명 종(1~4종) 표기용 — 최대이륙중량으로 자동 판정 가능하나 사용자가 고정할 수 있음 */
  classLabel?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>

/**
 * 무인비행장치 종(1~4종) 자동 판정 — 무인 운영세칙 [별표 2] 기준.
 *   1종: MTOW 25kg 초과 ~ 자체중량 150kg 이하
 *   2종: MTOW 7kg 초과 25kg 이하
 *   3종: MTOW 2kg 초과 7kg 이하
 *   4종: MTOW 250g 초과 2kg 이하
 */
export function inferUasClass(mtowKg: number | undefined): string | undefined {
  if (mtowKg == null || !Number.isFinite(mtowKg)) return undefined
  if (mtowKg > 25) return '1종'
  if (mtowKg > 7) return '2종'
  if (mtowKg > 2) return '3종'
  if (mtowKg > 0.25) return '4종'
  return '비대상(250g 이하)'
}

/** 해당 날짜에 이 기체의 인증이 유효한가(면제 기체는 항상 유효) */
export function isInspectionValidOn(vehicle: Vehicle | undefined, date: string): boolean {
  if (!vehicle) return true // 기체 미연결 기록은 판정 보류(제외하지 않음)
  if (vehicle.inspectionExempt) return true
  if (!vehicle.inspectionValidUntil) return true
  return date <= vehicle.inspectionValidUntil
}

export function vehicleDisplayName(v: Vehicle): string {
  return v.registrationNo ? `${v.model} · ${v.registrationNo}` : v.model
}

export function isVehicle(value: unknown): value is Vehicle {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.kindKey === 'string' && typeof v.model === 'string'
}
