// 내 데이터 전체 내보내기 — 로그북·자격증·서명/승인 요청·계정 요약을 JSON 한 파일로.
//
// 왜: 탈퇴 전 CSV 는 로그북만 담는다. 자격증·서명 이력·승인 결과는 못 가져갔다.
//     "언제든 내 데이터를 통째로 들고 나갈 수 있다"는 K-EPL 생성원 주장에도 힘이 된다(데이터 이동권).
// 형식: 사람이 읽을 수 있는 JSON. 비밀번호·토큰 같은 건 없다. 사진은 링크가 아니라 경로만 남긴다(사진 자체는 앱에서 개별 저장).

import type { Certificate } from '../types/certificate'
import type { LogbookEntry } from '../types/logbook'
import type { AccountResponse } from './baas/types'
import { listApprovalRequests } from './approvals/api'

export interface FullExport {
  format: 'awos-export'
  version: 1
  exportedAt: string
  account: {
    id: string
    email: string
    name: string
    phone: string
    createdAt: string
    userType?: string
    affiliation?: string
  }
  logbook: LogbookEntry[]
  certificates: Certificate[]
  /** 내가 낸 서명·인증 요청과 그 결과(스냅샷·해시·서명자·일시 포함) */
  approvalRequests: unknown[]
}

export async function buildFullExport(
  account: AccountResponse,
  entries: LogbookEntry[],
  certificates: Certificate[],
): Promise<FullExport> {
  let approvalRequests: unknown[] = []
  try {
    approvalRequests = await listApprovalRequests({ scope: 'mine', limit: 1000 })
  } catch {
    // 서명 테이블이 아직 없거나 권한 오류면 빈 배열로. 나머지는 그대로 내보낸다.
  }
  return {
    format: 'awos-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: account.id,
      email: account.user_id,
      name: account.name,
      phone: account.phone,
      createdAt: account.created_at,
      userType: (account.data as { user_type?: string } | undefined)?.user_type,
      affiliation: (account.data as { organization_affiliation?: string } | undefined)?.organization_affiliation,
    },
    logbook: entries,
    certificates,
    approvalRequests,
  }
}

export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadFullExport(account: AccountResponse, entries: LogbookEntry[], certificates: Certificate[]) {
  const data = await buildFullExport(account, entries, certificates)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadJson(data, `awos-내데이터-${stamp}.json`)
  return data
}
