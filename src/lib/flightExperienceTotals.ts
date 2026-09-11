// 비행경력증명서 AI 읽기 결과를 검산·교정한다. 화면(FlightExperienceCertificateForm)과 분리해 단위 테스트로 고정한다.
//
// 두 단계:
//  1) 한국 별지 36호: AI 가 "계" 행 19칸을 순서대로 옮겨 적은 certTotals 를 받아 앱이 합산한다.
//     검산 — 주간 4열 + 야간 4열 = 소계, 기장 + 부조종사 + 학생조종사 = 소계. 교관·학생이 바뀌어 베껴졌으면 바꿔서 다시 검산.
//  2) 모든 서식: 공통 검산(주간+야간 ≤ 총시간, 야외 ≤ 총시간, 기장 ≤ 총시간, 교관 ≤ 기장, 범주 합 ≈ 총시간). 안 맞으면 경고만.
//
// 원칙: 확실한 값만 채운다. 검산이 맞는 부분만 덮어쓰고, 안 맞으면 AI 원래 값을 두고 경고한다.

export type AiFields = Record<string, unknown>

export interface ReconcileResult {
  fields: AiFields
  notes: string[]
}

const CERT_TOTAL_KEYS = [
  'landings', 'pic', 'picSupervised', 'sic', 'instructor', 'student', 'engineer', 'subtotal',
  'dayVfrPic', 'dayVfrOther', 'dayXcPic', 'dayXcOther', 'nightVfrPic', 'nightVfrOther', 'nightXcPic', 'nightXcOther',
  'instActual', 'instSim', 'other',
] as const

