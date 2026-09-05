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

## E2E 04 "서명 요청함 탭 없음" 실패의 진짜 원인 (trace 로 확인)
- 앱·서버·네트워크 모두 정상(모든 요청 200~600ms). 테스트가 `locator.isVisible({ timeout })` 로 기다린다고 믿었으나
  Playwright 는 이 timeout 을 무시하고 **즉시** 판정한다. 승인 조회(0.3초)보다 먼저 "탭 없음"으로 판정해 재진입·실패.
- 대책: `helpers.appears(locator, ms)`(waitFor 기반)로 전부 교체. 앞으로 "나타날 때까지 기다림"은 expect().toBeVisible / waitFor 만 쓴다.
- 이 과정에서 넣은 앱 수정(요청 20초 제한, 목록 유지, 필터 변경 시 이전 목록 폐기, GoTrue 인스턴스 정리, 연결 불안정 화면)은 실사용에 이득이라 유지.

## TS 제출 대비 보강 (2026-09-05 저녁)
- **서명 시점 스냅샷·해시** — 서명 요청 생성 시 기록 전체(서명 대상 필드)를 `approval_requests.payload.signedSnapshot`에 저장 + SHA-256.
  서명 완료 시 기록에 `signedRequestId` 보관. 서명 뒤 기록을 고치면 상세 화면에 "서명 당시 내용 vs 지금" 표(종이의 줄 긋기).
  서명이 살아 있는 기록은 "서명 당시 내용과 일치(해시 검증)" 표시. 용량: 서명 1건당 1~2KB.
- **교관 신청 전제 = 조종교육증명 등록** — 구분별(항공기: 조종교육증명 / 경량: 경량항공기 조종교육증명 / 초경량: 지도조종자)
  자격증이 등록돼 있어야 신청 버튼이 켜진다. 없으면 "자격증 탭에서 등록하기 →"(`/logbook?tab=certificates`).
  신청서에 증명 정보(명칭·발급일·인증 상태)가 자동으로 붙고 관리자 카드에 표시된다.
- `/logbook?tab=<key>` 로 탭 직접 진입 지원.
- 경량·초경량: "응시경력" 탭 신설(자격증 다음). 첫 화면 "다음 목표" 상세 → 이 탭으로.
- 기록 입력 폼·자격증 목록 접기, 조종사 자격 템플릿 카드 제거, PDF 등 lazy 모듈 실패 시 자동 새로고침.

## 배포 전 보안 보강 — schema14-hardening.sql (반드시 실행)
- 요청서(approval_requests)의 요청자 이름·이메일을 서버 트리거가 프로필·계정에서 강제로 채움(사칭 방지)
- 저장소(board-files) 읽기: 본인 파일 · 관리자 · 서명 이미지(-signature.png)만. 예전엔 로그인한 누구나 URL만 알면 열람 가능했음
- 승인 교관 목록 RPC에서 이메일 제거(이름·구분·소속·승인일만)
- 교관 서명함 카드는 학생이 쓴 요약이 아니라 **서명 스냅샷(payload.signedSnapshot)** 을 표로 표시 — 요약과 스냅샷을 다르게 적어 속이는 경로 차단
- 서명 이력: 기록 상세에 N차 서명별 "그때 내용 vs 지금" 표. 서버 행이라 사용자가 지울 수 없음

## 알고 받아들인 위험(문서화)
- 소속 기관은 자기 신고 — 관리자 큐 필터에만 쓰이고 판정은 사람이 함
- 비행 기록 자체는 자기 신고(종이와 동일). 객관 근거는 교관 서명·판정 후 불변·이력
- `contact_exists` 는 익명 호출이라 "이 번호/이메일이 가입돼 있나"를 참/거짓으로 알 수 있음(가입 편의와 맞바꾼 것)
- 두 기기에서 같은 기록을 동시에 고치면 나중 저장이 이김(로컬 우선 구조)
- 오류 모니터링(Sentry 등) 없음, 무료 요금제는 백업 없음 → 외부 공개 전 Pro 전환

## 추가 수정 (배포 직전)
- "JWT expired": 데이터 클라이언트를 직접 쓰는 경로(승인·서명 조회, 회원 목록, 개인 테이블 동기화, 프로필 수정, 탈퇴)가
  만료 토큰을 그대로 쓰던 것 → 요청 전 만료 60초 이내면 refresh 토큰으로 먼저 갱신(`getFreshDataClient`).
- 가입 전 이메일 확인이 연결된 로그인 방법(카카오·구글)의 이메일까지 보고, 어떤 방법으로 로그인해야 하는지 안내(schema15).
- 회원 목록: 여러 명 동시에 펼치기.

## 기기 호환 점검 (배포 전, 코드 기준)
- 카카오톡·네이버 등 인앱 브라우저: 구글 OAuth 차단(403 disallowed_useragent) → 감지 시 안내 배너 + 구글 버튼 비활성, 안드로이드는 "크롬으로 열기"(intent://), iOS 는 Safari 로 열기 안내·주소 복사. 카카오 로그인은 인앱에서도 동작.
- iOS 입력칸 자동 확대: 모바일에서 input/select/textarea 16px 강제.
- iPhone PWA·노치: sticky 헤더에 safe-area-inset-top, body 에 inset-bottom.
- 갤럭시 강제 다크모드 반전 방지: `color-scheme: dark`.
- 구형 기기: `<dialog>.showModal/close` 와 `AbortSignal.timeout` 폴리필(compat.ts).
- 좁은 화면: 서명 표 가로 스크롤 래퍼, 가입 자격 구분·초경량 시간 입력 3열 → 1열(sm 이상 3열).
- iOS 홈화면 앱에서 소셜 로그인이 되돌아오지 않을 때 안내(이메일 로그인 유도).

- 서명함: 지금 보는 구분 외에 대기중 요청이 있으면 "다른 구분에 대기중 N건 · 보기 →" 버튼(구분 전환). 교관 기본 구분이
  항공기가 아닐 때 항공기 요청을 놓치던 문제(E2E 04가 trace 로 잡음).

## 기기 호환 2차 점검
- 인앱 브라우저(카톡 등)에서 PDF·CSV 저장이 조용히 막히던 것 → 공유 시트 시도 후 안 되면 "다른 브라우저로 열기" 안내 오류.
- "오늘" 날짜가 UTC 기준이던 곳(자격증 발급일 기본값, 법정교육 기한, 기체 검사 만료) → 현지 날짜(00~09시 어제 판정 버그).
- 시간·횟수 입력에 `inputMode="decimal"`(모바일 숫자 키패드).
- ES 모듈 미지원 구형 브라우저에 빈 화면 대신 "브라우저 업데이트" 안내(`legacy-notice.js`, nomodule).
- Playwright `tablet` 프로젝트(iPad Mini 폭·터치) 추가 — 01·02·03 중간 폭에서 검증.
