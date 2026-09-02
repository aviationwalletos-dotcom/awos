// 자격증·항공신체검사 "관리자 인증" 요청의 제목/본문 규약과 파서.
// 제목에 자격증 id를 넣어, 어떤 자격증에 대한 요청인지 게시글만으로 식별한다.

import type { Certificate } from '../types/certificate'

export const CERTIFICATE_APPROVAL_TITLE_PREFIX = '[자격증인증]'

export interface CertificateApprovalTitleInput {
  category: string
  certId: string
  userName: string
  userId: string
  affiliation?: string
}

export function buildCertificateApprovalTitle(input: CertificateApprovalTitleInput): string {
  const affiliation = input.affiliation?.trim()
  return `${CERTIFICATE_APPROVAL_TITLE_PREFIX} ${input.category} | ${input.certId} | ${input.userName} (${input.userId})${affiliation ? ` | ${affiliation}` : ''}`
}

export interface ParsedCertificateApprovalTitle {
  category: string
  certId: string
  userName: string
  userId: string
  affiliation?: string
}

export function parseCertificateApprovalTitle(title: string): ParsedCertificateApprovalTitle | null {
  if (!title.startsWith(CERTIFICATE_APPROVAL_TITLE_PREFIX)) return null
  const parts = title
    .slice(CERTIFICATE_APPROVAL_TITLE_PREFIX.length)
    .split('|')
    .map((part) => part.trim())
  if (parts.length < 3) return null
  const nameMatch = /^(.*)\(([^()]+)\)\s*$/.exec(parts[2] ?? '')
  return {
    category: parts[0] ?? '',
    certId: parts[1] ?? '',
    userName: (nameMatch?.[1] ?? parts[2] ?? '').trim(),
    userId: (nameMatch?.[2] ?? '').trim(),
    affiliation: parts[3] || undefined,
  }
}

export function buildCertificateApprovalContent(certificate: Certificate): string {
  return [
    '자격증 인증 요청입니다. 첨부된 사진을 확인한 뒤 승인/반려해 주세요.',
    '',
    `구분: ${certificate.category}`,
    `명칭: ${certificate.name}`,
    `발급기관: ${certificate.issuer}`,
    `발급일: ${certificate.issuedDate}`,
    `만료일: ${certificate.expiryDate ?? '만료 없음'}`,
    certificate.notes ? `메모: ${certificate.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
