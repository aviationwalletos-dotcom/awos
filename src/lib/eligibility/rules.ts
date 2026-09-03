/**
 * AWOS — 자격증명 응시경력 규칙 데이터
 * 출처: 항공안전법 시행규칙 [별표 4] <개정 2025. 12. 5.>
 *       (제75조, 제91조 및 제286조 관련)
 *
 * ⚠️ 본 데이터는 참고용 진척도 계산을 위한 것이며 법적 판정이 아님.
 *    UI에는 반드시 "참고치 · 최종 판정은 지방항공청/공단" 배너를 노출할 것.
 *
 * 범위(v1.1): 항공기 조종사(비행기·헬리콥터), 경량항공기 조종사
 *   - 활공기·비행선: 규칙 미인코딩 (deferred, 로그북 문화 미미)
 *   - 초경량비행장치: 범위 외
 *   - 항공사/항공기관사/관제사/정비사/운항관리사: 조종 로그북 아님, 범위 외
 */

/* ────────────────────────────────────────────
 * 1. 기본 타입
 * ──────────────────────────────────────────── */

/** 모의비행훈련장치 구분 (별표 4 전반) */
export type SimDevice =
  | 'FFS'   // 모의비행장치
  | 'FTD'   // 비행훈련장치
  | 'BATD'; // 기본비행훈련장치

export const SIM_DEVICE_LABEL: Record<SimDevice, string> = {
  FFS: '모의비행장치',
  FTD: '비행훈련장치',
  BATD: '기본비행훈련장치',
};

/** 항공기 종류 */
export type AircraftCategory = 'AIRPLANE' | 'HELICOPTER';

export const CATEGORY_LABEL: Record<AircraftCategory, string> = {
  AIRPLANE: '비행기',
  HELICOPTER: '헬리콥터',
};

/**
 * 로그북에서 집계되어야 하는 필드.
 * 별표 4를 계산하려면 이 값들이 전부 비행 1건 단위로 기록돼 있어야 함.
 * (schema10 설계 시 이 목록이 최소 요구사항)
 */
export type LogField =
  | 'total'              // 총 비행시간
  | 'pic'                // 기장
  | 'sic'                // 기장 외 조종사
  | 'picSupervised'      // 기장 감독 하 기장 임무 수행 (SIC U/S)
  | 'solo'               // 단독
  | 'soloXc'             // 단독 야외
  | 'xc'                 // 야외
  | 'picXc'              // 기장으로서 야외
  | 'picSupervisedXc'    // 감독 하 기장임무 야외
  | 'instrument'         // 계기비행 (실제)
  | 'instrumentTraining' // 계기비행훈련
  | 'night'              // 야간
  | 'picNight'           // 기장으로서 야간
  | 'nightTakeoffs'      // 야간 이륙 횟수
  | 'nightLandings'      // 야간 착륙 횟수
  | 'instructionGiven'   // 조종교육업무 수행 비행시간
  | 'dualReceived'       // 동승 비행훈련 수료시간
  | 'lsaTotal'           // 경량항공기 총시간
  | 'lsaSolo'            // 경량항공기 단독
  | 'lsaXc'              // 경량항공기 야외
  | 'ulPoweredTotal'     // 동력비행장치 총시간 (경량항공기 타면조종형비행기 합산)
  | 'ulPoweredSolo'      // 동력비행장치 단독
  | 'ulRotorTotal'       // 회전익비행장치 총시간 (경량헬리콥터 합산)
  | 'ulRotorSolo';       // 회전익비행장치 단독

export const LOG_FIELD_LABEL: Record<LogField, string> = {
  total: '총 비행시간',
  pic: '기장',
  sic: '기장 외 조종사',
  picSupervised: '감독 하 기장임무',
  solo: '단독',
  soloXc: '단독 야외',
  xc: '야외',
  picXc: '기장 야외',
  picSupervisedXc: '감독 하 기장임무 야외',
  instrument: '계기비행',
  instrumentTraining: '계기비행훈련',
  night: '야간',
  picNight: '기장 야간',
  nightTakeoffs: '야간 이륙',
  nightLandings: '야간 착륙',
  instructionGiven: '조종교육업무',
  dualReceived: '동승 비행훈련',
  lsaTotal: '경량항공기 총시간',
  lsaSolo: '경량항공기 단독',
  lsaXc: '경량항공기 야외',
  ulPoweredTotal: '동력비행장치 총시간',
  ulPoweredSolo: '동력비행장치 단독',
  ulRotorTotal: '회전익비행장치 총시간',
  ulRotorSolo: '회전익비행장치 단독',
};

/* ────────────────────────────────────────────
 * 2. 인정 상한 (Credit caps)
 *    별표 4의 핵심 난이도. 앱이 실제 가치를 주는 지점.
 * ──────────────────────────────────────────── */

/** 모의비행훈련장치 인정 상한 */
export interface SimCredit {
  /** 시뮬 합산 인정 총 상한(시간) */
  total: number;
  /** 장치별 개별 상한(시간). 미기재 장치는 인정 불가로 간주 */
  perDevice: Partial<Record<SimDevice, number>>;
  /** FTD + BATD 합산 상한(시간). 있으면 추가로 적용 */
  combinedFtdBatd?: number;
  note?: string;
}

