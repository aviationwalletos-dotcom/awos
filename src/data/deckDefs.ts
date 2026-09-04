// v1.1 — 트랙별 자격 카드 덱 정의.
// 확정안(법령 대조 완료): 조종사 7장 / 경량항공기 4장 / 초경량비행장치 3장.
// 카드 1장 = 자격 카테고리 1개. 어떤 카테고리를 어느 트랙에 보여줄지는 여기서만 정한다.

import type { CertificateCategory } from '../types/certificate'
import type { PilotTrack } from '../lib/tracks'

export interface DeckCardDef {
  category: CertificateCategory
  /** 카드 상단 영문 표기 */
  en: string
  /** 근거 조문(카드 하단) */
  refText: string
  /** tailwind gradient 클래스 */
  gradient: string
  /** 보유 여부 칩으로 보여줄 표준 항목(빈 배열이면 자유 표기) */
  standards: string[]
  /** 카드 하단 한 줄 안내(선택) */
  hint?: string
  /** 이 카드에 함께 표시할 추가 카테고리(예: 자격증명 카드에 '한정'을 합쳐 보임) */
  extraCategories?: CertificateCategory[]
  /** 실물 자격증(자격명·자격번호·한정사항·특기사항·발급일) 형태로 크게 그리는 마스터 카드 */
  master?: boolean
  /** 등록된 것이 없으면 카드를 아예 숨긴다(교관 확인처럼 학생 단계에만 의미 있는 카드) */
  hideWhenEmpty?: boolean
}

const G = {
  navy: 'from-[#0B2A6B] via-[#123C8F] to-[#1D4ED8]',
  violet: 'from-[#312E81] via-[#4C1D95] to-[#7C3AED]',
  indigo: 'from-[#1E1B4B] via-[#3730A3] to-[#4F46E5]',
  green: 'from-[#064E3B] via-[#047857] to-[#0D9488]',
  amber: 'from-[#7C2D12] via-[#9A3412] to-[#D97706]',
  cyan: 'from-[#155E75] via-[#0E7490] to-[#0891B2]',
  slate: 'from-[#1F2937] via-[#374151] to-[#4B5563]',
  rose: 'from-[#881337] via-[#9F1239] to-[#BE123C]',
  lime: 'from-[#365314] via-[#4D7C0F] to-[#65A30D]',
}

/**
 * 조종사(항공기) 덱 — 4장. 실물 자격증 1장에 자격명·자격번호·한정사항(종류·등급·형식·계기·교육증명)·특기사항(EPTA)이
 * 모두 인쇄되므로 디지털에서도 같은 구조를 따른다. 별도 문서인 신체검사·EPTA(유효기간 관리)·무선통신사만 따로.
 */
export const AIRCRAFT_DECK: DeckCardDef[] = [
  {
    // 실물 자격증과 같은 구조: XII 한정사항에 종류·등급·형식 + 계기비행증명 + 조종교육증명이 함께 인쇄된다.
    category: '조종사 자격증명',
    en: 'PILOT LICENCE',
    refText: '항공안전법 제34조 · 제35조 · 제37조 · 제44조',
    gradient: G.navy,
    standards: ['PPL', 'CPL', 'ATPL', 'MPL'],
    extraCategories: ['한정', '계기비행증명', '조종교육증명', '조종연습허가서'],
    master: true,
  },
  {
    category: '항공신체검사',
    en: 'MEDICAL CERTIFICATE',
    refText: '항공안전법 제40조 · 별표 8',
    gradient: G.green,
    standards: ['1종', '2종', '3종'],
    hint: '1종 보유 시 2·3종 간주 · 월말 만료',
  },
  {
    category: '항공영어구술능력증명',
    en: 'ENGLISH PROFICIENCY',
    refText: '항공안전법 제45조 · 규칙 제99조③',
    gradient: G.rose,
    standards: ['4등급', '5등급', '6등급'],
    hint: '4등급 3년 · 5등급 6년 · 6등급 영구',
  },
  {
    category: '교관 확인',
    en: 'ENDORSEMENTS',
    refText: '운항기술기준 2.2.2.5 · 2.2.2.6 · 2.2.3.5',
    gradient: G.amber,
    standards: ['단독', '야간 단독', '단독 야외', '응시 전'],
    hint: '학생 단독비행 시 교관 확인이 포함된 기록부 소지(8.1.7.6 다)',
    hideWhenEmpty: true,
  },
  {
    category: '무선통신사',
    en: 'RADIO OPERATOR',
    refText: '전파법 제30조 · 규칙 제7조',
    gradient: G.cyan,
    standards: [],
    hint: '무선국 종사자 한정 · 통신보안교육 5년',
  },
]

/** 경량항공기 조종사 덱 — 4장 */
export const LSA_DECK: DeckCardDef[] = [
  {
    category: '경량항공기 조종사 자격증명',
    en: 'LIGHT SPORT PILOT LICENCE',
    refText: '항공안전법 제109조 · 규칙 제113조',
    gradient: G.navy,
    standards: ['타면조종형', '체중이동형', '경량헬리콥터', '자이로플레인', '동력패러슈트'],
    extraCategories: ['경량항공기 조종교육증명'],
    master: true,
  },
  {
    category: '항공신체검사',
    en: 'MEDICAL / DRIVER LICENCE',
    refText: '항공안전법 제115조',
    gradient: G.green,
    standards: ['2종', '운전면허'],
    hint: '항공신체검사 2종 또는 자동차운전면허로 갈음',
  },
  {
    category: '무선통신사',
    en: 'RADIO OPERATOR',
    refText: '전파법 제30조',
    gradient: G.cyan,
    standards: [],
    hint: '무선국 종사자 한정',
  },
]

/** 초경량비행장치 조종자 덱 — 3장 (기체·보험 카드는 2차) */
export const ULTRALIGHT_DECK: DeckCardDef[] = [
  {
    category: '초경량비행장치 조종자증명',
    en: 'ULTRALIGHT OPERATOR LICENCE',
    refText: '항공안전법 제125조 · 운영세칙',
    gradient: G.navy,
    standards: ['동력비행장치', '회전익', '무인멀티콥터', '무인비행기', '무인헬리콥터', '무인수직이착륙기'],
    master: true,
  },
  {
    category: '지도조종자',
    en: 'INSTRUCTOR / EVALUATOR',
    refText: '운영세칙 별표 3 · 별표 1의2',
    gradient: G.amber,
    standards: ['지도조종자', '실기평가조종자'],
    hint: '유인 200시간 · 무인 1종 100시간(실기평가 150시간)',
  },
  {
    category: '교육이수',
    en: 'TRAINING RECORD',
    refText: '운영세칙 제5조② · 제11조',
    gradient: G.lime,
    standards: ['4종 이러닝', '교관과정', '평가과정', '보수교육'],
  },
]

export const DECK_BY_TRACK: Record<PilotTrack, DeckCardDef[]> = {
  aircraft: AIRCRAFT_DECK,
  lsa: LSA_DECK,
  ultralight: ULTRALIGHT_DECK,
}

/**
 * 신체검사·무선통신사는 경량 덱에서도 쓰이므로, "경량 덱의 신체검사 카드"는 항공기 트랙에
 * 등록된 신체검사도 함께 보여준다(같은 사람의 같은 검사이기 때문). 이 카테고리들은 트랙 공유로 간주한다.
 */
export const TRACK_SHARED_CATEGORIES: CertificateCategory[] = ['항공신체검사', '무선통신사', '운전면허', '법정교육', '기타 자격']
