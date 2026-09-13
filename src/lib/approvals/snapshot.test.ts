import { describe, expect, it } from 'vitest'

import { buildSignedSnapshot, canonicalJson, formatSnapshotValue, isEmptySnapshotValue, matchesSnapshot, pickSignedFields } from './snapshot'
import type { LogbookEntryInput } from '../../types/logbook'

const base: LogbookEntryInput = {
  year: 2026,
  date: '2026-09-05',
  departure: 'RKTL',
  arrival: 'RKPU',
  aircraftType: 'C172R',
  blockTime: 1.2,
  flightCategory: '주간',
} as LogbookEntryInput

describe('서명 시점 스냅샷·해시', () => {
  it('키 순서가 달라도 같은 내용이면 같은 문자열', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }))
  })

  it('서명 대상 필드만 뽑고 서명·요청 id 같은 메타는 제외한다', () => {
    const fields = pickSignedFields({ ...base, signatureRequestPostId: 'x', instructorSignature: { instructorName: 'a', instructorUserId: 'b', signedAt: 1 } })
    expect(fields).not.toHaveProperty('signatureRequestPostId')
    expect(fields).not.toHaveProperty('instructorSignature')
    expect(fields.blockTime).toBe(1.2)
  })

  it('내용이 같으면 일치, 블록타임을 고치면 불일치', async () => {
    const snap = await buildSignedSnapshot(base)
    expect(snap.hash).toHaveLength(64)
    expect(await matchesSnapshot({ ...base }, snap)).toBe(true)
    expect(await matchesSnapshot({ ...base, blockTime: 1.5 }, snap)).toBe(false)
  })
})

describe('스냅샷 항목이 늘어난 뒤에도 예전 서명은 일치로 본다', () => {
  it('예전 스냅샷(항목 일부)과 현재 기록의 공통 항목이 같으면 true', async () => {
    const old = { version: 1 as const, fields: { date: '2026-09-05', blockTime: 1.2 }, hash: '', capturedAt: '' }
    old.hash = await (await import('./snapshot')).sha256Hex((await import('./snapshot')).canonicalJson(old.fields))
    expect(await matchesSnapshot({ ...base }, old)).toBe(true)
    expect(await matchesSnapshot({ ...base, blockTime: 2 }, old)).toBe(false)
  })
  it('스냅샷이 변조되면(해시 불일치) false', async () => {
    const snap = await buildSignedSnapshot(base)
    expect(await matchesSnapshot(base, { ...snap, fields: { ...snap.fields, blockTime: 9 } })).toBe(false)
  })
})

describe('formatSnapshotValue', () => {
  it('중첩 객체를 한글 라벨로 읽히게 편다', () => {
    expect(formatSnapshotValue({ day: 0.8, night: 0 })).toBe('주간 0.8 · 야간 0')
    expect(formatSnapshotValue({ dualReceived: 0.8 })).toBe('Dual 0.8')
    expect(formatSnapshotValue({ singleEngineLand: 1.2, multiEngineLand: 0.5 })).toBe('단발육상 1.2 · 다발육상 0.5')
  })

  it('0 을 숨기지 않는다 — 로그북에서 0 과 "기재 없음"은 다른 뜻이다', () => {
    expect(formatSnapshotValue({ night: 0 })).toBe('야간 0')
    expect(formatSnapshotValue(0)).toBe('0')
  })

  it('빈 객체는 — 로 보여준다', () => {
    expect(formatSnapshotValue({})).toBe('—')
    expect(formatSnapshotValue(null)).toBe('—')
    expect(formatSnapshotValue(undefined)).toBe('—')
  })

  it('모르는 키는 키 이름 그대로 남긴다', () => {
    expect(formatSnapshotValue({ unknownKey: 3 })).toBe('unknownKey 3')
  })

  it('불리언과 배열', () => {
    expect(formatSnapshotValue(true)).toBe('예')
    expect(formatSnapshotValue(['RKSI', 'RKPC'])).toBe('RKSI, RKPC')
  })
})

describe('isEmptySnapshotValue', () => {
  it('빈 객체·빈 배열·빈 값은 표에서 뺀다', () => {
    expect(isEmptySnapshotValue({})).toBe(true)
    expect(isEmptySnapshotValue([])).toBe(true)
    expect(isEmptySnapshotValue('')).toBe(true)
    expect(isEmptySnapshotValue(undefined)).toBe(true)
  })

  it('0 이 든 객체는 빼지 않는다', () => {
    expect(isEmptySnapshotValue({ night: 0 })).toBe(false)
    expect(isEmptySnapshotValue(0)).toBe(false)
  })
})