/** 다른 종류 항공기(또는 경량항공기) 경력 인정 상한 */
export interface CrossCategoryCredit {
  /** 해당 비행시간의 분수 (예: 1/3) */
  fraction: number;
  /** 절대 상한(시간). fraction 적용값과 비교해 적은 쪽 인정 */
  cap: number;
  /** 경량항공기 경력도 인정되는지 (자가용만 해당) */
  includesLsa?: boolean;
  note?: string;
}

/** 시뮬 시간 배열을 상한에 맞춰 인정시간으로 환산 */
export function applySimCredit(
  logged: Partial<Record<SimDevice, number>>,
  credit: SimCredit
): { credited: number; breakdown: Record<string, number>; capped: SimDevice[] } {
  const breakdown: Record<string, number> = {};
  const capped: SimDevice[] = [];

  // 1) 장치별 상한
  const ffs = Math.min(logged.FFS ?? 0, credit.perDevice.FFS ?? 0);
  let ftd = Math.min(logged.FTD ?? 0, credit.perDevice.FTD ?? 0);
  let batd = Math.min(logged.BATD ?? 0, credit.perDevice.BATD ?? 0);

  if ((logged.FFS ?? 0) > ffs) capped.push('FFS');
  if ((logged.FTD ?? 0) > ftd) capped.push('FTD');
  if ((logged.BATD ?? 0) > batd) capped.push('BATD');

  // 2) FTD + BATD 합산 상한
  if (credit.combinedFtdBatd != null && ftd + batd > credit.combinedFtdBatd) {
    const over = ftd + batd - credit.combinedFtdBatd;
    // BATD부터 깎음(FTD 인정폭이 더 넓으므로 사용자에게 유리)
    const cutBatd = Math.min(batd, over);
    batd -= cutBatd;
    ftd -= over - cutBatd;
  }

  breakdown.FFS = ffs;
  breakdown.FTD = ftd;
  breakdown.BATD = batd;

  // 3) 총 상한
  const credited = Math.min(ffs + ftd + batd, credit.total);
  return { credited, breakdown, capped };
}

/** 타 종류 항공기 경력 환산 */
export function applyCrossCategoryCredit(
  loggedHours: number,
  credit: CrossCategoryCredit
): number {
  return Math.min(loggedHours * credit.fraction, credit.cap);
}

/* ────────────────────────────────────────────
 * 3. 요건 표현
 * ──────────────────────────────────────────── */

export interface HourRequirement {
  kind: 'hours';
  id: string;
  label: string;
  field: LogField;
  hours: number;
  /** 전문교육기관 이수자에게 완화된 값이 있으면 기재 */
  hoursIfApprovedSchool?: number;
  note?: string;
}

export interface CountRequirement {
  kind: 'count';
  id: string;
  label: string;
  field: LogField;
  count: number;
  note?: string;
}

/** 거리·비행장 수 조건처럼 자동판정이 어려운 항목 (사용자 체크 + 근거 비행 지정) */
export interface ManualRequirement {
  kind: 'manual';
  id: string;
  label: string;
  /** 거리 조건(km) — 로그에 구간거리가 있으면 반자동 판정 가능 */
  distanceKm?: number;
  /** 서로 다른 착륙지점(비행장) 수 */
  distinctLandingPoints?: number;
  note?: string;
}

/** 선행 자격 보유 조건 */
export interface PrereqRequirement {
  kind: 'prereq';
  id: string;
  label: string;
  /** 자격 덱에서 참조할 카드 키 */
  requires: string[];
  note?: string;
}

/** 여러 경로 중 하나만 충족하면 되는 경우 */
export interface AnyOfRequirement {
  kind: 'anyOf';
  id: string;
  label: string;
  options: Requirement[][];
  note?: string;
}

export type Requirement =
  | HourRequirement
  | CountRequirement
  | ManualRequirement
  | PrereqRequirement
  | AnyOfRequirement;

export interface EligibilityRule {
  id: string;
  /** UI 표시명 */
  title: string;
  category?: AircraftCategory;
  /** 근거 조문 */
  source: string;
  /** 전문교육기관 이수 시 완화 적용 여부 */
  approvedSchoolVariant: boolean;
  simCredit?: SimCredit;
  crossCategory?: CrossCategoryCredit;
  requirements: Requirement[];
  notes?: string[];
}

/* ────────────────────────────────────────────
 * 4. 자가용 조종사
 * ──────────────────────────────────────────── */

const PPL_SIM: SimCredit = {
  total: 5,
  perDevice: { FFS: 5, FTD: 5, BATD: 5 },
  note: '지방항공청장 지정 모의비행훈련장치, 최대 5시간',
};

const PPL_CROSS: CrossCategoryCredit = {
  fraction: 1 / 3,
  cap: 10,
  includesLsa: true,
  note: '다른 종류 항공기 또는 경량항공기(조종형비행기→비행기, 경량헬리콥터→헬리콥터) 경력. 1/3 또는 10시간 중 적은 시간',
};

export const PPL_AIRPLANE: EligibilityRule = {
  id: 'ppl-airplane',
  title: '자가용 조종사 (비행기)',
  category: 'AIRPLANE',
  source: '별표 4 제1호 가목 · 자가용 조종사 1)',
  approvedSchoolVariant: true,
  simCredit: PPL_SIM,
  crossCategory: PPL_CROSS,
  requirements: [
    {
      kind: 'hours',
      id: 'total',
      label: '총 비행경력',
      field: 'total',
      hours: 40,
      hoursIfApprovedSchool: 35,
    },
    { kind: 'hours', id: 'solo', label: '단독 비행경력', field: 'solo', hours: 10 },
    { kind: 'hours', id: 'soloXc', label: '단독 야외 비행경력', field: 'soloXc', hours: 5 },
    {
      kind: 'manual',
      id: 'xc-route',
      label: '270km 이상 구간 · 2개 다른 비행장 이륙·완전착륙',
      distanceKm: 270,
      distinctLandingPoints: 2,
      note: '단독 야외 비행경력 중 포함되어야 함',
    },
  ],
};

