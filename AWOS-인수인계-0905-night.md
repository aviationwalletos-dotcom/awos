# AWOS 인수인계 (2026-09-05 밤) — 새 채팅 시작용

이 문서를 새 채팅 첫 메시지에 붙여 넣으면 이어서 작업할 수 있다. 한국어 해요체, zip 누적 배포 방식 그대로.

## 0. 한 줄 요약
v1.2 = **부채 3단계(서명·승인 전용 테이블 `approval_requests`) 코드 완료**. 사용자가 아직 배포·SQL 실행·교관 재승인을 안 했을 수 있음.
그 다음은 E2E 04 초록 확인 → 실사용자 테스트(울진 5명).

## 1. 프로젝트 기본 (변경 없음)
- React 19 + Vite + TS + Supabase + Netlify(GitHub main 자동 배포). PWA. pdf-lib.
- 저장소 github.com/aviationwalletos-dotcom/awos · Supabase vflyqnbdquaanpkvuinz · 관리자 aviationwalletos@gmail.com · 문의 awos.help@gmail.com
- 배포: Claude가 `/home/claude/awos` 수정 → 누적 zip → 사용자 덮어쓰기 → GitHub Desktop Fetch/Pull → Commit/Push. 충돌은 zip 쪽.
- **zip 파일명은 영문으로**(한글 파일명은 다운로드가 실패했음).
- 컨테이너: npm은 `--cache /tmp/npmcache2 --legacy-peer-deps`, 브라우저 접근 불가(E2E는 `--list`만).
- **최신 zip: `awos-v1.2-stage3-0905.zip`**

## 2. 이 세션(9/5)에 끝난 것
### 배포 인프라·자잘한 버그
- E2E 워크플로: `npm ci`→`npm install`(lock 없음), Node 22, 시크릿 확인 스텝, push 트리거 제거(수동/매일 05시만)
- vitest가 e2e/ 를 집어가던 것 제외(vite.config test.include)
- 이메일 로그인 연결 '미연결' 표시 버그 → **schema11** `has_email_login()` (실행 완료)
- 소셜 로그인 콜백이 기관 계정도 개인 페이지로 보내던 것 → user_type 보고 /dashboard
- 첨부 업로드: 저장소 키에서 한글 제거, 실패 시 서버 메시지 그대로 표시, 10MB 가드
- 역할별 자동채움 설명 문구를 역할마다 정확히("Dual만", "PIC+단독" 등)
- 승인 패널 첨부 사진 지연 로딩(카드 수×2 호출 → 클릭한 것만)
- E2E 01·03 셀렉터 보정(랜딩 CTA 라벨 대기, 자격증 등록 필수값 사진·만료일·발급기관, 삭제 2단계). **11 passed, 04만 실패가 기준선**

### 부채 3단계 (UPDATE-v55-부채3.md 참고)
- `supabase/schema12-approval-requests.sql`: 테이블 1 + RPC 3(`decide_approval_request`, `cancel_approval_request`, `list_approved_instructors`) + 정책 2 + 트리거 2
- 교관 승인 = (사용자 × 구분) 단위. 계정정보에 구분별 카드 3장. **서명 요청함 탭이 경량·초경량에도 노출**
- 서명: 학생 요청 → 교관 서명함(반려 가능) → 학생 반영(다이얼로그 15초 폴링 / 배경 60초). "요청 취소" 버튼 추가
- 관리자: 공용 `ApprovalQueuePanel`(교관/자격증·신체검사/증명서). 기본 '대기중' 서버 필터. 반려 사유 입력
- 옛 게시판 id 를 든 기록·자격증은 워처가 단건 조회로 확인 후 연결 해제(다시 요청 가능 상태로)
- 삭제: 훅 9, 워처 3, 게시판 ID 4, 댓글 파싱 lib. 테스트 58건.
- E2E 04 새 구조로 재작성(교관 계정이 **항공기 구분 승인**이어야 통과)

## 3. 사용자가 다음에 할 일 (순서 중요)
1. Supabase SQL Editor → `supabase/schema12-approval-requests.sql` Run → 확인 표: 테이블 1 · RPC 3 · 정책 2
2. `awos-v1.2-stage3-0905.zip` 덮어쓰기 → push → Netlify 배포
3. 재헌님(wogjs1118@gmail.com) 계정정보 → 교관 승인 신청(항공기; 필요하면 경량·초경량도) → 관리자 계정 대시보드 → 교관 승인 관리에서 승인
4. Actions → E2E Run workflow → **12 passed 목표**
5. 실사용자 테스트 시작(울진 학생 3·교관 1·관리자 1, 2주)

## 4. 다음 작업(우선순위)
1. E2E 04 결과 보고 보정
2. 실사용자 테스트 → 기록 입력 "빠른 입력(4필드)" 재설계
3. TS 문서 갱신 후 발송(운항기술기준 8.1.7.6 / 제77조② 추가, 소개서에서 본인 서명 삭제·교관 확인 추가)
4. 보류: 경량 커런시, DJI 로그 CSV, Remote ID, 비교관 기장 서명(제77조①2호), 초경량 유인 신체검사 카드

## 5. 법령 확인 결과 (변경 없음)
- 180일 = 운항기술기준 8.2.2 나 / 90일+야간 = 8.2.2 가·규칙 121조 / IFR 8.2.3 / 교관 규칙 125조 / 별지36호 / 8.1.7.6
- 경량항공기 법정 커런시 없음. 초경량 무인 세칙 9·10·13조, 별표2·3. 제77조 증명자(본인 서명은 증명 아님). 제78조 SIC 1/2.

## 6. 알아두면 좋은 것
- `account.id` = auth uuid, `account.user_id` = 이메일. 새 테이블은 전부 uuid 기준.
- `signatureRequestPostId` / `certificateRequestPostId` / `approvalRequestPostId` 필드 이름은 호환 위해 유지, 값은 `approval_requests.id`.
- 관리자 = `authorized_orgs` 등록 계정(`is_awos_admin()`).
- 사용자(우혁준)는 초보 개발자·조종사. 설명은 짧고 결론 먼저, 법 근거는 조문 번호로.
