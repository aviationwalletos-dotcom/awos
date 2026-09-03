// 비행기록 입력 폼의 "빠른 입력" 칩 프리셋.
// 지금은 한국항공대 울진비행교육원 기준 단일 세트이며, 추후 소속 기관별로 다른 세트를 돌려줄 수 있다.

export interface EntryPresetSet {
  aircraftTypes: string[]
  registrations: string[]
  departures: string[]
  arrivals: string[]
  via: string[]
}

const KAU_ULJIN: Record<'flight' | 'sim', EntryPresetSet> = {
  flight: {
    aircraftTypes: ['C172R', 'C172S', 'DA42'],
    registrations: ['HL1131', 'HL1171', 'HL1081', 'HL2035'],
    departures: ['RKTL', 'RKPU', 'RKNY', 'RKJY'],
    arrivals: ['RKTL', 'RKPU', 'RKNY', 'RKJY'],
    via: ['RKTH', 'RKNN'],
  },
  sim: {
    aircraftTypes: ['FTD'],
    registrations: ['MULTI', 'MENTO', 'FRASCA'],
    departures: [],
    arrivals: [],
    via: [],
  },
}

/** 소속 기관에 맞는 프리셋 (현재는 모든 기관에 항공대 세트) */
export function getEntryPresets(kind: 'flight' | 'sim', _institution?: string | null): EntryPresetSet {
  return KAU_ULJIN[kind]
}

/** 프리셋을 앞에, 본인 이력 값을 뒤에 붙여(중복 제거) 칩 목록을 만든다 */
export function mergePresetChips(preset: string[], history?: string[], limit = 10): string[] {
  const merged = [...preset]
  for (const value of history ?? []) {
    if (!merged.includes(value)) merged.push(value)
  }
  return merged.slice(0, limit)
}
