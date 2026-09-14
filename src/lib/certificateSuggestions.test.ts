import { describe, expect, it } from 'vitest'

import type { Certificate } from '../types/certificate'
import { buildCertificateSuggestions } from './certificateSuggestions'

// 실제 CPL 자격증명서 한 장에서 AI 가 읽어 오는 형태
const CPL_FIELDS = {
  name: '사업용조종사',
  licenceNumber: '12-015238',
  issuedDate: '2026-03-17',
  licenceCode: 'CPL',
  classRatings: [
    { category: 'AIRPLANE', class: 'MEL' },
    { category: 'AIRPLANE', class: 'SEL' },
  ],
  instrumentRatings: ['AIRPLANE'],
  flightInstructorRatings: [
    { grade: 'BASIC', category: 'AIRPLANE' },
    { grade: 'SENIOR', category: 'AIRPLANE' },
  ],
  eptaLevel: 4,
  eptaValidUntil: '2028-12-01',
  limitations: null,
}

function cert(partial: Partial<Certificate>): Certificate {
  return { id: 'x', name: '', category: '조종사 자격증명', issuer: '', issuedDate: '', createdAt: 0, updatedAt: 0, ...partial }
}

describe('buildCertificateSuggestions', () => {
  it('CPL 한 장에서 자격증명 + 한정 + 계기 + 교관 2 + EPTA 를 만든다', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s.map((x) => x.kind)).toEqual(['licence', 'rating', 'instrument', 'instructor', 'instructor', 'epta'])
  })

  it('SEL 이 있으면 SEL 을 자격증명 본체로, MEL 은 한정 추가로', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s[0].input.name).toBe('사업용 조종사(CPL) · 비행기 · 육상단발')
    expect(s[0].input.classRating).toBe('SEL')
    expect(s[0].input.licenceNumber).toBe('12-015238')
    expect(s[1].input.category).toBe('한정')
    expect(s[1].input.name).toBe('사업용 조종사(CPL) · 비행기 · 육상다발')
  })

  it('계기·교관 이름이 세부 종류 라벨과 같다', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s[2].input.name).toBe('계기비행증명 - 비행기')
    expect(s[3].input.name).toBe('초급 조종교육증명 - 비행기')
    expect(s[4].input.name).toBe('선임 조종교육증명 - 비행기')
    expect(s[3].input.issuedDate).toBe('2026-03-17')
  })

  // 시행규칙 제99조③ — 기준일부터 계산하여 4등급 3년. "부터"라 초일을 세므로 마지막 해의 해당일 전날에 만료한다.
  // 역산도 같은 규칙: 기준일 = 만료일 − 3년 + 1일. TS 영어등급조회 실제 기록으로 확인(2026-09-13).
  it('EPTA 4등급: 만료일은 증서 값, 기준일은 규칙으로 역산', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    const epta = s.find((x) => x.kind === 'epta')!
    expect(epta.input.name).toBe('항공영어구술능력증명 4등급')
    expect(epta.input.expiryDate).toBe('2028-12-01')
    expect(epta.input.issuedDate).toBe('2025-12-02')
    expect(epta.detail).toBe('만료 2028-12-01')
  })

  it('EPTA 만료일이 없으면 규칙으로 계산한다(5등급 6년)', () => {
    const s = buildCertificateSuggestions({ ...CPL_FIELDS, eptaLevel: 5, eptaValidUntil: null }, [], 'aircraft', '2026-03-17')
    const epta = s.find((x) => x.kind === 'epta')!
    expect(epta.input.issuedDate).toBe('2026-03-17')
    expect(epta.input.expiryDate).toBe('2032-03-16')
  })

  it('EPTA 6등급은 만료가 없다', () => {
    const s = buildCertificateSuggestions({ ...CPL_FIELDS, eptaLevel: 6, eptaValidUntil: null }, [], 'aircraft', '2026-03-17')
    const epta = s.find((x) => x.kind === 'epta')!
    expect(epta.input.expiryDate).toBeUndefined()
    expect(epta.detail).toBe('만료 없음')
  })

  it('이미 등록된 자격은 duplicate 로 표시한다', () => {
    const existing = [cert({ category: '계기비행증명', name: '계기비행증명 - 비행기' })]
    const s = buildCertificateSuggestions(CPL_FIELDS, existing, 'aircraft', '2026-03-17')
    expect(s.find((x) => x.kind === 'instrument')!.duplicate).toBe(true)
    expect(s.find((x) => x.kind === 'epta')!.duplicate).toBe(false)
  })

  // [2026-09-14 정정] 예전에는 licenceCode 가 없으면 무조건 빈 배열이었고, 이 테스트가 그 동작을 고정하고 있었다.
  // 그래서 초경량·경량·단독 항공영어가 전부 조용히 빈 결과를 냈다. 이제는 문서에서 읽어낸 만큼 만든다.
  it('licenceCode 가 없어도 문서에서 읽어낸 자격은 만든다', () => {
    const s = buildCertificateSuggestions({ ...CPL_FIELDS, licenceCode: null }, [], 'aircraft', '2026-03-17')
    // 자격증명 본체·한정·계기·교관은 licenceCode 가 있어야 하므로 안 나온다
    expect(s.some((x) => ['licence', 'rating', 'instrument', 'instructor'].includes(x.kind))).toBe(false)
    // 특기사항에 적힌 항공영어는 자격증명 본체와 무관하므로 나온다
    expect(s.map((x) => x.kind)).toEqual(['epta'])
  })

  it('정말 아무것도 못 읽으면 빈 배열이다', () => {
    expect(buildCertificateSuggestions({ licenceCode: null }, [], 'aircraft', '2026-03-17')).toEqual([])
  })

  it('헬리콥터 등급은 class 없이 처리한다', () => {
    const s = buildCertificateSuggestions(
      { licenceCode: 'PPL', classRatings: [{ category: 'HELICOPTER', class: null }] },
      [], 'aircraft', '2026-01-01',
    )
    expect(s[0].input.name).toBe('자가용 조종사(PPL) · 헬리콥터')
    expect(s[0].input.classRating).toBeUndefined()
  })
})

