// 자격증·항공신체검사 인증 요청의 승인/반려 결과를 배경에서 감지해 자격증에 반영한다.
// 부채 3단계: 댓글 배치 → approval_requests 에서 내 판정 완료 행 1회 조회(60초 폴링).

import { useEffect, useMemo } from 'react'

import { useApprovalRequests } from '../../lib/approvals/hooks'

import type { Certificate, CertificateInput } from '../../types/certificate'

interface Props {
  certificates: Certificate[]
  onUpdate: (id: string, input: CertificateInput) => void
}

export function CertificateApprovalStatusWatcher({ certificates, onUpdate }: Props) {
  const pending = useMemo(() => certificates.filter((c) => c.approvalStatus === 'pending' && c.approvalRequestPostId), [certificates])
  const { data } = useApprovalRequests(
    { scope: 'mine', kind: ['certificate', 'medical'], status: ['approved', 'rejected'], limit: 300 },
    { enabled: pending.length > 0, pollMs: 60_000 },
  )

  useEffect(() => {
    if (!data || pending.length === 0) return
    const byId = new Map(data.map((r) => [r.id, r]))
    for (const cert of pending) {
      const req = byId.get(cert.approvalRequestPostId as string)
      if (!req || req.status === cert.approvalStatus) continue
      const { id, createdAt: _c, updatedAt: _u, syncPostId: _s, ...rest } = cert
      onUpdate(id, { ...rest, approvalStatus: req.status === 'approved' ? 'approved' : 'rejected', approvalRevokedAt: undefined })
    }
  }, [data, pending, onUpdate])

  return null
}
