// 교관 승인 관리 — approval_requests(schema12) 공용 큐의 얇은 래퍼.
// 신청서에 붙은 조종교육증명(지도조종자) 정보를 카드에 함께 보여준다.
import { FileCheck2, ShieldCheck } from 'lucide-react'
import React from 'react'

import { ApprovalQueuePanel } from './ApprovalQueuePanel'
import type { ApprovalRequest } from '../../lib/approvals/types'

interface InstructorCertificateInfo {
  category?: string
  name?: string
  issuer?: string
  issuedDate?: string
  expiryDate?: string | null
  approvalStatus?: string | null
}

const APPROVAL_LABEL: Record<string, string> = { approved: '인증됨', pending: '인증 대기중', rejected: '인증 반려' }

function renderInstructorCertificate(item: ApprovalRequest) {
  const cert = item.payload?.instructorCertificate as InstructorCertificateInfo | undefined
  if (!cert) {
    return (
      <p className="mt-3 text-xs text-amber-300">
        조종교육증명 정보가 없는 신청이에요(예전 방식). 자격증 탭 등록 여부를 확인한 뒤 판정해 주세요.
      </p>
    )
  }
  const status = APPROVAL_LABEL[cert.approvalStatus ?? ''] ?? '미인증'
  return (
    <div className="mt-3 rounded-control border border-white/10 bg-navy px-3 py-2.5 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-slate-200">
        <FileCheck2 className="h-3.5 w-3.5 text-sky" aria-hidden="true" />
        {cert.category ?? '조종교육증명'}: {cert.name ?? '-'}
      </p>
      <p className="mt-1 text-slate-400">
        발급 {cert.issuedDate ?? '-'}
        {cert.issuer ? ` · ${cert.issuer}` : ''}
        {cert.expiryDate ? ` · 만료 ${cert.expiryDate}` : ''}
        {' · '}
        <span className={cert.approvalStatus === 'approved' ? 'text-go' : 'text-amber-300'}>{status}</span>
      </p>
      {cert.approvalStatus !== 'approved' && (
        <p className="mt-1 text-[11px] text-slate-500">
          이 증명은 아직 인증되지 않았어요. "자격증·신체검사 요청함"에서 사진을 먼저 확인하는 것을 권해요.
        </p>
      )}
    </div>
  )
}

export function InstructorApprovalPanel() {
  return (
    <ApprovalQueuePanel
      kinds={['instructor']}
      title="교관 승인 관리"
      description="회원이 자격 구분별로 보낸 교관(지도조종자) 승인 신청을 확인하고 승인/반려합니다. 승인된 구분의 기록에만 서명할 수 있어요."
      icon={ShieldCheck}
      emptyTitle="해당하는 신청서가 없습니다"
      renderExtra={renderInstructorCertificate}
    />
  )
}