export const PPL_HELICOPTER: EligibilityRule = {
  id: 'ppl-helicopter',
  title: '자가용 조종사 (헬리콥터)',
  category: 'HELICOPTER',
  source: '별표 4 제1호 가목 · 자가용 조종사 1)',
  approvedSchoolVariant: true,
  simCredit: PPL_SIM,
  crossCategory: PPL_CROSS,
  requirements: [
    {
      kind: 'hours',
      id: 'total',
      label: '총 비행경력',
      field: 'total',
      hours: 40,
      hoursIfApprovedSchool: 35,
    },
    { kind: 'hours', id: 'solo', label: '단독 비행경력', field: 'solo', hours: 10 },
    { kind: 'hours', id: 'soloXc', label: '단독 야외 비행경력', field: 'soloXc', hours: 5 },
    {
      kind: 'manual',
      id: 'xc-route',
      label: '출발지점 180km 이상 구간 · 2개 다른 지점 착륙',
      distanceKm: 180,
      distinctLandingPoints: 2,
    },
  ],
};

/* ────────────────────────────────────────────
 * 5. 사업용 조종사
 * ──────────────────────────────────────────── */

const CPL_SIM: SimCredit = {
  total: 20,
  perDevice: { FFS: 20, FTD: 20, BATD: 5 },
  note: '모의비행장치 또는 비행훈련장치 20시간, 기본비행훈련장치 5시간 범위',
};

const CPL_CROSS: CrossCategoryCredit = {
  fraction: 1 / 3,
  cap: 50,
  note: '다른 종류 항공기 비행경력. 1/3 또는 50시간 중 적은 시간',
};

export const CPL_AIRPLANE: EligibilityRule = {
  id: 'cpl-airplane',
  title: '사업용 조종사 (비행기)',
  category: 'AIRPLANE',
  source: '별표 4 제1호 가목 · 사업용 조종사 1)',
  approvedSchoolVariant: true,
  simCredit: CPL_SIM,
  crossCategory: CPL_CROSS,
  requirements: [
    {
      kind: 'prereq',
      id: 'prereq',
      label: '자가용 조종사 자격증명(비행기) 보유',
      requires: ['ppl-airplane'],
      note: '외국정부 발급 운송용·사업용 자격증명 포함',
    },
    {
      kind: 'hours',
      id: 'total',
      label: '총 비행경력',
      field: 'total',
      hours: 200,
      hoursIfApprovedSchool: 150,
    },
    {
      kind: 'hours',
      id: 'pic',
      label: '기장 비행경력',
      field: 'pic',
      hours: 100,
      hoursIfApprovedSchool: 70,
    },
    { kind: 'hours', id: 'picXc', label: '기장 야외 비행경력', field: 'picXc', hours: 20 },
    {
      kind: 'manual',
      id: 'xc-route',
      label: '총 540km 이상 구간 · 2개 이상 다른 비행장 완전착륙',
      distanceKm: 540,
      distinctLandingPoints: 2,
    },
    {
      kind: 'hours',
      id: 'instrument',
      label: '계기비행경력',
      field: 'instrument',
      hours: 10,
      note: '5시간 범위 내 모의비행훈련장치 계기비행경력 포함 가능',
    },
    { kind: 'hours', id: 'picNight', label: '기장 야간 비행경력', field: 'picNight', hours: 5 },
    { kind: 'count', id: 'nightTakeoffs', label: '야간 이륙', field: 'nightTakeoffs', count: 5 },
    { kind: 'count', id: 'nightLandings', label: '야간 착륙', field: 'nightLandings', count: 5 },
  ],
};

export const CPL_HELICOPTER: EligibilityRule = {
  id: 'cpl-helicopter',
  title: '사업용 조종사 (헬리콥터)',
  category: 'HELICOPTER',
  source: '별표 4 제1호 가목 · 사업용 조종사 2)',
  approvedSchoolVariant: true,
  simCredit: CPL_SIM,
  crossCategory: CPL_CROSS,
  requirements: [
    {
      kind: 'prereq',
      id: 'prereq',
      label: '자가용 조종사 자격증명(헬리콥터) 보유',
      requires: ['ppl-helicopter'],
    },
    {
      kind: 'hours',
      id: 'total',
      label: '총 비행경력',
      field: 'total',
      hours: 150,
      hoursIfApprovedSchool: 100,
    },
    { kind: 'hours', id: 'pic', label: '기장 비행경력', field: 'pic', hours: 35 },
    { kind: 'hours', id: 'picXc', label: '기장 야외 비행경력', field: 'picXc', hours: 10 },
    {
      kind: 'manual',
      id: 'xc-route',
      label: '총 300km 이상 구간 · 2개 다른 지점 착륙',
      distanceKm: 300,
      distinctLandingPoints: 2,
    },
    {
      kind: 'hours',
      id: 'instrument',
      label: '계기비행경력',
      field: 'instrument',
      hours: 10,
      note: '5시간 범위 내 모의비행훈련장치 계기비행경력 포함 가능',
    },
    { kind: 'hours', id: 'picNight', label: '기장 야간 비행경력', field: 'picNight', hours: 5 },
    { kind: 'count', id: 'nightTakeoffs', label: '야간 이륙', field: 'nightTakeoffs', count: 5 },
    { kind: 'count', id: 'nightLandings', label: '야간 착륙', field: 'nightLandings', count: 5 },
  ],
};