export function toNum(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    const s = v.trim().replace(/,/g, '')
    if (!s) return undefined
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

const r1 = (v: number) => Math.round(v * 10) / 10
const near = (a: number, b: number, tol = 0.2) => Math.abs(a - b) < tol

/** 별지 36호 "계" 행(certTotals)을 합산·검산해 fields 에 반영한다 */
export function reconcileCertTotals(input: AiFields): ReconcileResult {
  const fields: AiFields = { ...input }
  const notes: string[] = []
  const raw = fields.certTotals
  delete fields.certTotals
  if (!raw || typeof raw !== 'object') return { fields, notes }

  const ct: Record<string, number> = {}
  for (const k of CERT_TOTAL_KEYS) ct[k] = toNum((raw as Record<string, unknown>)[k]) ?? 0
  const subtotal = ct.subtotal
  if (subtotal <= 0) {
    notes.push('"계" 행의 소계를 읽지 못해 열 순서 검산을 건너뛰었어요. 값을 증명서와 대조하세요.')
    return { fields, notes }
  }

  // 조건별(주간·야간·야외·계기)
  const day = r1(ct.dayVfrPic + ct.dayVfrOther + ct.dayXcPic + ct.dayXcOther)
  const night = r1(ct.nightVfrPic + ct.nightVfrOther + ct.nightXcPic + ct.nightXcOther)
  const xc = r1(ct.dayXcPic + ct.dayXcOther + ct.nightXcPic + ct.nightXcOther)
  const nightXc = r1(ct.nightXcPic + ct.nightXcOther)
  const condOk = near(day + night, subtotal)

  // 임무별(기장·부조종사·교관·학생) — 교관·학생이 바뀌어 베껴진 경우 되돌린다
  let { instructor, student } = ct
  let dutyOk = near(r1(ct.pic + ct.picSupervised + ct.sic + student), subtotal)
  if (!dutyOk && near(r1(ct.pic + ct.picSupervised + ct.sic + instructor), subtotal) && instructor <= ct.pic + 0.05) {
    ;[instructor, student] = [student, instructor]
    dutyOk = true
    notes.push(`교관조종사(${instructor})와 학생조종사(${student})가 바뀌어 읽혀서 바로잡았어요.`)
  }
  const instOk = dutyOk && instructor <= ct.pic + 0.05

  if (condOk) {
    fields.conditionDay = day
    fields.conditionNight = night
    fields.crossCountry = xc
    fields.nightCrossCountry = nightXc
    fields.actualInstrument = ct.instActual
    fields.simulatedInstrument = ct.instSim
    fields.groundTrainerTime = ct.other
  } else {
    notes.push(`"계" 행 검산이 안 맞아요: 주간 ${day} + 야간 ${night} = ${r1(day + night)} 인데 소계는 ${subtotal}. 조건별 시간을 증명서와 대조하세요.`)
  }
  if (instOk) {
    fields.blockTime = subtotal
    fields.picTime = ct.pic
    fields.picSupervisedTime = ct.picSupervised
    fields.sicTime = ct.sic
    fields.flightInstructorTime = instructor
  } else {
    notes.push(`"계" 행 검산이 안 맞아요: 기장 ${ct.pic} + 부조종사 ${r1(ct.picSupervised + ct.sic)} + 학생 ${student} 이(가) 소계 ${subtotal} 와 달라요. 임무별 시간을 증명서와 대조하세요.`)
  }
  if (ct.landings > 0) fields.dayLandings = ct.landings
  if (condOk && instOk) notes.unshift('증명서 "계" 행을 열 순서대로 읽고 검산(주간+야간=소계, 기장+부조종사+학생=소계)까지 맞았어요.')
  return { fields, notes }
}

/** 서식과 무관한 공통 검산. 값은 바꾸지 않고 경고만 */
export function sanityNotes(f: AiFields): string[] {
  const notes: string[] = []
  const g = (k: string) => toNum(f[k])
  const block = g('blockTime')
  const day = g('conditionDay')
  const night = g('conditionNight')
  const xc = g('crossCountry')
  const pic = g('picTime')
  const inst = g('flightInstructorTime')
  const act = g('actualInstrument')
  const sim = g('simulatedInstrument')
  const ground = g('groundTrainerTime') ?? 0
  const se = g('singleEngineLand') ?? 0
  const me = g('multiEngineLand') ?? 0
  const rotor = g('rotorcraftHelicopter') ?? 0

  if (block !== undefined) {
    if (day !== undefined && night !== undefined && day + night > block + 0.2) notes.push(`주간 ${day} + 야간 ${night} 이(가) 총 비행시간 ${block} 보다 커요. 확인해 주세요.`)
    if (xc !== undefined && xc > block + 0.2) notes.push(`크로스컨트리 ${xc} 이(가) 총 비행시간 ${block} 보다 커요.`)
    if (pic !== undefined && pic > block + 0.2) notes.push(`기장 시간 ${pic} 이(가) 총 비행시간 ${block} 보다 커요.`)
    if (act !== undefined && sim !== undefined && act + sim > block + ground + 0.2) notes.push(`실제계기 ${act} + 모의계기 ${sim} 이(가) 총 비행시간(시뮬레이터 포함) ${r1(block + ground)} 보다 커요.`)
    const cat = se + me + rotor
    if (cat > 0 && !near(cat, block, 0.3)) notes.push(`단발 ${se} + 다발 ${me} + 회전익 ${rotor} = ${r1(cat)} 인데 총 비행시간은 ${block} 이에요. 범주별 시간을 확인해 주세요.`)
  }
  if (inst !== undefined && pic !== undefined && inst > pic + 0.05) notes.push(`교관 시간 ${inst} 이(가) 기장 시간 ${pic} 보다 커요. 열이 잘못 읽혔을 수 있어요.`)
  // 별지 36호에서 계기 세 열(실제/모의/기타)이 한 칸 밀리면 모의계기 = 시뮬레이터(기타)가 된다
  if (sim !== undefined && ground > 0 && near(sim, ground, 0.05) && act !== undefined && act > 0) notes.push(`모의계기 ${sim} 와 시뮬레이터 ${ground} 가 같아요. 계기비행 열(실제/모의/기타)이 한 칸 밀려 읽혔을 수 있으니 확인해 주세요.`)
  return notes
}
