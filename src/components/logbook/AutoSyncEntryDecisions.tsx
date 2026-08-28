// 다이얼로그를 열지 않아도 비행경력증명서 인증/교관 서명 결과를 자동 반영 (BUG-015)
//
// 배경: 비행경력증명서 인증 요청·교관 서명 요청의 승인/반려/서명완료 자동 감지 로직이
// `EntryDetailDialog.tsx`에만 있어, 사용자가 그 기록의 상세 화면을 직접 열지 않으면 로컬
// 상태(`certificateApprovalStatus`/`instructorSignature`)가 갱신되지 않고, 그 결과 목록
// 최상단의 "총 비행시간 요약"이 실제로는 승인되었어도 계속 미인증으로 표시되었다.
//
// 이 컴포넌트는 로그북 데이터가 로드되는 동안(다이얼로그 열림 여부와 무관하게) 항상 렌더링되어,
// 아직 확정되지 않은 대상 기록마다 화면에는 아무것도 그리지 않는 watcher를 하나씩 렌더링한다.
// `useComments`는 React 훅이라 반복문 안에서 직접 호출할 수 없으므로, 대상 개수만큼 컴포넌트를
// 렌더링해 각자 자기 몫만 확인하는 방식을 쓴다(`InstructorApprovalPanel.tsx`의 `ApplicationRow`
// 패턴과 동일). `EntryDetailDialog.tsx`의 기존 동일 로직은 그대로 유지되며(다이얼로그를 열면
// 즉시 최신 상태를 다시 확인), 두 곳에서 같은 확인이 중복돼도 같은 값으로 수렴하므로 문제없다.
import React, { useMemo } from 'react'

import { CertificateDecisionWatcher } from './CertificateDecisionWatcher'
import { InstructorSignatureDecisionWatcher } from './InstructorSignatureDecisionWatcher'

import type { LogbookEntry, LogbookEntryInput } from '../../types/logbook'

interface AutoSyncEntryDecisionsProps {
  entries: LogbookEntry[]
  onUpdate: (id: string, input: LogbookEntryInput) => void
}

export function AutoSyncEntryDecisions({ entries, onUpdate }: AutoSyncEntryDecisionsProps) {
  // 비행경력증명서 인증 요청이 제출되어 있고 아직 확정(confirmed/rejected)되지 않은 기록만 대상으로 한다.
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

  // 서명 요청이 제출되어 있고 아직 서명이 완료되지 않은 기록만 대상으로 한다.
  const pendingSignatureEntries = useMemo(
    () => entries.filter((entry) => !entry.instructorSignature && Boolean(entry.signatureRequestPostId)),
    [entries],
  )

  return (
    <>
      {pendingCertificateEntries.map((entry) => (
        <CertificateDecisionWatcher key={`certificate-${entry.id}`} entry={entry} onUpdate={onUpdate} />
      ))}
      {pendingSignatureEntries.map((entry) => (
        <InstructorSignatureDecisionWatcher key={`signature-${entry.id}`} entry={entry} onUpdate={onUpdate} />
      ))}
    </>
  )
}
