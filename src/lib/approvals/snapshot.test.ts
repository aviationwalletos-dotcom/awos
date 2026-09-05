import { describe, expect, it } from 'vitest'

import { buildSignedSnapshot, canonicalJson, matchesSnapshot, pickSignedFields } from './snapshot'
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