// 대표님 실제 자격증(2026-09-13): 초경량비행장치 조종자, 한정사항 "무인멀티콥터/1종"
const UL_FIELDS = {
  name: '초경량비행장치 조종자',
  licenceNumber: '91-180070',
  issuedDate: '2026-07-23',
  documentKind: 'ultralight',
  licenceCode: null,
  ultralightRatings: [{ kind: 'UAS_MULTICOPTER', grade: 1 }],
  ratings: '무인멀티콥터/1종',
  limitations: null,
}

describe('초경량비행장치 조종자증명', () => {
  it('무인멀티콥터 1종까지 채운다', () => {
    const s = buildCertificateSuggestions(UL_FIELDS, [], 'ultralight', '2026-07-23')
    const primary = s.find((x) => x.kind === 'licence')!
    expect(primary.input.category).toBe('초경량비행장치 조종자증명')
    expect(primary.input.name).toBe('무인멀티콥터 1종')
    expect(primary.input.track).toBe('ultralight')
    expect(primary.input.licenceNumber).toBe('91-180070')
    expect(primary.input.issuer).toBe('한국교통안전공단')
  })

  it('종을 못 읽으면 종류만 채우고 종은 비운다 — 없는 값을 만들지 않는다', () => {
    const s = buildCertificateSuggestions({ ...UL_FIELDS, ultralightRatings: [{ kind: 'UAS_MULTICOPTER', grade: null }] }, [], 'ultralight', '2026-07-23')
    expect(s.find((x) => x.kind === 'licence')!.input.name).toBe('무인멀티콥터')
  })

  it('종이 있는 장치 종류 4가지 모두 매핑된다', () => {
    for (const [key, label] of [
      ['UAS_AIRPLANE', '무인비행기'],
      ['UAS_HELICOPTER', '무인헬리콥터'],
      ['UAS_MULTICOPTER', '무인멀티콥터'],
      ['UAS_VTOL', '무인수직이착륙기'],
    ]) {
      const s = buildCertificateSuggestions({ ...UL_FIELDS, ultralightRatings: [{ kind: key, grade: 2 }] }, [], 'ultralight', '2026-07-23')
      expect(s.find((x) => x.kind === 'licence')!.input.name).toBe(`${label} 2종`)
    }
  })

  it('유인 장치는 종 구분이 없다', () => {
    const s = buildCertificateSuggestions({ ...UL_FIELDS, ultralightRatings: [{ kind: 'UL_POWERED', grade: null }] }, [], 'ultralight', '2026-07-23')
    expect(s.find((x) => x.kind === 'licence')!.input.name).toBe('동력비행장치 조종자')
  })

  it('모르는 종류 코드면 제안하지 않는다 — 엉뚱한 자격을 만들지 않는다', () => {
    const s = buildCertificateSuggestions({ ...UL_FIELDS, ultralightRatings: [{ kind: 'UAS_SPACESHIP', grade: 1 }] }, [], 'ultralight', '2026-07-23')
    expect(s).toHaveLength(0)
  })

  it('이미 등록돼 있으면 중복으로 표시한다', () => {
    const existing = [cert({ category: '초경량비행장치 조종자증명', name: '무인멀티콥터 1종' })]
    const s = buildCertificateSuggestions(UL_FIELDS, existing, 'ultralight', '2026-07-23')
    expect(s.find((x) => x.kind === 'licence')!.duplicate).toBe(true)
  })

  it('항공기용 한정·계기·교관 제안이 섞이지 않는다', () => {
    const s = buildCertificateSuggestions({ ...UL_FIELDS, classRatings: [{ category: 'AIRPLANE', class: 'SEL' }], eptaLevel: 4 }, [], 'ultralight', '2026-07-23')
    expect(s.map((x) => x.kind)).toEqual(['licence'])
  })
})

