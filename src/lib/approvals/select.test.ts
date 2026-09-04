import { describe, expect, it } from 'vitest'

import { approvedTracksOf, pickInstructorRequestByTrack } from './select'
import type { ApprovalRequest } from './types'

function row(partial: Partial<ApprovalRequest>): ApprovalRequest {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    kind: 'instructor',
    requester_id: 'u1',
    requester_name: '교관',
    requester_email: null,
    target_id: null,
    track: 'aircraft',
    subject_id: null,
    affiliation: null,
    title: '',
    summary: null,
    payload: {},
    attachment_path: null,
    status: 'pending',
    decided_by: null,
    decided_by_name: null,
    decided_at: null,
    decision_note: null,
    signature_path: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...partial,
  }
}

describe('교관 승인 구분별 대표 선택', () => {
  it('승인된 신청이 있으면 나중 신청보다 승인을 우선한다', () => {
    const by = pickInstructorRequestByTrack([
      row({ id: 'a', status: 'approved', created_at: '2026-01-01T00:00:00Z' }),
      row({ id: 'b', status: 'pending', created_at: '2026-09-01T00:00:00Z' }),
    ])
    expect(by.aircraft?.id).toBe('a')
    expect(approvedTracksOf(by)).toEqual(['aircraft'])
  })

  it('반려 뒤 재신청하면 가장 최근 것이 대표가 된다', () => {
    const by = pickInstructorRequestByTrack([
      row({ id: 'old', status: 'rejected', created_at: '2026-01-01T00:00:00Z' }),
      row({ id: 'new', status: 'pending', created_at: '2026-09-01T00:00:00Z' }),
    ])
    expect(by.aircraft?.id).toBe('new')
    expect(approvedTracksOf(by)).toEqual([])
  })

  it('구분은 서로 독립이다 — 항공기 승인이 초경량 대기중에 영향을 주지 않는다', () => {
    const by = pickInstructorRequestByTrack([
      row({ id: 'air', track: 'aircraft', status: 'approved' }),
      row({ id: 'ul', track: 'ultralight', status: 'pending' }),
    ])
    expect(by.aircraft?.status).toBe('approved')
    expect(by.ultralight?.status).toBe('pending')
    expect(approvedTracksOf(by)).toEqual(['aircraft'])
  })

  it('취소된 요청과 다른 종류의 행은 무시한다', () => {
    const by = pickInstructorRequestByTrack([
      row({ id: 'c', status: 'cancelled' }),
      row({ id: 's', kind: 'signature', status: 'approved' }),
    ])
    expect(by.aircraft).toBeUndefined()
  })
})
