// 자격증·항공신체검사 인증 요청 생성 — approval_requests(schema12).
// 등록 직후(useLogbookPageModel.handleCreateCertificate)와 상세 다이얼로그의 "다시 보내기"가 같은 함수를 쓴다.

import { createApprovalRequest } from './api'
import type { ApprovalRequest } from './types'
import { buildCertificateApprovalContent } from '../certificateApproval'
import type { AccountResponse } from '../baas/types'
import { type Certificate, certificateTrack } from '../../types/certificate'

export interface UploadedAttachment {
  cdnUrl: string
}

export interface SubmitCertificateApprovalOptions {
  certificate: Certificate
  account: AccountResponse
  affiliation?: string | null
  file?: File | null
  /** useUploadBoardFile().uploadFile — 훅이라 여기서 직접 부를 수 없어 주입받는다 */
  uploadFile: (file: Blob, options: { filename: string; contentType: string }) => Promise<UploadedAttachment>
}

export function certificateApprovalKind(certificate: Pick<Certificate, 'category'>): 'certificate' | 'medical' {
  return certificate.category.includes('신체') ? 'medical' : 'certificate'
}

export async function submitCertificateApprovalRequest(options: SubmitCertificateApprovalOptions): Promise<ApprovalRequest> {
  const { certificate, account, affiliation, file, uploadFile } = options
  let attachmentPath: string | null = null
  if (file) {
    const uploaded = await uploadFile(file, { filename: file.name, contentType: file.type || 'image/jpeg' })
    attachmentPath = uploaded.cdnUrl
  }
  return createApprovalRequest({
    kind: certificateApprovalKind(certificate),
    requesterName: account.name || account.user_id || '사용자',
    requesterEmail: account.user_id,
    track: certificateTrack(certificate),
    subjectId: certificate.id,
    affiliation: affiliation?.trim() || account.data?.organization_affiliation?.trim() || null,
    title: `${certificate.category} — ${certificate.name}`,
    summary: buildCertificateApprovalContent(certificate),
    payload: {
      category: certificate.category,
      name: certificate.name,
      issuer: certificate.issuer,
      issuedDate: certificate.issuedDate,
      expiryDate: certificate.expiryDate ?? null,
    },
    attachmentPath,
  })
}
