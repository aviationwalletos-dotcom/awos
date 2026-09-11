// 비행 기록 1건에 대한 교관 서명 요청 만들기 — 상세 화면의 "교관에게 서명 요청 보내기"와
// 기록 입력 폼의 "저장하면서 바로 요청"(2026-09-11)이 같은 함수를 쓴다.

import { createApprovalRequest } from './api'
import { buildSignedSnapshot } from './snapshot'
import type { ApprovalRequest } from './types'
import { buildSignatureRequestContent, buildSignatureRequestTitle } from '../baas/signatureRequest'
import type { AccountResponse } from '../baas/types'
import { entryTrack } from '../tracks'
import type { LogbookEntry } from '../../types/logbook'

export interface SignatureTarget {
  userId: string
  name: string
  affiliation?: string
}

export async function sendEntrySignatureRequest(
  entry: LogbookEntry,
  account: AccountResponse,
  target: SignatureTarget,
  myAffiliation?: string | null,
): Promise<ApprovalRequest> {
  return createApprovalRequest({
    kind: 'signature',
    requesterName: account.name,
    requesterEmail: account.user_id,
    targetId: target.userId,
    track: entryTrack(entry),
    subjectId: entry.id,
    affiliation: myAffiliation?.trim() || null,
    title: buildSignatureRequestTitle(entry),
    summary: buildSignatureRequestContent(entry, account, { name: target.name, affiliation: target.affiliation && target.affiliation !== '미상' ? target.affiliation : undefined }),
    // [증거] 서명 대상 기록의 전체 스냅샷 + 해시. 서명 뒤 기록이 바뀌어도 "서명 당시 내용"이 서버에 남는다.
    payload: { signedSnapshot: await buildSignedSnapshot(entry) },
  })
}