// 경량항공기 조종사 자격증명 — 초경량과 같은 구멍이 있었다(2026-09-13 전수 점검에서 발견).
const LSA_FIELDS = {
  name: '경량항공기 조종사',
  licenceNumber: '31-000123',
  issuedDate: '2026-05-02',
  documentKind: 'lsa',
  licenceCode: null,
  lsaRatings: ['LSA_AIRPLANE'],
  limitations: null,
}

describe('경량항공기 조종사 자격증명', () => {
  it('종류 한정까지 채운다', () => {
    const s = buildCertificateSuggestions(LSA_FIELDS, [], 'lsa', '2026-05-02')
    const primary = s.find((x) => x.kind === 'licence')!
    expect(primary.input.category).toBe('경량항공기 조종사 자격증명')
    expect(primary.input.name).toBe('경량항공기 조종사 - 타면조종형비행기')
    expect(primary.input.track).toBe('lsa')
    expect(primary.input.licenceNumber).toBe('31-000123')
  })

  it('종류 5가지 모두 매핑된다', () => {
    for (const [key, label] of [
      ['LSA_AIRPLANE', '타면조종형비행기'],
      ['LSA_WEIGHT_SHIFT', '체중이동형비행기'],
      ['LSA_HELICOPTER', '경량헬리콥터'],
      ['LSA_GYROPLANE', '자이로플레인'],
      ['LSA_POWERED_PARACHUTE', '동력패러슈트'],
    ]) {
      const s = buildCertificateSuggestions({ ...LSA_FIELDS, lsaRatings: [key] }, [], 'lsa', '2026-05-02')
      expect(s.find((x) => x.kind === 'licence')!.input.name).toBe(`경량항공기 조종사 - ${label}`)
    }
  })

  it('모르는 종류 코드면 제안하지 않는다', () => {
    const s = buildCertificateSuggestions({ ...LSA_FIELDS, lsaRatings: ['LSA_ROCKET'] }, [], 'lsa', '2026-05-02')
    expect(s).toHaveLength(0)
  })

  it('초경량과 경량이 동시에 오면 초경량이 이긴다(서식상 함께 올 수 없다)', () => {
    const s = buildCertificateSuggestions({ ...LSA_FIELDS, ultralightRatings: [{ kind: 'UAS_MULTICOPTER', grade: 1 }] }, [], 'ultralight', '2026-05-02')
    expect(s.find((x) => x.kind === 'licence')!.input.category).toBe('초경량비행장치 조종자증명')
  })

  it('항공기용 제안이 섞이지 않는다', () => {
    const s = buildCertificateSuggestions({ ...LSA_FIELDS, classRatings: [{ category: 'AIRPLANE', class: 'SEL' }], eptaLevel: 4 }, [], 'lsa', '2026-05-02')
    expect(s.map((x) => x.kind)).toEqual(['licence'])
  })

  it('이미 등록돼 있으면 중복으로 표시한다', () => {
    const existing = [cert({ category: '경량항공기 조종사 자격증명', name: '경량항공기 조종사 - 타면조종형비행기' })]
    const s = buildCertificateSuggestions(LSA_FIELDS, existing, 'lsa', '2026-05-02')
    expect(s.find((x) => x.kind === 'licence')!.duplicate).toBe(true)
  })
})