/* ────────────────────────────────────────────
 * 6. 운송용 조종사
 * ──────────────────────────────────────────── */

const ATPL_SIM: SimCredit = {
  total: 100,
  perDevice: { FFS: 100, FTD: 25, BATD: 5 },
  combinedFtdBatd: 25,
  note: 'FFS 100 / FTD 25 / BATD 5, 단 FTD+BATD 합산 25시간 초과 불가',
};

const ATPL_CROSS: CrossCategoryCredit = {
  fraction: 1 / 3,
  cap: 200,
  note: '다른 종류 항공기 비행경력. 1/3 또는 200시간 중 적은 시간',
};

export const ATPL_AIRPLANE: EligibilityRule = {
  id: 'atpl-airplane',
  title: '운송용 조종사 (비행기)',
  category: 'AIRPLANE',
  source: '별표 4 제1호 가목 · 운송용 조종사 1)',
  approvedSchoolVariant: false,
  simCredit: ATPL_SIM,
  crossCategory: ATPL_CROSS,
  requirements: [
    {
      kind: 'prereq',
      id: 'prereq',
      label: '계기비행증명을 받은 사업용 조종사 또는 부조종사 자격증명',
      requires: ['cpl-airplane', 'ir-airplane'],
    },
    { kind: 'hours', id: 'total', label: '총 비행경력', field: 'total', hours: 1500 },
    {
      kind: 'anyOf',
      id: 'command-experience',
      label: '기장 경력 요건',
      options: [
        [
          {
            kind: 'hours',
            id: 'sup-500',
            label: '감독 하 기장임무 500시간',
            field: 'picSupervised',
            hours: 500,
          },
        ],
        [{ kind: 'hours', id: 'pic-250', label: '기장 250시간', field: 'pic', hours: 250 }],
        [
          {
            kind: 'hours',
            id: 'pic-70-mix',
            label: '기장 70시간 이상 + 부족분 보전',
            field: 'pic',
            hours: 70,
            note: '기장시간×2와 500시간의 차이만큼 감독 하 기장임무 비행경력으로 충당',
          },
        ],
      ],
    },
    { kind: 'hours', id: 'xc', label: '야외 비행경력', field: 'xc', hours: 200 },
    {
      kind: 'anyOf',
      id: 'xc-command',
      label: '야외 중 기장급 경력 100시간',
      options: [
        [{ kind: 'hours', id: 'picXc-100', label: '기장 야외', field: 'picXc', hours: 100 }],
        [
          {
            kind: 'hours',
            id: 'supXc-100',
            label: '감독 하 기장임무 야외',
            field: 'picSupervisedXc',
            hours: 100,
          },
        ],
      ],
    },
    {
      kind: 'hours',
      id: 'instrument',
      label: '계기비행경력',
      field: 'instrument',
      hours: 75,
      note: '30시간 범위 내 모의비행훈련장치 계기비행경력 인정',
    },
    { kind: 'hours', id: 'night', label: '야간 비행경력', field: 'night', hours: 100 },
  ],
};

export const ATPL_HELICOPTER: EligibilityRule = {
  id: 'atpl-helicopter',
  title: '운송용 조종사 (헬리콥터)',
  category: 'HELICOPTER',
  source: '별표 4 제1호 가목 · 운송용 조종사 2)',
  approvedSchoolVariant: false,
  simCredit: ATPL_SIM,
  crossCategory: ATPL_CROSS,
  requirements: [
    {
      kind: 'prereq',
      id: 'prereq',
      label: '사업용 조종사 자격증명(헬리콥터) 보유',
      requires: ['cpl-helicopter'],
    },
    { kind: 'hours', id: 'total', label: '총 비행경력', field: 'total', hours: 1000 },
    {
      kind: 'anyOf',
      id: 'command-experience',
      label: '기장 경력 요건',
      options: [
        [{ kind: 'hours', id: 'pic-250', label: '기장 250시간', field: 'pic', hours: 250 }],
        [
          {
            kind: 'hours',
            id: 'pic-70',
            label: '기장 70시간 이상',
            field: 'pic',
            hours: 70,
            note: '기장 + 감독 하 기장임무 합계 250시간 이상',
          },
        ],
      ],
    },
    { kind: 'hours', id: 'xc', label: '야외 비행경력', field: 'xc', hours: 200 },
    {
      kind: 'anyOf',
      id: 'xc-command',
      label: '야외 중 기장급 경력 100시간',
      options: [
        [{ kind: 'hours', id: 'picXc-100', label: '기장 야외', field: 'picXc', hours: 100 }],
        [
          {
            kind: 'hours',
            id: 'supXc-100',
            label: '감독 하 기장임무 야외',
            field: 'picSupervisedXc',
            hours: 100,
          },
        ],
      ],
    },
    {
      kind: 'hours',
      id: 'instrument',
      label: '계기비행경력',
      field: 'instrument',
      hours: 30,
      note: '10시간 범위 내 모의비행훈련장치 계기비행경력 인정',
    },
    { kind: 'hours', id: 'night', label: '야간 비행경력', field: 'night', hours: 50 },
  ],
};

