# 저장소에서 직접 삭제할 파일 (2026-09-10)

zip 덮어쓰기는 파일을 추가·수정만 하고 **삭제는 못 합니다.** 아래 파일을 탐색기에서 지우고 GitHub Desktop 에서 삭제가 잡힌 것을 확인한 뒤 Commit → Push.

## 이번(9/10)에 생긴 것
```
docs/법령개정-대응매뉴얼.md        ← docs/regulation-update-manual.md 로 개명(한글 파일명이 Netlify 빌드를 깨뜨림)
```

## 9/7 목록 — 이미 지웠다면 무시. 남아 있으면 지운다 (tsc 오류 원인)
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

## 확인
저장소 폴더에서 GitHub Desktop 의 Changes 에 위 파일이 "삭제(빨간 −)"로 잡히면 됩니다. 이미 없으면 아무것도 안 잡힙니다.
남아 있는지 빠르게 보려면: 저장소 폴더에서 `git ls-files | findstr /i "QuickEntryForm useSignatureRequests 법령개정"` (Windows) — 아무것도 안 나오면 끝.