describe('항공기 조종사 경로는 그대로 동작한다 (회귀 확인)', () => {
  it('초경량·경량 필드가 없으면 예전처럼 CPL 제안이 다 나온다', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s.find((x) => x.kind === 'licence')!.input.category).toBe('조종사 자격증명')
    expect(s.some((x) => x.kind === 'rating')).toBe(true)
    expect(s.some((x) => x.kind === 'epta')).toBe(true)
  })
})

// 오재헌 님 실제 자격증(12-015238)의 XII 한정사항 구조:
//   비행기/육상다발, 비행기/육상단발, 계기비행증명(비행기),
//   조종교육증명  초급(비행기/육상다발, 비행기/육상단발)  선임(비행기/육상다발, 비행기/육상단발)
describe('조종교육증명 등급', () => {
  const base = {
    licenceCode: 'CPL',
    issuedDate: '2026-03-17',
    classRatings: [
      { category: 'AIRPLANE', class: 'MEL' },
      { category: 'AIRPLANE', class: 'SEL' },
    ],
    instrumentRatings: ['AIRPLANE'],
  }

  it('등급이 읽히면 4개로 나뉜다', () => {
    const s = buildCertificateSuggestions({
      ...base,
      flightInstructorRatings: [
        { grade: 'BASIC', category: 'AIRPLANE', classRating: 'MEL' },
        { grade: 'BASIC', category: 'AIRPLANE', classRating: 'SEL' },
        { grade: 'SENIOR', category: 'AIRPLANE', classRating: 'MEL' },
        { grade: 'SENIOR', category: 'AIRPLANE', classRating: 'SEL' },
      ],
    }, [], 'aircraft', '2026-03-17')
    expect(s.filter((x) => x.kind === 'instructor').map((x) => x.input.name)).toEqual([
      '초급 조종교육증명 - 비행기 육상다발',
      '초급 조종교육증명 - 비행기 육상단발',
      '선임 조종교육증명 - 비행기 육상다발',
      '선임 조종교육증명 - 비행기 육상단발',
    ])
  })

  it('등급을 못 읽었는데 자격증명에는 등급이 있으면 확인을 청한다', () => {
    const s = buildCertificateSuggestions({
      ...base,
      flightInstructorRatings: [
        { grade: 'BASIC', category: 'AIRPLANE', classRating: null },
        { grade: 'SENIOR', category: 'AIRPLANE', classRating: null },
      ],
    }, [], 'aircraft', '2026-03-17')
    const fi = s.filter((x) => x.kind === 'instructor')
    expect(fi).toHaveLength(2)
    for (const x of fi) expect(x.detail).toMatch(/등급.*못 읽었어요/)
  })

  it('값을 지어내지는 않는다 — 이름은 등급 없이 그대로', () => {
    const s = buildCertificateSuggestions({
      ...base,
      flightInstructorRatings: [{ grade: 'SENIOR', category: 'AIRPLANE', classRating: null }],
    }, [], 'aircraft', '2026-03-17')
    expect(s.find((x) => x.kind === 'instructor')!.input.name).toBe('선임 조종교육증명 - 비행기')
  })

  it('헬리콥터는 등급 구분이 없으니 확인을 청하지 않는다', () => {
    const s = buildCertificateSuggestions({
      ...base,
      flightInstructorRatings: [{ grade: 'BASIC', category: 'HELICOPTER', classRating: null }],
    }, [], 'aircraft', '2026-03-17')
    expect(s.find((x) => x.kind === 'instructor')!.detail).toBeUndefined()
  })
})

