// 자격증·항공신체검사 인증 요청의 승인/반려 결과를 배경에서 감지해 자격증에 반영한다.
// 부채 3단계: 댓글 배치 → approval_requests 에서 내 판정 완료 행 1회 조회(60초 폴링).

import { useEffect, useMemo, useRef } from 'react'

import { verifyApprovalRequestExists } from '../../lib/approvals/api'
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

  // [3단계] 옛 게시판 id 를 든 자격증은 새 테이블에 없다 → 확인 후 id 를 지워 "다시 보내기"가 뜨게 한다.
  const checkedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const candidates = pending.filter((c) => !checkedRef.current.has(c.approvalRequestPostId as string))
    if (candidates.length === 0) return
    let cancelled = false
    void (async () => {
      for (const cert of candidates) {
        const reqId = cert.approvalRequestPostId as string
        checkedRef.current.add(reqId)
        const exists = await verifyApprovalRequestExists(reqId)
        if (cancelled || exists) continue
        const { id, createdAt: _c, updatedAt: _u, syncPostId: _s, ...rest } = cert
        onUpdate(id, { ...rest, approvalStatus: 'pending', approvalRequestPostId: undefined })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pending, onUpdate])

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
