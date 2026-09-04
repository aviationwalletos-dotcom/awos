// 비행경력증명서 승인 — approval_requests(schema12) 공용 큐의 얇은 래퍼.
import { FileCheck2 } from 'lucide-react'
import React from 'react'

import { ApprovalQueuePanel } from './ApprovalQueuePanel'

export function FlightExperienceCertificateApprovalPanel() {
  return (
    <ApprovalQueuePanel
      kinds={['flight_experience']}
      title="비행경력증명서 승인"
      description="엑셀 파일이 없는 회원이 제출한 비행경력증명서 인증 요청(첨부 사진 포함)입니다. 승인하면 그 기록이 공식 총 비행시간에 포함돼요."
      icon={FileCheck2}
      emptyTitle="해당하는 인증 요청이 없습니다"
      showAttachment
    />
  )
}
