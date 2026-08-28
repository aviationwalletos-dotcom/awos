// LogbookEntry -> LogbookEntryInput 변환 공용 유틸 (BUG-015)
//
// EntryDetailDialog.tsx와, 다이얼로그를 열지 않아도 동작하는 백그라운드 watcher 컴포넌트
// (CertificateDecisionWatcher/InstructorSignatureDecisionWatcher)가 동일한 변환 로직을
// 각자 복제하지 않도록 한 곳으로 모았다.
//
// 주의: 의도적으로 `syncPostId`를 반환 객체에 포함하지 않는다. `useLogbookEntries.updateEntry`는
// `{ ...entry, ...input }`로 병합하므로, 만약 이 키를 명시적으로 `undefined`로 포함하면 그 자체로
// 병합 시 기존 `syncPostId`를 지워버린다. 키 자체를 생략해야 스프레드가 기존 값을 건드리지 않는다.

import type { LogbookEntry, LogbookEntryInput } from '../types/logbook'

export function toLogbookEntryInput(entry: LogbookEntry): LogbookEntryInput {
  return {
    year: entry.year,
    date: entry.date,
    departure: entry.departure,
    arrival: entry.arrival,
    viaAirports: entry.viaAirports,
    aircraftType: entry.aircraftType,
    aircraftIdentification: entry.aircraftIdentification,
    blockTime: entry.blockTime,
    flightCategory: entry.flightCategory,
    categoryHours: entry.categoryHours,
    pilotingTime: entry.pilotingTime,
    groundTrainerTime: entry.groundTrainerTime,
    conditions: entry.conditions,
    instrumentApproaches: entry.instrumentApproaches,
    dayLandings: entry.dayLandings,
    nightLandings: entry.nightLandings,
    notes: entry.notes,
    pilotCertification: entry.pilotCertification,
    instructorSignature: entry.instructorSignature,
    signatureRequestPostId: entry.signatureRequestPostId,
    origin: entry.origin,
    legacySourceNote: entry.legacySourceNote,
    certificateImageDataUrl: entry.certificateImageDataUrl,
    certificateApprovalStatus: entry.certificateApprovalStatus,
    certificateIssuer: entry.certificateIssuer,
    certificateRequestPostId: entry.certificateRequestPostId,
  }
}
