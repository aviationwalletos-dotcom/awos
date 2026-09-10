// 자격증·항공신체검사 인증 요청 생성 — approval_requests(schema12).
// 등록 직후(useLogbookPageModel.handleCreateCertificate)와 상세 다이얼로그의 "다시 보내기"가 같은 함수를 쓴다.

import { createApprovalRequest } from './api'
import { buildFieldsSnapshot } from './snapshot'
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
  /** 여러 장(앞·뒷면). 있으면 file 보다 우선 */
  files?: File[] | null
  /** useUploadBoardFile().uploadFile — 훅이라 여기서 직접 부를 수 없어 주입받는다 */
  uploadFile: (file: Blob, options: { filename: string; contentType: string }) => Promise<UploadedAttachment>
  /** 교관 확인(Endorsement): 서명할 교관. 이 구분은 관리자가 아니라 교관이 서명한다 */
  targetInstructor?: { userId: string; name: string } | null
}

export function certificateApprovalKind(certificate: Pick<Certificate, 'category'>): 'certificate' | 'medical' | 'endorsement' {
  if (certificate.category === '교관 확인') return 'endorsement'
  return certificate.category.includes('신체') ? 'medical' : 'certificate'
}

export async function submitCertificateApprovalRequest(options: SubmitCertificateApprovalOptions): Promise<ApprovalRequest> {
  const { certificate, account, affiliation, file, files, uploadFile } = options
  const list = files && files.length > 0 ? files : file ? [file] : []
  const attachmentPaths: string[] = []
  for (const f of list) {
    const uploaded = await uploadFile(f, { filename: f.name, contentType: f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg') })
    attachmentPaths.push(uploaded.cdnUrl)
  }
  const attachmentPath: string | null = attachmentPaths[0] ?? null
  const kind = certificateApprovalKind(certificate)

  // 교관 확인(Endorsement): 교관에게 서명 요청. 서명 대상(확인 종류·세부·날짜·학생)을 스냅샷+해시로 고정한다(비행 서명과 같은 증거 구조).
  if (kind === 'endorsement') {
    const target = options.targetInstructor
    if (!target) throw new Error('교관 확인은 서명할 교관을 골라야 해요.')
    const fields = {
      endorsementType: certificate.name,
      endorsementDetail: certificate.notes ?? '',
      endorsedDate: certificate.issuedDate,
      studentName: account.name || account.user_id,
      instructorName: target.name,
    }
    const signedSnapshot = await buildFieldsSnapshot(fields)
    return createApprovalRequest({
      kind,
      requesterName: account.name || account.user_id || '사용자',
      requesterEmail: account.user_id,
      targetId: target.userId,
      track: certificateTrack(certificate),
      subjectId: certificate.id,
      affiliation: affiliation?.trim() || account.data?.organization_affiliation?.trim() || null,
      title: `교관 확인(Endorsement) — ${certificate.name}`,
      summary: `${account.name || account.user_id} 학생의 "${certificate.name}" 확인 요청이에요. 아래 내용을 확인하고 서명해 주세요.\n확인일: ${certificate.issuedDate}${certificate.notes ? `\n세부: ${certificate.notes}` : ''}`,
      payload: { signedSnapshot, category: certificate.category, name: certificate.name },
      attachmentPath,
      attachmentPaths,
    })
  }

  return createApprovalRequest({
    kind,
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
    attachmentPaths,
  })
}