/* ────────────────────────────────────────────
 * 7. 부조종사 (MPL)
 * ──────────────────────────────────────────── */

export const MPL: EligibilityRule = {
  id: 'mpl',
  title: '부조종사',
  category: 'AIRPLANE',
  source: '별표 4 제1호 가목 · 부조종사',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'manual',
      id: 'approved-school',
      label: '국토교통부장관 지정 전문교육기관 교육과정 이수',
    },
    {
      kind: 'hours',
      id: 'total-with-sim',
      label: '모의비행훈련 + 실제 비행 합계',
      field: 'total',
      hours: 240,
    },
    {
      kind: 'hours',
      id: 'actual',
      label: '실제 비행기 비행시간',
      field: 'total',
      hours: 40,
      note: '시뮬 제외 실비행 기준',
    },
    { kind: 'hours', id: 'solo', label: '단독 비행경력', field: 'solo', hours: 10 },
    { kind: 'hours', id: 'soloXc', label: '단독 야외 비행경력', field: 'soloXc', hours: 5 },
    {
      kind: 'manual',
      id: 'xc-route',
      label: '270km 이상 구간 · 2개 다른 비행장 이륙·착륙',
      distanceKm: 270,
      distinctLandingPoints: 2,
    },
    { kind: 'manual', id: 'night', label: '야간비행경력 보유' },
    { kind: 'manual', id: 'instrument', label: '계기비행 경험 보유' },
  ],
};

/* ────────────────────────────────────────────
 * 8. 계기비행증명
 * ──────────────────────────────────────────── */

const IR_SIM: SimCredit = {
  total: 20,
  perDevice: { FFS: 20, FTD: 20, BATD: 5 },
  note: '계기비행훈련 40시간 중 최대 20시간. FFS/FTD 20, BATD 5 범위',
};

function makeIR(category: AircraftCategory): EligibilityRule {
  return {
    id: category === 'AIRPLANE' ? 'ir-airplane' : 'ir-helicopter',
    title: `계기비행증명 (${CATEGORY_LABEL[category]})`,
    category,
    source: '별표 4 제1호 나목 · 계기비행증명 · 조종사',
    approvedSchoolVariant: false,
    simCredit: IR_SIM,
    requirements: [
      {
        kind: 'prereq',
        id: 'prereq',
        label: '해당 항공기 운송용·사업용 또는 자가용 조종사 자격증명 보유',
        requires:
          category === 'AIRPLANE'
            ? ['ppl-airplane', 'cpl-airplane', 'atpl-airplane']
            : ['ppl-helicopter', 'cpl-helicopter', 'atpl-helicopter'],
      },
      {
        kind: 'hours',
        id: 'picXc-total',
        label: '기장으로서 해당 종류 총 야외비행경력',
        field: 'picXc',
        hours: 50,
      },
      {
        kind: 'hours',
        id: 'picXc-type',
        label: '해당 항공기 기장 야외비행경력',
        field: 'picXc',
        hours: 10,
        note: '위 50시간 안에 포함',
      },
      {
        kind: 'hours',
        id: 'instrument-training',
        label: '계기비행훈련',
        field: 'instrumentTraining',
        hours: 40,
      },
    ],
  };
}

export const IR_AIRPLANE = makeIR('AIRPLANE');
export const IR_HELICOPTER = makeIR('HELICOPTER');

/* ────────────────────────────────────────────
 * 9. 조종교육증명
 * ──────────────────────────────────────────── */

function makeCFIBasic(category: AircraftCategory): EligibilityRule {
  return {
    id: category === 'AIRPLANE' ? 'cfi-basic-airplane' : 'cfi-basic-helicopter',
    title: `초급 조종교육증명 (${CATEGORY_LABEL[category]})`,
    category,
    source: '별표 4 제1호 나목 · 조종교육증명 · 초급',
    approvedSchoolVariant: false,
    requirements: [
      {
        kind: 'hours',
        id: 'category-total',
        label: '해당 항공기 종류 비행경력',
        field: 'total',
        hours: 200,
      },
      {
        kind: 'prereq',
        id: 'prereq-cpl',
        label: '운송용 또는 사업용 조종사 자격증명 보유',
        requires:
          category === 'AIRPLANE'
            ? ['cpl-airplane', 'atpl-airplane']
            : ['cpl-helicopter', 'atpl-helicopter'],
      },
      {
        kind: 'anyOf',
        id: 'training',
        label: '조종교관과정 또는 동승 비행훈련',
        options: [
          [
            {
              kind: 'manual',
              id: 'formal-course',
              label: '전문교육기관 또는 제작사 조종교관과정 이수',
            },
          ],
          [
            {
              kind: 'hours',
              id: 'dual',
              label: '조종교육증명 보유자와 동승 비행훈련',
              field: 'dualReceived',
              hours: 25,
              note: '지상교육 별도 인정 필요',
            },
          ],
        ],
      },
      {
        kind: 'prereq',
        id: 'prereq-ir',
        label: '계기비행증명 보유',
        requires: [category === 'AIRPLANE' ? 'ir-airplane' : 'ir-helicopter'],
        note: '비행기 또는 헬리콥터 초급 조종교육증명에만 해당',
      },
    ],
  };
}

