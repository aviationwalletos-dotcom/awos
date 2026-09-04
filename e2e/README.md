# AWOS E2E (Playwright) — 핵심 흐름 5개

배포된 사이트에 **테스트 계정**으로 로그인해 실제로 눌러본다. 화면·저장·서명·PDF가 진짜 동작하는지 사람 대신 확인한다.

| 파일 | 흐름 |
|---|---|
| 01-login | 이메일 로그인 → 로그북 첫 화면 / 랜딩 "시작하기" 리다이렉트 |
| 02-entry | 기록 추가 → 목록 → 상세 / 필수 누락 시 저장 안 됨 |
| 03-certificate | 자격증 등록 → 목록 → 상세 → 삭제 |
| 04-signature | 학생 서명 요청 → 교관 서명 → 학생 화면 반영 (계정 2개) |
| 05-pdf | 비행경력증명서 PDF 파일 다운로드 |

## 준비 (한 번만)
1. Supabase Auth에 테스트 계정 2개 생성(이메일 인증 완료): 학생 1, 교관 1
   - 교관 계정: 계정정보에서 소속 기관을 학생과 같게 두고 **교관 승인**(항공기 조종교관)을 관리자 계정으로 승인해 둔다
   - 두 계정 모두 자격 구분 "항공기"
2. GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret** 4개:
   `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD`, `E2E_INSTRUCTOR_EMAIL`, `E2E_INSTRUCTOR_PASSWORD`

## 실행
- 자동: main에 push하면 3분 뒤(Netlify 반영 대기) 실행, 매일 05:00 KST에도 실행. 실패하면 Actions 탭에서 스크린샷·트레이스 확인.
- 수동: Actions → "E2E (핵심 흐름 5개)" → Run workflow
- 로컬: `.env.e2e`에 위 4개 변수 넣고 `npx playwright install chromium` 후 `npm run e2e`

## 첫 실행에서 실패할 수 있는 것
셀렉터는 현재 화면 기준으로 작성됐고 실기기에서 아직 돌려보지 않았다. 첫 실행 결과의 스크린샷을 보고 셀렉터를 한 번 맞추면 이후엔 안정적으로 돈다.
테스트가 만든 기록(비고 `E2E-ENTRY`, `E2E-SIGN`)은 테스트가 스스로 삭제한다.
