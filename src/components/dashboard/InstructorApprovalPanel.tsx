// 교관 승인 관리 — approval_requests(schema12) 공용 큐의 얇은 래퍼.
import { ShieldCheck } from 'lucide-react'
import React from 'react'

import { ApprovalQueuePanel } from './ApprovalQueuePanel'

export function InstructorApprovalPanel() {
  return (
    <ApprovalQueuePanel
      kinds={['instructor']}
      title="교관 승인 관리"
      description="회원이 자격 구분별로 보낸 교관(지도조종자) 승인 신청을 확인하고 승인/반려합니다. 승인된 구분의 기록에만 서명할 수 있어요."
      icon={ShieldCheck}
      emptyTitle="해당하는 신청서가 없습니다"
    />
  )
}