function makeCFISenior(category: AircraftCategory): EligibilityRule {
  return {
    id: category === 'AIRPLANE' ? 'cfi-senior-airplane' : 'cfi-senior-helicopter',
    title: `선임 조종교육증명 (${CATEGORY_LABEL[category]})`,
    category,
    source: '별표 4 제1호 나목 · 조종교육증명 · 선임',
    approvedSchoolVariant: false,
    requirements: [
      {
        kind: 'prereq',
        id: 'prereq',
        label: '해당 종류·등급 초급 조종교육증명 보유',
        requires: [category === 'AIRPLANE' ? 'cfi-basic-airplane' : 'cfi-basic-helicopter'],
      },
      {
        kind: 'hours',
        id: 'instruction',
        label: '초급 취득 후 조종교육업무 수행 비행경력',
        field: 'instructionGiven',
        hours: 275,
      },
      { kind: 'hours', id: 'total', label: '총 비행경력', field: 'total', hours: 500 },
    ],
  };
}

export const CFI_BASIC_AIRPLANE = makeCFIBasic('AIRPLANE');
export const CFI_BASIC_HELICOPTER = makeCFIBasic('HELICOPTER');
export const CFI_SENIOR_AIRPLANE = makeCFISenior('AIRPLANE');
export const CFI_SENIOR_HELICOPTER = makeCFISenior('HELICOPTER');

/* ────────────────────────────────────────────
 * 10. 등급 한정 (별표 4 제1호 나목 · 한정심사)
 * ──────────────────────────────────────────── */

export const CLASS_RATING: EligibilityRule = {
  id: 'class-rating',
  title: '항공기 등급 한정',
  source: '별표 4 제1호 나목 · 자격증명 한정 · 다)',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'hours',
      id: 'class-time',
      label: '해당 항공기 종류·등급 비행시간',
      field: 'total',
      hours: 10,
    },
  ],
};

/* ────────────────────────────────────────────
 * 11. 경량항공기 조종사
 * ──────────────────────────────────────────── */

export const LSA_PILOT: EligibilityRule = {
  id: 'lsa-pilot',
  title: '경량항공기 조종사',
  source: '별표 4 제2호 가목',
  approvedSchoolVariant: true,
  requirements: [
    {
      kind: 'anyOf',
      id: 'path',
      label: '경력 경로',
      options: [
        // 경로 1·2: 일반 / 전문교육기관 (요건 동일, 20시간)
        [
          {
            kind: 'hours',
            id: 'lsa-total',
            label: '경량항공기 비행경력',
            field: 'lsaTotal',
            hours: 20,
          },
          { kind: 'hours', id: 'lsa-solo', label: '단독 비행경력', field: 'lsaSolo', hours: 5 },
          {
            kind: 'hours',
            id: 'lsa-xc',
            label: '야외 비행경력',
            field: 'lsaXc',
            hours: 5,
            note: '조종형비행기·경량헬리콥터·자이로플레인만 해당',
          },
          {
            kind: 'manual',
            id: 'lsa-xc-route',
            label: '120km 이상 구간 · 1개 이상 다른 지점 이륙·착륙',
            distanceKm: 120,
            distinctLandingPoints: 1,
          },
        ],
        // 경로 3: 항공기 조종사 자격 보유자
        [
          {
            kind: 'prereq',
            id: 'prereq-pilot',
            label: '자가용·사업용·운송용 조종사 또는 부조종사 자격증명 보유',
            requires: ['ppl-airplane', 'ppl-helicopter', 'cpl-airplane', 'cpl-helicopter', 'mpl'],
            note: '비행기 한정 → 조종형비행기 / 헬리콥터 한정 → 경량헬리콥터·자이로플레인',
          },
          {
            kind: 'hours',
            id: 'lsa-total-short',
            label: '경량항공기 비행경력',
            field: 'lsaTotal',
            hours: 5,
          },
          {
            kind: 'hours',
            id: 'lsa-solo-short',
            label: '단독 비행경력',
            field: 'lsaSolo',
            hours: 2,
          },
        ],
      ],
    },
  ],
};

export const LSA_CFI: EligibilityRule = {
  id: 'lsa-cfi',
  title: '경량항공기 조종교육증명',
  source: '별표 4 제2호 나목',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'anyOf',
      id: 'path',
      label: '경력 경로',
      options: [
        [
          {
            kind: 'prereq',
            id: 'prereq-cfi',
            label: '항공기 조종교육증명 보유',
            requires: ['cfi-basic-airplane', 'cfi-basic-helicopter'],
          },
          {
            kind: 'hours',
            id: 'lsa-5',
            label: '해당 경량항공기 비행경력',
            field: 'lsaTotal',
            hours: 5,
          },
        ],
        [
          {
            kind: 'prereq',
            id: 'prereq-lsa',
            label: '경량항공기 조종사 자격증명 보유',
            requires: ['lsa-pilot'],
          },
          {
            kind: 'manual',
            id: 'formal-course',
            label: '전문교육기관 또는 제작사 조종교관과정 이수 (또는 외국정부 교육증명)',
          },
        ],
        [
          {
            kind: 'prereq',
            id: 'prereq-lsa-2',
            label: '경량항공기 조종사 자격증명 보유',
            requires: ['lsa-pilot'],
          },
          {
            kind: 'hours',
            id: 'lsa-200',
            label: '경량항공기 종류별 비행경력',
            field: 'lsaTotal',
            hours: 200,
            note: '조종형 경량비행기는 비행기 경력, 경량헬리콥터는 헬리콥터 경력 포함',
          },
          {
            kind: 'hours',
            id: 'lsa-dual',
            label: '경량항공기 조종교육증명 보유자와 비행훈련',
            field: 'dualReceived',
            hours: 15,
          },
          { kind: 'manual', id: 'ground', label: '국토교통부장관 인정 지상교육 이수' },
        ],
      ],
    },
  ],
};

