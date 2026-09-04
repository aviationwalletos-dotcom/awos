// 항공기 등급(육상단발/육상다발/회전익) 판정 — 운항기술기준 8.2.2 "동일 등급 항공기 형식" 커런시 계산용.
// 1순위: 기록의 범주별 시간(categoryHours)에 어디에 시간이 들어갔는가
// 2순위: 기종명에서 추정(훈련기 위주 목록). 둘 다 없으면 'unknown' → 모든 등급 계산에 포함(보수적으로 "유지"를 안 깨뜨림)
import type { LogbookEntry } from '../types/logbook'

export type AircraftClass = 'SEL' | 'MEL' | 'ROTOR' | 'unknown'

export const AIRCRAFT_CLASS_LABEL: Record<AircraftClass, string> = {
  SEL: '육상단발',
  MEL: '육상다발',
  ROTOR: '회전익',
  unknown: '등급 미기재',
}

const MEL_TYPES = ['DA42', 'DA62', 'PA44', 'PA34', 'BE76', 'BE58', 'BE55', 'PA30', 'PA31', 'C310', 'C340', 'C402', 'C414', 'C421', 'P2006', 'TECNAM P2006']
const SEL_TYPES = ['C150', 'C152', 'C172', 'C177', 'C182', 'C206', 'C210', 'PA28', 'PA18', 'DA20', 'DA40', 'SR20', 'SR22', 'KC-100', 'KC100', 'CT4', 'T-103', 'AT-3', 'P2002', 'TECNAM P2002', 'P2008', 'RV-12']
const ROTOR_TYPES = ['R22', 'R44', 'R66', 'BELL 206', 'B206', 'B407', 'AS350', 'H125', 'EC120', 'EC130', 'S-76', 'H500', 'MD500', 'BELL 505']

export function inferAircraftClass(entry: Pick<LogbookEntry, 'aircraftType' | 'categoryHours'>): AircraftClass {
  const c = entry.categoryHours
  if (c) {
    if ((c.multiEngineLand ?? 0) > 0) return 'MEL'
    if ((c.rotorcraftHelicopter ?? 0) > 0) return 'ROTOR'
    if ((c.singleEngineLand ?? 0) > 0) return 'SEL'
  }
  const t = (entry.aircraftType ?? '').toUpperCase().replace(/\s+/g, '').replace(/-/g, '')
  const norm = (list: string[]) => list.map((x) => x.toUpperCase().replace(/\s+/g, '').replace(/-/g, ''))
  if (norm(MEL_TYPES).some((m) => t.startsWith(m))) return 'MEL'
  if (norm(ROTOR_TYPES).some((m) => t.startsWith(m))) return 'ROTOR'
  if (norm(SEL_TYPES).some((m) => t.startsWith(m))) return 'SEL'
  return 'unknown'
}
