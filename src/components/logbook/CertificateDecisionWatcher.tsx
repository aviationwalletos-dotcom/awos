// 비행경력증명서 인증 요청 자동 감지 watcher (BUG-015)
//
// [원인] 이 자동 감지 로직은 원래 EntryDetailDialog.tsx에만 있었는데, 그 컴포넌트는 사용자가
// 해당 기록의 상세 다이얼로그를 직접 열었을 때만 마운트된다. 즉 기관이 승인/반려해도 사용자가
// 그 기록의 상세 화면을 열지 않으면 로컬 `certificateApprovalStatus`가 절대 갱신되지 않아,
// "총 비행시간 요약"이 계속 미인증으로 표시되는 문제가 있었다.
//
// [수정] 다이얼로그 열림 여부와 무관하게 로그북 페이지 진입 시 자동으로 확인하도록, 대상 기록마다
// 화면에 아무것도 그리지 않는 이 watcher 컴포넌트를 렌더링하는 방식으로 옮겼다(`useComments`는
// React 훅이라 반복문 안에서 호출할 수 없어, 대상 개수만큼 컴포넌트를 렌더링하는 패턴을 쓴다 —
// `InstructorApprovalPanel.tsx`의 `ApplicationRow` 패턴과 동일).
import { useEffect, useMemo } from 'react'

import { resolveApprovalDecision } from '../../lib/baas/instructorApproval'
import { toLogbookEntryInput } from '../../lib/logbookEntryInput'
import { useComments } from '../../hooks/baas/useComments'

import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

interface CertificateDecisionWatcherProps {
  entry: LogbookEntry
  onUpdate: (id: string, input: LogbookEntryInput) => void
}

export function CertificateDecisionWatcher({ entry, onUpdate }: CertificateDecisionWatcherProps) {
  const certificateRequestPostId = entry.certificateRequestPostId
  const { data: commentsData } = useComments(certificateRequestPostId, {
    enabled: Boolean(certificateRequestPostId),
  })

  const decision = useMemo(() => resolveApprovalDecision(commentsData?.items ?? []), [commentsData])

  useEffect(() => {
    if (!commentsData) return
    if (decision.status === 'pending') return

    const nextStatus = decision.status === 'approved' ? 'confirmed' : 'rejected'
    if (entry.certificateApprovalStatus === nextStatus) return

    onUpdate(entry.id, { ...toLogbookEntryInput(entry), certificateApprovalStatus: nextStatus })
  }, [entry, commentsData, decision, onUpdate])

  return null
}