/* ────────────────────────────────────────────
 * 11-2. 초경량비행장치 조종자증명 (유인 동력계열만)
 *
 * 출처: 초경량비행장치 조종자 증명 운영세칙 [별표 1], [별표 1의2]
 *       <개정 2024. 7. 17.>
 *
 * 포함 사유: 응시기준이 경량항공기 비행시간을 직접 합산하므로
 *            본 앱의 로그북 집계와 연속성이 있음.
 * 제외: 무인비행장치(별도 세칙 · 출결관리시스템 확인 시간만 인정),
 *       행글라이더 · 패러글라이더 · 낙하산류 · 유인자유기구(별도 생태계)
 * ──────────────────────────────────────────── */

/** 공통 연령 요건 (별표 1 · 공통) */
export const UL_MIN_AGE = 14;

export const UL_POWERED: EligibilityRule = {
  id: 'ul-powered',
  title: '초경량비행장치 조종자 (동력비행장치)',
  source: '초경량비행장치 조종자 증명 운영세칙 [별표 1]',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'anyOf',
      id: 'path',
      label: '경력 경로',
      options: [
        [
          {
            kind: 'hours',
            id: 'ul-total',
            label: '총 비행시간',
            field: 'ulPoweredTotal',
            hours: 20,
            note: '동력비행장치 또는 경량항공기(타면조종형비행기) 탑승 시간 합산',
          },
          {
            kind: 'hours',
            id: 'ul-solo',
            label: '단독 비행',
            field: 'ulPoweredSolo',
            hours: 5,
          },
        ],
        [
          {
            kind: 'prereq',
            id: 'prereq-pilot',
            label: '자가용·사업용·운송용 조종사 자격증명 보유',
            requires: ['ppl-airplane', 'cpl-airplane', 'atpl-airplane'],
          },
          {
            kind: 'hours',
            id: 'ul-total-short',
            label: '총 비행시간',
            field: 'ulPoweredTotal',
            hours: 5,
          },
          {
            kind: 'hours',
            id: 'ul-solo-short',
            label: '단독 비행',
            field: 'ulPoweredSolo',
            hours: 2,
          },
        ],
      ],
    },
  ],
  notes: ['만 14세 이상'],
};

export const UL_ROTOR: EligibilityRule = {
  id: 'ul-rotor',
  title: '초경량비행장치 조종자 (회전익비행장치)',
  source: '초경량비행장치 조종자 증명 운영세칙 [별표 1]',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'anyOf',
      id: 'path',
      label: '경력 경로',
      options: [
        [
          {
            kind: 'hours',
            id: 'ul-total',
            label: '총 비행시간',
            field: 'ulRotorTotal',
            hours: 20,
            note: '회전익비행장치 또는 경량항공기(경량헬리콥터) 탑승 시간 합산',
          },
          {
            kind: 'hours',
            id: 'ul-solo',
            label: '단독 비행',
            field: 'ulRotorSolo',
            hours: 5,
          },
        ],
        [
          {
            kind: 'prereq',
            id: 'prereq-pilot',
            label: '자가용·사업용·운송용 조종사 자격증명 보유',
            requires: ['ppl-helicopter', 'cpl-helicopter', 'atpl-helicopter'],
          },
          {
            kind: 'hours',
            id: 'ul-total-short',
            label: '총 비행시간',
            field: 'ulRotorTotal',
            hours: 5,
          },
          {
            kind: 'hours',
            id: 'ul-solo-short',
            label: '단독 비행',
            field: 'ulRotorSolo',
            hours: 2,
          },
        ],
      ],
    },
  ],
  notes: ['만 14세 이상'],
};

/** 지도조종자 등록기준 (별표 1의2) — 만 20세 이상 + 해당 조종자증명 보유 */
export const UL_INSTRUCTOR_POWERED: EligibilityRule = {
  id: 'ul-instructor-powered',
  title: '지도조종자 (동력비행장치)',
  source: '초경량비행장치 조종자 증명 운영세칙 [별표 1의2]',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'prereq',
      id: 'prereq',
      label: '동력비행장치 조종자증명 보유',
      requires: ['ul-powered'],
    },
    {
      kind: 'hours',
      id: 'total',
      label: '동력비행장치 총 비행시간',
      field: 'ulPoweredTotal',
      hours: 200,
      note: '왕복엔진 육상단발 비행기 비행시간 100시간까지 포함 가능',
    },
  ],
  notes: ['만 20세 이상'],
};

export const UL_INSTRUCTOR_ROTOR: EligibilityRule = {
  id: 'ul-instructor-rotor',
  title: '지도조종자 (회전익비행장치)',
  source: '초경량비행장치 조종자 증명 운영세칙 [별표 1의2]',
  approvedSchoolVariant: false,
  requirements: [
    {
      kind: 'prereq',
      id: 'prereq',
      label: '회전익비행장치 조종자증명 보유',
      requires: ['ul-rotor'],
    },
    {
      kind: 'hours',
      id: 'total',
      label: '회전익비행장치 총 비행시간',
      field: 'ulRotorTotal',
      hours: 200,
      note: '헬리콥터 비행시간 100시간까지 포함 가능',
    },
  ],
  notes: ['만 20세 이상'],
};

