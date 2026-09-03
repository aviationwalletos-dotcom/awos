// 자격증 인증 요청의 승인/반려 결과를 배경에서 감지해 자격증에 반영한다.
// v1.1 — 자격증마다 워처(요청 N번) 대신 배치 1회.
import { useEffect, useMemo } from 'react'

import { useCommentsBatch } from '../../hooks/baas/useCommentsBatch'
import { EMPTY_ID_SET, useAuthorizedOrgIds } from '../../lib/baas/authorization'
import { resolveApprovalDecision } from '../../lib/baas/instructorApproval'
import type { Certificate, CertificateInput } from '../../types/certificate'

interface Props {
  certificates: Certificate[]
  onUpdate: (id: string, input: CertificateInput) => void
}

export function CertificateApprovalStatusWatcher({ certificates, onUpdate }: Props) {
  const pending = useMemo(() => certificates.filter((c) => c.approvalStatus === 'pending' && c.approvalRequestPostId), [certificates])
  const postIds = useMemo(() => pending.map((c) => c.approvalRequestPostId as string), [pending])
  const { byPost, isLoading } = useCommentsBatch(postIds)
  const { orgIds } = useAuthorizedOrgIds()

  useEffect(() => {
    if (isLoading || !orgIds || pending.length === 0) return
    for (const cert of pending) {
      const comments = byPost[cert.approvalRequestPostId as string]
      if (!comments) continue
      const decision = resolveApprovalDecision(comments, orgIds ?? EMPTY_ID_SET)
      if (decision.status === 'pending' || decision.status === cert.approvalStatus) continue
      const { id, createdAt: _c, updatedAt: _u, syncPostId: _s, ...rest } = cert
      onUpdate(id, { ...rest, approvalStatus: decision.status, approvalRevokedAt: undefined })
    }
  }, [isLoading, orgIds, pending, byPost, onUpdate])

  return null
}
