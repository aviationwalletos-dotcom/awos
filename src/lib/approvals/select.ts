// approval_requests 행 목록에서 화면 판정에 쓰는 순수 함수(훅과 분리해 테스트한다).

import type { ApprovalRequest, PilotTrack } from './types'

/**
 * 구분(track)별 대표 신청 1건을 고른다.
 *  - 취소된 요청은 무시
 *  - 승인된 것이 있으면 그것(승인은 되돌리지 않으므로 항상 우선)
 *  - 없으면 가장 최근 것(대기중/반려)
 */
export function pickInstructorRequestByTrack(rows: ApprovalRequest[]): Partial<Record<PilotTrack, ApprovalRequest>> {
  const out: Partial<Record<PilotTrack, ApprovalRequest>> = {}
  for (const row of rows) {
    if (row.kind !== 'instructor' || !row.track || row.status === 'cancelled') continue
    const prev = out[row.track]
    if (!prev) {
      out[row.track] = row
      continue
    }
    if (prev.status === 'approved') continue
    if (row.status === 'approved' || row.created_at > prev.created_at) out[row.track] = row
  }
  return out
}

export function approvedTracksOf(byTrack: Partial<Record<PilotTrack, ApprovalRequest>>): PilotTrack[] {
  return (Object.keys(byTrack) as PilotTrack[]).filter((t) => byTrack[t]?.status === 'approved')
}

/**
 * 서명 이미지 경로 중 "기록에 실어도 되는 것"만 돌려준다.
 *
 * 교관이 서명할 때 저장소 업로드가 실패하거나 8초를 넘기면 data URL 을 그대로 쓴다
 * (InstructorSignatureInboxSection — 서명 자체가 막히는 것보다 낫다는 판단). 그 값이 학생
 * 기록으로 흘러들면 기록 한 건이 600B → 3~5KB 가 되고, localStorage 와 동기화 게시글이
 * 같이 무거워진다.
 *
 * 이미지는 서버 approval_requests.signature_path 에 이미 남아 있고 상세 화면이 그 행을
 * 이미 조회하므로(EntryDetailDialog), 기록에는 짧은 저장소 URL 만 싣는다.
 * 법적 효력은 이미지가 아니라 승인 행(서명자 uuid · 스냅샷 해시 · 시각)에 있다.
 *
 * ⚠️ 이 함수 때문에 그림이 "서버에만" 있게 됐다. 그림이 계속 보이려면 세 곳이 함께 살아
 *    있어야 한다 — ① delete_my_account 가 스토리지를 안 건드림(schema22)
 *    ② deleteMyUploadedFiles 의 `-signature.png` 제외(approvals/api.ts)
 *    ③ board_files_scoped_read 의 서명 파일 예외(schema14).
 *    하나만 빠져도 오류 없이 그림만 사라진다. docs/signature-image-dependency.md 참고.
 */
export function storableSignaturePath(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return path.startsWith('data:') ? undefined : path
}

/**
 * 승인된 서명 요청들 중 "가장 나중" 것의 이미지 경로를 고른다.
 * 서명 → 수정(서명 해제) → 재서명 하면 승인 행이 여러 개 생기므로, 옛 서명 그림이 뜨지
 * 않도록 decided_at 기준 마지막을 쓴다(서명 이력 타임라인의 latestSignature 와 같은 기준).
 */
export function latestSignaturePath(rows: ApprovalRequest[] | undefined): string | undefined {
  if (!rows || rows.length === 0) return undefined
  const ordered = [...rows].sort((a, b) => (a.decided_at ?? '').localeCompare(b.decided_at ?? ''))
  return ordered[ordered.length - 1]?.signature_path ?? undefined
}
