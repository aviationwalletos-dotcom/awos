// 교관 서명 완료([SIGNED] 댓글) 자동 감지 watcher (BUG-015)
//
// CertificateDecisionWatcher.tsx와 완전히 동일한 구조적 결함(다이얼로그를 열어야만 확인됨)이
// 교관 서명 자동 감지 로직에도 있어 같은 패턴으로 옮긴다.
import { useEffect } from 'react'

import { toLogbookEntryInput } from '../../lib/logbookEntryInput'
import { useApprovedInstructorIdSet } from '../../lib/baas/authorization'
import {
  findSignedComment,
  parseSignatureImageUrlFromComment,
  parseSignedAtFromComment,
} from '../../lib/baas/signatureRequest'
import { useComments } from '../../hooks/baas/useComments'

import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

interface InstructorSignatureDecisionWatcherProps {
  entry: LogbookEntry
  onUpdate: (id: string, input: LogbookEntryInput) => void
}

export function InstructorSignatureDecisionWatcher({ entry, onUpdate }: InstructorSignatureDecisionWatcherProps) {
  const pendingRequestPostId = entry.signatureRequestPostId
  const { data: commentsData } = useComments(pendingRequestPostId, { enabled: Boolean(pendingRequestPostId) })
  // [SEC-001] 승인 교관 목록이 로드되기 전에는 판정하지 않는다(fail-closed).
  const { instructorIds } = useApprovedInstructorIdSet()

  useEffect(() => {
    if (entry.instructorSignature || !commentsData || !instructorIds) return

    const signedComment = findSignedComment(commentsData.items, instructorIds)
    if (!signedComment) return

    onUpdate(entry.id, {
      ...toLogbookEntryInput(entry),
      instructorSignature: {
        instructorName: signedComment.author_name,
        instructorUserId: signedComment.author_id,
        signatureDataUrl: parseSignatureImageUrlFromComment(signedComment),
        signedAt: parseSignedAtFromComment(signedComment),
      },
    })
  }, [entry, commentsData, instructorIds, onUpdate])

  return null
}
