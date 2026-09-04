// 자격증 인증 요청 요약 텍스트. 부채 3단계 이후 요청은 approval_requests(schema12) 행으로 저장되며,
// 제목 접두어/파싱 유틸은 필요 없어져 제거했다.

import type { Certificate } from '../types/certificate'

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
