// 다이얼로그를 열지 않아도 서명 완료 / 비행경력증명서 승인 결과가 기록에 반영되도록 하는 백그라운드 동기화 (BUG-015).
//
// v1.1 — 기록마다 워처 컴포넌트를 하나씩 띄워 댓글을 각각 조회하던 구조(대기 기록 N건 = 요청 N번)를
// 배치 1회 조회로 바꿨다. 대기 기록이 수백 건이어도 요청은 1번.

import { useEffect, useMemo } from 'react'

import { useCommentsBatch } from '../../hooks/baas/useCommentsBatch'
import { EMPTY_ID_SET, useApprovedInstructorIdSet, useAuthorizedOrgIds } from '../../lib/baas/authorization'
import { resolveApprovalDecision } from '../../lib/baas/instructorApproval'
import { findSignedComment, parseSignatureImageUrlFromComment, parseSignedAtFromComment } from '../../lib/baas/signatureRequest'
import { toLogbookEntryInput } from '../../lib/logbookEntryInput'
import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

interface AutoSyncEntryDecisionsProps {
  entries: LogbookEntry[]
  onUpdate: (id: string, input: LogbookEntryInput) => void
}

export function AutoSyncEntryDecisions({ entries, onUpdate }: AutoSyncEntryDecisionsProps) {
  const pendingCertificateEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.origin === 'flight_experience_certificate' &&
          Boolean(entry.certificateRequestPostId) &&
          entry.certificateApprovalStatus !== 'confirmed' &&
          entry.certificateApprovalStatus !== 'rejected',
      ),
    [entries],
  )
  const pendingSignatureEntries = useMemo(
    () => entries.filter((entry) => !entry.instructorSignature && Boolean(entry.signatureRequestPostId)),
    [entries],
  )

  const postIds = useMemo(
    () => [
      ...pendingCertificateEntries.map((e) => e.certificateRequestPostId as string),
      ...pendingSignatureEntries.map((e) => e.signatureRequestPostId as string),
    ],
    [pendingCertificateEntries, pendingSignatureEntries],
  )
  const { byPost, isLoading } = useCommentsBatch(postIds)
  const { orgIds } = useAuthorizedOrgIds()
  const { instructorIds } = useApprovedInstructorIdSet()

  useEffect(() => {
    if (isLoading || postIds.length === 0) return
    // [SEC-001] 권한 집합이 로드되기 전에는 판정하지 않는다(fail-closed)
    if (orgIds) {
      for (const entry of pendingCertificateEntries) {
        const comments = byPost[entry.certificateRequestPostId as string]
        if (!comments) continue
        const decision = resolveApprovalDecision(comments, orgIds)
        if (decision.status === 'pending') continue
        const nextStatus = decision.status === 'approved' ? 'confirmed' : 'rejected'
        if (entry.certificateApprovalStatus === nextStatus) continue
        onUpdate(entry.id, { ...toLogbookEntryInput(entry), certificateApprovalStatus: nextStatus })
      }
    }
    if (instructorIds) {
      for (const entry of pendingSignatureEntries) {
        const comments = byPost[entry.signatureRequestPostId as string]
        if (!comments) continue
        const signed = findSignedComment(comments, instructorIds ?? EMPTY_ID_SET)
        if (!signed) continue
        onUpdate(entry.id, {
          ...toLogbookEntryInput(entry),
          instructorSignature: {
            instructorName: signed.author_name,
            instructorUserId: signed.author_id,
            signatureDataUrl: parseSignatureImageUrlFromComment(signed),
            signedAt: parseSignedAtFromComment(signed),
          },
        })
      }
    }
  }, [isLoading, postIds.length, byPost, orgIds, instructorIds, pendingCertificateEntries, pendingSignatureEntries, onUpdate])

  return null
}
