# UPDATE v55 — 부채 3단계: 서명·승인 전용 테이블 (2026-09-05)

## 한 줄 요약
서명 요청·교관 승인·자격증/신체검사 인증·비행경력증명서 승인을 **게시판 게시글 + 댓글 파싱**에서
**`approval_requests` 테이블 1개 + RPC**로 옮겼다. 상태는 서버 `status` 컬럼으로 바로 거른다.

## 배포 순서 (중요)
1. **Supabase SQL Editor에서 `supabase/schema12-approval-requests.sql` 실행** (먼저!)
2. zip 덮어쓰기 → push → Netlify 배포
3. 교관 계정으로 계정정보 → "교관 승인 신청"에서 구분별로 다시 신청 → 관리자 승인
   (기존 게시판 승인은 이관하지 않기로 했으므로 **모든 교관이 새로 신청**해야 한다)

순서가 바뀌면 앱은 깨지지 않지만 승인·서명 화면에 "서명·승인 테이블이 아직 서버에 없습니다(schema12 SQL 실행 필요)"가 뜬다.

## 무엇이 달라졌나
### 데이터
- `approval_requests` — kind(5종) · requester · target(서명 대상 교관) · track · subject_id · status · decided_by/at · signature_path
- 판정은 `decide_approval_request(id, 'approved'|'rejected', note, signature_path)` RPC로만. 직접 UPDATE 정책 없음 → **판정 후 불변**, 감사 추적 내장
- 서명 요청의 대상은 "그 구분으로 승인된 교관"만 — DB 트리거로 강제(fail-closed)
- 승인 교관 목록은 `list_approved_instructors()` RPC 로만 제공(이름·이메일·구분·소속·승인일). 신청 사유 등 본문은 다른 회원에게 노출되지 않음
- 같은 대상에 대기중 요청 1건만(부분 유니크 인덱스) → 중복 클릭 방지

### 교관 승인
- **(사용자 × 자격 구분)** 단위. 항공기 승인과 별개로 경량·초경량 신청 가능(요청사항)
- 계정정보: 구분별 카드(승인됨 / 대기중 / 신청하기 / 반려 시 다시 신청)
- **서명 요청함 탭이 경량·초경량 트랙에서도 노출**(요청사항 — 예전엔 항공기 트랙에만 붙어 있었음)

### 서명
- 학생: 상세에서 교관 지정 → 요청 1행 생성. 열어둔 동안 15초 폴링, 닫아도 60초 배경 동기화(AutoSyncEntryDecisions)
- 교관: 서명함은 `target_id = 나` 행만 서버에서 받음. **반려 기능 추가**(사유는 학생 화면에 표시)
- 서명 이미지·판정자·시각은 행에서 그대로 옴. 댓글 파싱·승인 교관 집합 대조 없음

### 관리자
- 공용 `ApprovalQueuePanel` 하나로 교관/자격증·신체검사/증명서 탭 처리. 기본 필터 '대기중' = 서버에서 pending만 조회
- 첨부는 "첨부 보기"를 눌렀을 때만 서명 URL 발급(4분 캐시)
- 반려 사유 입력란 추가

### 성능
- 새로고침당 호출: (게시글 목록 + 댓글 배치 + 카드 수×상세) → **쿼리 1번**
- 학생 배경 동기화: 대기 기록 N건 → 쿼리 1번/60초

## 덤으로 잡은 오래된 교착 버그 (E2E 04가 찾아냄)
- `dataClientFor`(데이터 클라이언트)에 `accessToken` 콜백이 없어 supabase-js 가 요청마다 `auth.getSession()` 잠금을 기다렸고,
  인증 확인마다 새 GoTrueClient 를 만들어(경고 ×6) 메인 클라이언트와 같은 잠금을 두고 경합 → 요청이 네트워크로 나가지 못한 채 멈춤.
  증상: 서명 요청함 탭 간헐 누락, 재진입 시 "로그인 상태를 확인하는 중…" 무한 대기. 사람 브라우저는 타이밍상 통과했음.
- 대책: 데이터 클라이언트 `accessToken` 지정(getSession 미사용), 인증 전용 클라이언트 1개 재사용 + storageKey 분리.

## 삭제한 것
- 훅 9개: useCreate{CertificateApprovalPost,FlightExperienceCertificatePost,InstructorApplication,SignatureRequest}, use{CertificateApproval,FlightExperienceCertificate}BoardPosts, useInstructorApplications, useSignatureRequests, useCommentsBatch
- 워처 3개: InstructorSignatureDecisionWatcher, CertificateDecisionWatcher, CertificateApprovalLinkRepair
- lib: instructorApproval.ts(댓글 판정), signatureRequest.ts의 [SIGNED] 파싱, certificateApproval.ts의 제목 파싱
- config.ts의 게시판 ID 4개(교관 승인·서명 요청·자격증 인증·비행경력증명서)

## 기존 데이터 처리
- 게시판 시절 요청 id 를 든 기록·자격증은 새 테이블에 없다 → 워처가 단건 조회로 확인한 뒤 연결을 끊는다.
  기록은 "서명 요청 대기중" 대신 다시 요청 가능 상태로, 자격증은 "인증 요청 다시 보내기" 상태로 돌아간다.
- 서명 대기중 화면에 "요청 취소" 버튼 추가(서버 행은 cancelled, 로컬 연결 해제).

## 유지한 것 (호환)
- `LogbookEntry.signatureRequestPostId` / `certificateRequestPostId` / `Certificate.approvalRequestPostId` — 이름은 그대로, 값은 이제 `approval_requests.id`
- `instructorSignature.instructorUserId` — 이제 교관 auth uuid(구 데이터는 이메일일 수 있음)

## E2E
- 04-signature 새 구조로 재작성. 교관 계정이 **항공기 구분으로 승인**돼 있어야 통과
- 테스트 57 → 58건(댓글 판정 테스트 3건 제거, 구분별 대표 선택 테스트 4건 추가)

## 되돌리기
schema12 파일 상단 `[되돌리기]` 블록 실행. 코드는 이전 zip(`E2E삭제확인-0905`)으로.

## 같은 날 추가 (실사용자 테스트 전 정리)
- **전화번호 1개 = 계정 1개** — `schema13-unique-contact.sql`(정규화 유니크 인덱스 + 가입 전 `contact_exists` 확인). 가입·계정정보 저장에서 "이 전화번호로 가입된 계정이 이미 있어요" 안내.
  실행 시 기존 중복 전화번호가 있으면 인덱스를 만들지 않고 목록만 보여준다 → 정리 후 재실행.
- **동일 이메일 중복 가입** — Supabase Auth 가 계정 단위로 이미 막고 있음. 가입 전 확인으로 "이미 가입된 이메일이에요 · 소셜로 가입했다면 그 방법으로 로그인 후 이메일 로그인 연결" 안내를 앞당김.
- **회원 탈퇴 재확인** — 체크박스(영구 삭제 이해) + 이메일 로그인 계정은 비밀번호 재입력, 소셜 전용 계정은 "탈퇴합니다" 문구 입력. 둘 다 맞아야 버튼 활성.
- 계정정보: 보유 자격 구분 복수 선택 버그 수정(저장 전에도 동작), 주소 입력란 제거.
- 안정성: Supabase 요청 20초(업로드 60초) 시간 제한, 계정 조회 실패 시 "연결이 불안정해요 · 다시 시도" 화면(로그인으로 튕기지 않음).
