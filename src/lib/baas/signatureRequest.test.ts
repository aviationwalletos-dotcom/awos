import { describe, expect, it } from 'vitest'

import { buildSignedCommentContent, findSignedComment, parseSignatureImageUrlFromComment } from './signatureRequest'
import type { CommentItem } from './boardTypes'

const comment = (p: Partial<CommentItem>): CommentItem =>
  ({ id: 'c1', post_id: 'p1', author_id: 'uuid-instructor', author_name: '오재헌', content: '', is_hidden: false, created_at: '2026-09-04T00:00:00Z', replies: [], ...p }) as CommentItem

describe('교관 서명 댓글 판정 (uuid 기준)', () => {
  it('승인 교관 uuid 집합에 author_id가 있으면 서명으로 인정한다', () => {
    const c = comment({ content: buildSignedCommentContent('오재헌', new Date('2026-09-04T00:00:00Z'), 'data:image/png;base64,AAA') })
    expect(findSignedComment([c], new Set(['wogjs1118@gmail.com', 'uuid-instructor']))).toBe(c)
  })
  it('이메일만 든 집합(예전 버그 상태)에서는 인정되지 않는다 — 회귀 방지', () => {
    const c = comment({ content: buildSignedCommentContent('오재헌') })
    expect(findSignedComment([c], new Set(['wogjs1118@gmail.com']))).toBeNull()
  })
  it('서명 이미지 URL은 data: URL도 그대로 파싱된다', () => {
    const c = comment({ content: buildSignedCommentContent('오재헌', new Date(), 'data:image/png;base64,AAA') })
    expect(parseSignatureImageUrlFromComment(c)).toBe('data:image/png;base64,AAA')
  })
})
