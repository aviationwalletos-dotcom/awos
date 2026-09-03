// 이미 인증 요청을 보냈지만 approvalRequestPostId가 저장되지 않은 자격증(v26 이전 버그)을 복구한다.
// 요청 게시판에서 제목의 certId로 게시글을 찾아 연결해 주면, 기존 CertificateApprovalStatusWatcher가 승인 여부를 반영한다.
// 보이지 않는 컴포넌트. 자격증 탭에 한 번만 마운트.

import { useEffect, useRef } from 'react'

import { useCertificateApprovalBoardPosts } from '../../hooks/baas/useCertificateApprovalBoardPosts'
import { parseCertificateApprovalTitle } from '../../lib/certificateApproval'
import type { Certificate, CertificateInput } from '../../types/certificate'

interface Props {
  certificates: Certificate[]
  onUpdate: (id: string, input: CertificateInput) => void
}

export function CertificateApprovalLinkRepair({ certificates, onUpdate }: Props) {
  const orphans = certificates.filter((c) => c.approvalStatus === 'pending' && !c.approvalRequestPostId)
  const { data } = useCertificateApprovalBoardPosts({ enabled: orphans.length > 0, limit: 200 })
  const doneRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!data || orphans.length === 0) return
    for (const cert of orphans) {
      if (doneRef.current.has(cert.id)) continue
      const post = data.items.find((item) => parseCertificateApprovalTitle(item.title)?.certId === cert.id)
      if (!post) continue
      doneRef.current.add(cert.id)
      const { id, createdAt: _c, updatedAt: _u, syncPostId: _s, ...rest } = cert
      onUpdate(id, { ...rest, approvalRequestPostId: post.id })
    }
  }, [data, orphans, onUpdate])

  return null
}
