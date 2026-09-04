// 자격증·항공신체검사 인증 요청함 — approval_requests(schema12) 공용 큐의 얇은 래퍼.
import { FileCheck2 } from 'lucide-react'
import React from 'react'

import { ApprovalQueuePanel } from './ApprovalQueuePanel'
import type { ApprovalKind } from '../../lib/approvals/types'

const KINDS_BY_FILTER: Record<'all' | 'license' | 'medical', ApprovalKind[]> = {
  all: ['certificate', 'medical'],
  license: ['certificate'],
  medical: ['medical'],
}

export function CertificateApprovalRequestsPanel({ categoryFilter = 'all' }: { categoryFilter?: 'all' | 'license' | 'medical' }) {
  return (
    <ApprovalQueuePanel
      kinds={KINDS_BY_FILTER[categoryFilter]}
      title="자격증 승인 관리"
      description="회원이 사진과 함께 보낸 자격증·항공신체검사 인증 요청입니다. 첨부를 확인한 뒤 승인/반려하세요. 판정 뒤에는 되돌릴 수 없어요."
      icon={FileCheck2}
      emptyTitle="해당하는 인증 요청이 없습니다"
      showAttachment
    />
  )
}
