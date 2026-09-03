import { describe, expect, it } from 'vitest'

import {
  ATPL_AIRPLANE,
  PPL_AIRPLANE,
  RULES_BY_ID,
  applyCrossCategoryCredit,
  applySimCredit,
  evaluateRule,
} from './rules'

describe('applySimCredit — 모의비행훈련장치 인정 상한', () => {
  it('운송용: FTD와 BATD 합산이 25시간을 넘지 못한다', () => {
    // FTD 25 + BATD 5 = 30 이지만 합산 상한 25가 걸린다.
    const r = applySimCredit({ FFS: 0, FTD: 25, BATD: 5 }, ATPL_AIRPLANE.simCredit!)
    expect(r.breakdown.FTD + r.breakdown.BATD).toBe(25)
    expect(r.credited).toBe(25)
  })

  it('운송용: 합산 초과분은 BATD부터 깎아 사용자에게 유리하게 처리한다', () => {
    const r = applySimCredit({ FTD: 24, BATD: 5 }, ATPL_AIRPLANE.simCredit!)
    expect(r.breakdown.FTD).toBe(24)
    expect(r.breakdown.BATD).toBe(1)
  })

  it('운송용: 총 인정 상한 100시간을 넘지 않는다', () => {
    const r = applySimCredit({ FFS: 500, FTD: 100, BATD: 100 }, ATPL_AIRPLANE.simCredit!)
    expect(r.credited).toBe(100)
  })

  it('자가용: 시뮬은 최대 5시간까지만 인정된다', () => {
    const r = applySimCredit({ FFS: 40 }, PPL_AIRPLANE.simCredit!)
    expect(r.credited).toBe(5)
    expect(r.capped).toContain('FFS')
  })
})

describe('applyCrossCategoryCredit — 타 종류 항공기 경력', () => {
  it('1/3 과 절대 상한 중 적은 쪽을 인정한다', () => {
    const credit = PPL_AIRPLANE.crossCategory!
    expect(applyCrossCategoryCredit(15, credit)).toBe(5) // 15/3 = 5 < 10
    expect(applyCrossCategoryCredit(90, credit)).toBe(10) // 90/3 = 30 > 10 → 10
  })
})

describe('evaluateRule — 진척도 계산', () => {
  it('전문교육기관 이수자는 자가용 총시간이 40 → 35 로 완화된다', () => {
    const totals = { total: 36, solo: 10, soloXc: 5 }
    const normal = evaluateRule(PPL_AIRPLANE, totals)
    const school = evaluateRule(PPL_AIRPLANE, totals, { approvedSchool: true })
    expect(normal.items.find((i) => i.id === 'total')?.met).toBe(false)
    expect(school.items.find((i) => i.id === 'total')?.met).toBe(true)
  })

  it('거리·비행장 조건은 자동판정하지 않고 manual 로 표시한다', () => {
    const p = evaluateRule(PPL_AIRPLANE, { total: 100, solo: 50, soloXc: 30 })
    const route = p.items.find((i) => i.id === 'xc-route')
    expect(route?.manual).toBe(true)
    // manual 항목은 자동 완료율(ratio) 계산에서 제외된다.
    expect(p.ratio).toBe(1)
  })

  it('anyOf 는 진도가 가장 앞선 경로를 채택한다', () => {
    // 기장 250시간 경로가 감독 하 500시간 경로보다 앞서 있다.
    const p = evaluateRule(ATPL_AIRPLANE, { total: 1500, pic: 250, picSupervised: 0 })
    expect(p.items.some((i) => i.id === 'pic-250' && i.met)).toBe(true)
  })
})

describe('레지스트리 정합성', () => {
  it('prereq 가 가리키는 자격 id 는 모두 실재해야 한다', () => {
    const missing: string[] = []
    const walk = (reqs: unknown[]) => {
      for (const r of reqs as Array<Record<string, unknown>>) {
        if (r.kind === 'prereq') {
          for (const id of r.requires as string[]) {
            if (!RULES_BY_ID[id]) missing.push(id)
          }
        }
        if (r.kind === 'anyOf') {
          for (const opt of r.options as unknown[][]) walk(opt)
        }
      }
    }
    for (const rule of Object.values(RULES_BY_ID)) walk(rule.requirements)
    expect(missing).toEqual([])
  })
})
