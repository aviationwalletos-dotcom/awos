# UPDATE v14 — 검토·버그수정 + 별표 4 규칙 엔진 (2026-09-03)

0902 누적본을 받아 전체 검토한 결과와 수정 내역입니다.

## 검토 결과 요약

| 항목 | 결과 |
|---|---|
| 타입 검사 (`tsc --noEmit`) | 통과 (수정 전에도 통과) |
| 테스트 (`vitest`) | 10건 → **19건** 전부 통과 |
| 프로덕션 빌드 (`vite build`) | 통과 |
| 린트 (`eslint`) | **188건 실패 → 0건** |

0902 zip의 기능 반영은 대부분 정상이었습니다. 문의 메일(`awos.help@gmail.com`),
글꼴 통일(Pretendard + JetBrains Mono, CSP 허용 목록 포함), 빠른입력 칩,
역할 2종 제한, 소셜 온보딩, 울진 포맷 합계 행 스킵까지 모두 코드에 들어와 있습니다.

## 고친 것

### 1. [BUGFIX] 카카오 로그인 scope가 통째로 무시되던 문제 — `src/lib/supabase/oauth.ts`

`startOAuthLogin()`이 Supabase 인가 주소에 `scope=`(단수)로 보내고 있었습니다.
GoTrue가 인식하는 이름은 `scopes`(복수)라서 이 값은 **서버에 도달하지 못하고 버려졌습니다.**

같은 파일의 `startLinkProvider()`는 처음부터 `scopes`를 쓰고 있어, 두 함수가 서로
다르게 동작하고 있었습니다.

영향:
- 카카오 로그인이 항상 Supabase 대시보드의 기본 범위로 요청됨 (닉네임 제한이 코드로 걸리지 않음)
- **비즈 앱 전환 후 `VITE_KAKAO_EMAIL_SCOPE=true`로 바꿔도 아무 일도 일어나지 않을 상태였음**

지금 고쳤으므로, 비즈 앱 전환 → 동의항목 이메일 추가 → 환경변수 설정 순서대로 진행하면
의도대로 이메일까지 요청됩니다.

### 2. [SEC] OAuth 콜백 오픈 리다이렉트 — `src/pages/AuthCallbackPage.tsx`

`next` 파라미터를 `next.startsWith('/')`로만 검사하고 있었습니다.
`//evil.com` 이나 `/\evil.com`은 이 검사를 통과하지만 브라우저는 **외부 주소로 해석**합니다.
로그인 직후 외부 사이트로 튕겨 보내는 피싱에 쓰일 수 있어, 앱 내부 경로만 통과하도록 바꿨습니다.

### 3. 린트 188건 정리 — `eslint.config.mjs` 외 3개 파일

- `sort-imports`의 선언 순서 정렬을 껐습니다(멤버 정렬은 유지). 프로젝트가 쓰는
  "react → 외부 → 내부" 묶음 관례와 알파벳 강제 정렬이 계속 충돌해 **173건이 상시 실패**하고 있었습니다.
  상시 실패하는 린트는 아무도 보지 않게 되고, 그 사이에 진짜 오류가 묻힙니다.
- `no-unused-vars`에 `^_` 무시 패턴을 넣었습니다. 구조분해로 특정 키를 제외할 때 쓰는
  `_id`, `_c` 같은 관례 표기가 오류로 잡히고 있었습니다.
- 진짜로 안 쓰이던 import 3건을 지웠습니다
  (`Nav.tsx`의 `Button`, `DashboardPage.tsx`의 `Button`, `CertificateForm.tsx`의 `FLIGHT_INSTRUCTOR_CERTIFICATE_LABEL`).

이제 `npm run validate`(lint + typecheck + test)가 통과합니다.

## 더한 것

### `src/lib/eligibility/rules.ts` — 응시경력 규칙 엔진 (v1.1 기초)

항공안전법 시행규칙 **[별표 4] (개정 2025. 12. 5.)**, 초경량비행장치 조종자 증명
운영세칙 **[별표 1]·[별표 1의2] (개정 2024. 7. 17.)** 을 데이터로 인코딩했습니다.
규칙 20개, 테스트 9건.

포함: 자가용·사업용·운송용(비행기/헬리콥터), 부조종사, 계기비행증명,
조종교육증명 초급·선임, 등급 한정, 경량항공기 조종사·조종교육증명,
초경량 유인 동력계열(동력비행장치·회전익비행장치)과 각 지도조종자.

핵심은 **모의비행훈련장치 인정 상한**입니다. 예를 들어 운송용은 FFS 100 / FTD 25 / BATD 5인데
FTD+BATD 합산이 25시간을 넘지 못합니다. 이 중첩 조건은 수기로 계산하면 거의 틀립니다.
`applySimCredit()`이 사용자에게 유리한 순서(BATD부터 차감)로 처리하고, 테스트로 고정해 뒀습니다.
타 종류 항공기 경력 인정(1/3 또는 상한 중 적은 쪽)은 `applyCrossCategoryCredit()`에 분리했습니다.

**아직 UI에 배선하지 않았습니다.** 순수 계산 모듈만 들어가 있고 화면 동작은 이전과 동일합니다.

## 아직 남은 것 (다음 작업)

1. **로그북 컬럼 부족** — `LogField` 20개 중 `picSupervised`(감독 하 기장임무), `soloXc`,
   `nightTakeoffs`/`nightLandings`, `instructionGiven`이 현재 스키마에 없습니다.
   이게 없으면 운송용·사업용·선임 조종교육증명 진척도를 계산할 수 없습니다. schema10의 핵심입니다.
2. **신체검사 유효기간이 v0.9 임시값** — `certificateOptions.ts`의 `MEDICAL_VALIDITY_MONTHS`가
   `{1종:12, 2종:12, 3종:24}` 고정값입니다. 확정안(별표 8)은 연령별로 갈리므로
   (2종 60/24/12, 3종 48/24/12) **생년월일 수집이 선행**되어야 합니다.
3. **역할 다중 선택** — 현재 `IndividualRole`은 단일 선택입니다. 보유 트랙 집합 구조로 바꿔야
   조종사 + 경량항공기 자격을 동시에 가진 사람의 데이터가 섞이지 않습니다.
4. **번들 크기** — 메인 청크 941kB(gzip 254kB). 동작에는 문제없지만 초기 로딩에 불리하므로
   `manualChunks` 분리를 검토할 시점입니다.

## 배포 전 확인

- Supabase Redirect URLs에 `https://aviationwallet.com/**` 포함 여부
- 적용 대기 스키마: `schema3-authorization.sql` → `schema4-storage-private.sql`
- 카카오는 비즈 앱 전환 전까지 `VITE_KAKAO_EMAIL_SCOPE`를 설정하지 마세요
  (전환 전에 켜면 KOE205가 납니다)
