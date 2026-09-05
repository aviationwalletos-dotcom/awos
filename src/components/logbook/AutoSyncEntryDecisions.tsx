// 다이얼로그를 열지 않아도 서명 완료 / 비행경력증명서 승인 결과가 기록에 반영되도록 하는 백그라운드 동기화 (BUG-015).
//
// 부채 3단계: 댓글 배치 조회 + 권한 집합 대조 → approval_requests 에서 "내가 요청자이고 판정이 끝난 행"만
// 1회 조회(60초 폴링). 대기 기록이 수백 건이어도 요청은 1번이고, 판정자·시각·서명 이미지는 행에 그대로 있다.

import { useEffect, useMemo, useRef } from 'react'

import { verifyApprovalRequestExists } from '../../lib/approvals/api'
import { useApprovalRequests } from '../../lib/approvals/hooks'
import { toLogbookEntryInput } from '../../lib/logbookEntryInput'

import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

interface AutoSyncEntryDecisionsProps {
  entries: LogbookEntry[]
  onUpdate: (id: string, input: LogbookEntryInput) => void
}

export function AutoSyncEntryDecisions({ entries, onUpdate }: AutoSyncEntryDecisionsProps) {
  const pendingCertificateEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.origin === 'flight_experience_certificate' &&
          Boolean(entry.certificateRequestPostId) &&
          entry.certificateApprovalStatus !== 'confirmed' &&
          entry.certificateApprovalStatus !== 'rejected',
      ),
    [entries],
  )
  const pendingSignatureEntries = useMemo(
    () => entries.filter((entry) => !entry.instructorSignature && Boolean(entry.signatureRequestPostId)),
    [entries],
  )
  const hasPending = pendingCertificateEntries.length > 0 || pendingSignatureEntries.length > 0

  const { data } = useApprovalRequests(
    { scope: 'mine', kind: ['signature', 'flight_experience'], status: ['approved', 'rejected', 'cancelled'], limit: 300 },
    { enabled: hasPending, pollMs: 60_000 },
  )

  // [3단계] 옛 게시판 id 를 들고 있는 기록은 새 테이블에 없다 → 단건 조회로 확인한 뒤 연결을 끊어 다시 요청/직접 확인할 수 있게 한다.
  const checkedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!hasPending) return
    const candidates = [
      ...pendingSignatureEntries.map((e) => ({ entry: e, id: e.signatureRequestPostId as string, field: 'signature' as const })),
      ...pendingCertificateEntries.map((e) => ({ entry: e, id: e.certificateRequestPostId as string, field: 'certificate' as const })),
    ].filter((c) => !checkedRef.current.has(c.id))
    if (candidates.length === 0) return
    let cancelled = false
    void (async () => {
      for (const c of candidates) {
        checkedRef.current.add(c.id)
        const exists = await verifyApprovalRequestExists(c.id)
        if (cancelled || exists) continue
        if (c.field === 'signature') onUpdate(c.entry.id, { ...toLogbookEntryInput(c.entry), signatureRequestPostId: undefined })
        else onUpdate(c.entry.id, { ...toLogbookEntryInput(c.entry), certificateRequestPostId: undefined })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasPending, pendingSignatureEntries, pendingCertificateEntries, onUpdate])

  useEffect(() => {
    if (!data || !hasPending) return
    const byId = new Map(data.map((r) => [r.id, r]))

    for (const entry of pendingCertificateEntries) {
      const req = byId.get(entry.certificateRequestPostId as string)
      if (!req || req.status === 'cancelled') continue
      const nextStatus = req.status === 'approved' ? 'confirmed' : 'rejected'
      if (entry.certificateApprovalStatus === nextStatus) continue
      onUpdate(entry.id, { ...toLogbookEntryInput(entry), certificateApprovalStatus: nextStatus })
    }

    for (const entry of pendingSignatureEntries) {
      const req = byId.get(entry.signatureRequestPostId as string)
      if (!req) continue
      if (req.status === 'approved' && req.decided_by) {
        onUpdate(entry.id, {
          ...toLogbookEntryInput(entry),
          signedRequestId: req.id,
          instructorSignature: {
            instructorName: req.decided_by_name || '교관',
            instructorUserId: req.decided_by,
            signatureDataUrl: req.signature_path ?? undefined,
            signedAt: req.decided_at ? new Date(req.decided_at).getTime() : Date.now(),
          },
        })
      } else if (req.status === 'rejected' || req.status === 'cancelled') {
        // 반려·취소된 요청은 연결을 끊어 다시 요청할 수 있게 한다. 반려 사유는 기록에 남겨 상세에서 보여준다.
        onUpdate(entry.id, {
          ...toLogbookEntryInput(entry),
          signatureRequestPostId: undefined,
          lastSignatureRejection:
            req.status === 'rejected'
              ? {
                  note: req.decision_note || '교관이 서명 요청을 반려했어요.',
                  at: req.decided_at ? new Date(req.decided_at).getTime() : Date.now(),
                  instructorName: req.decided_by_name || '교관',
                }
              : entry.lastSignatureRejection,
        })
      }
    }
  }, [data, hasPending, pendingCertificateEntries, pendingSignatureEntries, onUpdate])

  return null
}
