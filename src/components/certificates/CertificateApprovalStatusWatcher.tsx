// 자격증 인증 요청의 관리자 결정([APPROVED]/[REJECTED] 댓글)을 감시해 카드 상태에 반영한다.
// 승인 대기 중인 자격증 1건당 하나씩 마운트되는 보이지 않는 컴포넌트.

import { useEffect } from 'react'

import { EMPTY_ID_SET, useAuthorizedOrgIds } from '../../lib/baas/authorization'
import { resolveApprovalDecision } from '../../lib/baas/instructorApproval'
import { useComments } from '../../hooks/baas/useComments'

import type { Certificate, CertificateInput } from '../../types/certificate'

interface CertificateApprovalStatusWatcherProps {
  certificate: Certificate
  onUpdate: (id: string, input: CertificateInput) => void
}

export function CertificateApprovalStatusWatcher({ certificate, onUpdate }: CertificateApprovalStatusWatcherProps) {
  const postId = certificate.approvalRequestPostId
  const { data: commentsData } = useComments(postId, { enabled: Boolean(postId) })
  const { orgIds } = useAuthorizedOrgIds()

  useEffect(() => {
    if (!postId || !commentsData || !orgIds || orgIds === EMPTY_ID_SET) {
      // orgIds 로딩 전(fail-closed)에는 판정하지 않는다
    }
    if (!postId || !commentsData || !orgIds) return
    const decision = resolveApprovalDecision(commentsData.items, orgIds)
    if (decision.status === 'pending' || decision.status === certificate.approvalStatus) return
    const { id, createdAt: _c, updatedAt: _u, syncPostId: _s, ...rest } = certificate
    onUpdate(id, { ...rest, approvalStatus: decision.status })
  }, [postId, commentsData, orgIds, certificate, onUpdate])

  return null
}