// 한정사항에 종류가 여러 개 적힌 경우. 항공기 classRatings 와 같은 구조여야 한다(2026-09-14).
describe('초경량·경량 한정사항이 여러 개일 때', () => {
  it('초경량 2종류를 모두 만든다', () => {
    const s = buildCertificateSuggestions({
      documentKind: 'ultralight',
      licenceNumber: '91-180070',
      ultralightRatings: [
        { kind: 'UAS_MULTICOPTER', grade: 1 },
        { kind: 'UAS_AIRPLANE', grade: 2 },
      ],
    }, [], 'ultralight', '2026-07-23')
    expect(s.map((x) => x.input.name)).toEqual(['무인멀티콥터 1종', '무인비행기 2종'])
    expect(s[0].kind).toBe('licence') // 첫 항목이 폼 본체
    expect(s[1].kind).toBe('rating') // 나머지는 체크 목록
  })

  it('경량 2종류를 모두 만든다', () => {
    const s = buildCertificateSuggestions({
      documentKind: 'lsa',
      lsaRatings: ['LSA_AIRPLANE', 'LSA_GYROPLANE'],
    }, [], 'lsa', '2026-05-02')
    expect(s.map((x) => x.input.name)).toEqual([
      '경량항공기 조종사 - 타면조종형비행기',
      '경량항공기 조종사 - 자이로플레인',
    ])
  })

  it('같은 종류가 두 번 오면 한 번만 만든다', () => {
    const s = buildCertificateSuggestions({
      ultralightRatings: [
        { kind: 'UAS_MULTICOPTER', grade: 1 },
        { kind: 'UAS_MULTICOPTER', grade: 1 },
      ],
    }, [], 'ultralight', '2026-07-23')
    expect(s).toHaveLength(1)
  })

  it('모르는 코드는 건너뛰고 나머지는 살린다', () => {
    const s = buildCertificateSuggestions({
      ultralightRatings: [
        { kind: 'UAS_SPACESHIP', grade: 1 },
        { kind: 'UAS_MULTICOPTER', grade: 3 },
      ],
    }, [], 'ultralight', '2026-07-23')
    expect(s.map((x) => x.input.name)).toEqual(['무인멀티콥터 3종'])
  })

  it('예전 단수 형식도 계속 읽는다 — 함수와 프론트 배포 시점이 어긋나도 안 깨진다', () => {
    const s = buildCertificateSuggestions({
      ultralightKind: 'UAS_MULTICOPTER',
      uasGrade: 1,
    }, [], 'ultralight', '2026-07-23')
    expect(s.map((x) => x.input.name)).toEqual(['무인멀티콥터 1종'])

    const t = buildCertificateSuggestions({ lsaKind: 'LSA_HELICOPTER' }, [], 'lsa', '2026-05-02')
    expect(t.map((x) => x.input.name)).toEqual(['경량항공기 조종사 - 경량헬리콥터'])
  })
})

// [2026-09-14 전수 점검] "licenceCode 가 없으면 아무것도 안 나온다"는 같은 구멍이 세 번 나왔다.
// 초경량 → 경량 → 단독 항공영어. 문서 종류별로 하나씩 고정해 둔다.
describe('자격증명 본체가 아닌 문서도 제안을 만든다', () => {
  it('단독 항공영어구술능력증명서 (licenceCode 없음)', () => {
    const s = buildCertificateSuggestions({
      documentKind: 'epta',
      licenceCode: null,
      eptaLevel: 4,
      eptaValidUntil: '2028-12-01',
    }, [], 'aircraft', '')
    const epta = s.find((x) => x.kind === 'epta')
    expect(epta).toBeDefined()
    expect(epta!.input.name).toBe('항공영어구술능력증명 4등급')
    expect(epta!.input.expiryDate).toBe('2028-12-01')
    expect(epta!.input.issuedDate).toBe('2025-12-02') // 만료일에서 역산
  })

  it('자격증명서에 함께 적힌 항공영어도 그대로 나온다 (회귀)', () => {
    const s = buildCertificateSuggestions(CPL_FIELDS, [], 'aircraft', '2026-03-17')
    expect(s.some((x) => x.kind === 'epta')).toBe(true)
    expect(s.some((x) => x.kind === 'licence')).toBe(true)
  })

  it('초경량 (licenceCode 없음)', () => {
    const s = buildCertificateSuggestions({
      documentKind: 'ultralight',
      ultralightRatings: [{ kind: 'UAS_MULTICOPTER', grade: 1 }],
    }, [], 'ultralight', '2026-07-23')
    expect(s.find((x) => x.kind === 'licence')!.input.name).toBe('무인멀티콥터 1종')
  })

  it('경량 (licenceCode 없음)', () => {
    const s = buildCertificateSuggestions({
      documentKind: 'lsa',
      lsaRatings: ['LSA_AIRPLANE'],
    }, [], 'lsa', '2026-05-02')
    expect(s.find((x) => x.kind === 'licence')!.input.name).toBe('경량항공기 조종사 - 타면조종형비행기')
  })

  it('아무것도 못 읽으면 빈 배열 — 엉뚱한 자격을 만들지 않는다', () => {
    expect(buildCertificateSuggestions({ documentKind: 'other' }, [], 'aircraft', '')).toHaveLength(0)
  })
})
