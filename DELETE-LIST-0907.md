# 저장소에서 직접 삭제할 파일 (2026-09-07)

zip 덮어쓰기는 파일을 추가·수정만 하고 **삭제는 못 합니다.** 아래 20개는 부채 3단계 이후 쓰이지 않는 파일이라
Claude 작업본에서는 이미 지워졌지만 저장소(main)에는 남아 있고, 이들이 없어진 함수를 참조해 `tsc` 오류를 냅니다.
(Netlify 는 타입 검사 없이 빌드해서 사이트는 정상 동작했음.)

zip 덮어쓰기 뒤 탐색기/파인더에서 아래 파일을 지우고 GitHub Desktop 에서 "삭제 20"을 확인한 뒤 Commit → Push.

```
src/components/certificates/CertificateApprovalLinkRepair.tsx
src/components/logbook/CertificateDecisionWatcher.tsx
src/components/logbook/InstructorSignatureDecisionWatcher.tsx
src/components/logbook/QuickEntryForm.tsx
src/components/sections/Contact.tsx
src/components/sections/Dashboard.tsx
src/components/sections/Pricing.tsx
src/components/sections/Roles.tsx
src/components/sections/Solution.tsx
src/hooks/baas/useCertificateApprovalBoardPosts.ts
src/hooks/baas/useCommentsBatch.ts
src/hooks/baas/useCreateCertificateApprovalPost.ts
src/hooks/baas/useCreateFlightExperienceCertificatePost.ts
src/hooks/baas/useCreateInstructorApplication.ts
src/hooks/baas/useCreateSignatureRequest.ts
src/hooks/baas/useFlightExperienceCertificateBoardPosts.ts
src/hooks/baas/useInstructorApplications.ts
src/hooks/baas/useSignatureRequests.ts
src/lib/baas/instructorApproval.ts
src/lib/baas/signatureRequest.test.ts
```

확인: 삭제 후 프로젝트 폴더에서 `npx tsc --noEmit` 을 돌리면 오류 0 이어야 합니다(선택).