/* ────────────────────────────────────────────
 * 12. 레지스트리
 * ──────────────────────────────────────────── */

export const ELIGIBILITY_RULES: EligibilityRule[] = [
  PPL_AIRPLANE,
  PPL_HELICOPTER,
  CPL_AIRPLANE,
  CPL_HELICOPTER,
  ATPL_AIRPLANE,
  ATPL_HELICOPTER,
  MPL,
  IR_AIRPLANE,
  IR_HELICOPTER,
  CFI_BASIC_AIRPLANE,
  CFI_BASIC_HELICOPTER,
  CFI_SENIOR_AIRPLANE,
  CFI_SENIOR_HELICOPTER,
  CLASS_RATING,
  LSA_PILOT,
  LSA_CFI,
  UL_POWERED,
  UL_ROTOR,
  UL_INSTRUCTOR_POWERED,
  UL_INSTRUCTOR_ROTOR,
];

export const RULES_BY_ID: Record<string, EligibilityRule> = Object.fromEntries(
  ELIGIBILITY_RULES.map((r) => [r.id, r])
);

/** 법령 버전 — 개정 시 이 값을 올리고 배너에 노출 */
export const RULESET_VERSION = {
  source: '항공안전법 시행규칙 [별표 4]',
  amendedAt: '2025-12-05',
  encodedAt: '2026-09-03',
  scope:
    '항공기 조종사(비행기·헬리콥터), 경량항공기 조종사, 초경량비행장치 유인 동력계열',
  secondarySources: [
    { name: '초경량비행장치 조종자 증명 운영세칙', amendedAt: '2024-07-17' },
  ],
  excluded: [
    '활공기',
    '비행선',
    '무인비행장치(무인비행기·헬리콥터·멀티콥터·수직이착륙기·비행선 1~4종)',
    '행글라이더 · 패러글라이더 · 낙하산류 · 유인자유기구',
    '조종사 외 항공종사자',
  ],
  exclusionNotes: {
    무인비행장치:
      '비행경력이 지도조종자 확인 + 교육기관 대표 증명 및 출결관리시스템 확인 시간으로만 인정(운영세칙 제9조). 개인 로그북이 증빙으로 기능하지 않아 범위 외.',
  },
} as const;

/* ────────────────────────────────────────────
 * 13. 진척도 계산
 * ──────────────────────────────────────────── */

export type LogTotals = Partial<Record<LogField, number>>

export interface RequirementProgress {
  id: string;
  label: string;
  required: number;
  current: number;
  met: boolean;
  /** 자동판정 불가 — 사용자 확인 필요 */
  manual: boolean;
  note?: string;
}

export interface RuleProgress {
  ruleId: string;
  title: string;
  items: RequirementProgress[];
  metCount: number;
  totalCount: number;
  /** 자동판정 항목만 기준으로 한 완료율 (0~1) */
  ratio: number;
}

export function evaluateRule(
  rule: EligibilityRule,
  totals: LogTotals,
  opts: { approvedSchool?: boolean; heldCertificates?: string[] } = {}
): RuleProgress {
  const items: RequirementProgress[] = [];

  const walk = (reqs: Requirement[]) => {
    for (const r of reqs) {
      switch (r.kind) {
        case 'hours': {
          const required =
            opts.approvedSchool && r.hoursIfApprovedSchool != null
              ? r.hoursIfApprovedSchool
              : r.hours;
          const current = totals[r.field] ?? 0;
          items.push({
            id: r.id,
            label: r.label,
            required,
            current,
            met: current >= required,
            manual: false,
            note: r.note,
          });
          break;
        }
        case 'count': {
          const current = totals[r.field] ?? 0;
          items.push({
            id: r.id,
            label: r.label,
            required: r.count,
            current,
            met: current >= r.count,
            manual: false,
            note: r.note,
          });
          break;
        }
        case 'prereq': {
          const held = opts.heldCertificates ?? [];
          items.push({
            id: r.id,
            label: r.label,
            required: 1,
            current: r.requires.some((x) => held.includes(x)) ? 1 : 0,
            met: r.requires.some((x) => held.includes(x)),
            manual: false,
            note: r.note,
          });
          break;
        }
        case 'manual': {
          items.push({
            id: r.id,
            label: r.label,
            required: 1,
            current: 0,
            met: false,
            manual: true,
            note: r.note,
          });
          break;
        }
        case 'anyOf': {
          // 각 경로를 평가해 가장 진도가 높은 경로를 채택
          let best: RequirementProgress[] = [];
          let bestScore = -1;
          for (const option of r.options) {
            const snapshot = items.length;
            walk(option);
            const produced = items.splice(snapshot);
            const score = produced.filter((p) => p.met).length / Math.max(produced.length, 1);
            if (score > bestScore) {
              bestScore = score;
              best = produced;
            }
          }
          items.push(...best);
          break;
        }
      }
    }
  };

  walk(rule.requirements);

  const auto = items.filter((i) => !i.manual);
  const metCount = items.filter((i) => i.met).length;

  return {
    ruleId: rule.id,
    title: rule.title,
    items,
    metCount,
    totalCount: items.length,
    ratio: auto.length ? auto.filter((i) => i.met).length / auto.length : 0,
  };
}
