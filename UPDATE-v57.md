# UPDATE v2.9g — 깨진 위험 표시 23곳 · 게시판 비공개 범위 확대 (2026-09-13)

두 가지를 한 묶음으로 처리했어요. 코드는 zip, DB 는 `schema24` 를 Supabase 에서 Run 하면 끝이에요.

---

## 1. 깨진 Tailwind 클래스 23곳 (13개 파일)

### 증상
`bg-rose-500/100/15` 처럼 슬래시가 두 번 들어간 클래스가 23곳 있었어요.
Tailwind 는 투명도 수식어에 슬래시를 한 번만 허용해서, 이런 이름은 **CSS 규칙이 아예 만들어지지
않아요.** 화면에서는 배경색 없이 글자만 나가요.

`rose-500` → `rose-500/100` 으로 일괄 치환한 흔적이에요. `/100` 은 "불투명도 100%"라 원래는
의미가 없는데, 뒤에 원래 있던 `/15` 가 붙으면서 이름 자체가 깨졌어요.

### 왜 검증에서 안 잡혔나
`tsc`·`eslint`·`vitest`·`build` 가 전부 통과해요. Tailwind 는 모르는 클래스 이름을 오류로
띄우지 않고 **조용히 버리기** 때문이에요. 클래스 이름은 그냥 문자열이라 타입 검사 대상도 아니고요.
그래서 검증 5종이 초록불인데 화면만 틀린 상태가 5일 넘게 유지됐어요.

### 실물 확인
Tailwind 3.4.17 을 따로 설치해 실제 소스로 CSS 를 뽑아 대조했어요.

```
수정 전 CSS: .bg-rose-500\/100\/15  → 없음 (규칙 자체가 생성 안 됨)
수정 후 CSS: .bg-rose-500\/15       → 생성됨
```

배포 빌드(`dist/assets/index-*.css`)에서도 `/10`·`/15`·`/20` 세 개가 모두 생성된 걸 확인했어요.

### 고친 자리

| 개수 | 파일 | 무엇이 안 보였나 |
|---|---|---|
| 4 | `components/logbook/FlightReadinessPanel.tsx` | **NO-GO 배지**, 요건 미충족 표시 |
| 4 | `components/StatusBadge.tsx` | danger 배지 4종(전 화면 공용) |
| 2 | `components/currency/CurrencyDashboard.tsx` | 커런시 만료 |
| 2 | `components/dashboard/PersonnelTable.tsx` | 기관 대시보드 NO-GO |
| 2 | `components/dashboard/ExpiryAlertList.tsx` | 만료 알림 |
| 2 | `components/logbook/LegacyExcelImport.tsx` | 엑셀 오류 행, 오류 배지 |
| 1 | `pages/LoginPage.tsx` | 로그인 실패 메시지 박스 |
| 1 | `pages/SignupPage.tsx` | 가입 오류 메시지 박스 |
| 1 | `pages/AccountPage.tsx` | 계정 화면 오류 박스 |
| 1 | `components/logbook/DutyTimeLimitCard.tsx` | 승무시간 초과 |
| 1 | `components/dashboard/MemberStatusOverview.tsx` | 구성원 현황 경고 |
| 1 | `components/compliance/RequirementCard.tsx` | 요건 미충족 |
| 1 | `components/certificates/CertificateList.tsx` | 자격증 만료 임박 |

### 치환 규칙
```
bg-rose-500/100/15 → bg-rose-500/15
bg-rose-500/100/10 → bg-rose-500/10
bg-rose-500/100/20 → bg-rose-500/20
bg-rose-500/10/60  → bg-rose-500/10   ← 판단이 들어간 한 곳
```

**마지막 한 줄은 원래 값을 복원할 수 없어서 정한 값이에요.** `LegacyExcelImport.tsx` 미리보기
표에서 오류 행에 까는 배경이에요. 같은 표의 정상 행 배지가 `bg-go/10` 이라 짝을 맞춰 `/10` 으로
했어요. 화면에서 오류 행이 너무 옅으면 `/15`, `/20` 으로 올리면 돼요.

### 확인할 것
배포 후 **NO-GO 배지에 빨간 바탕이 생겼는지** 한 번 봐 주세요. 글자색(`text-rose-300`)은
원래 살아 있어서 완전히 안 보이진 않았지만, 바탕이 없으면 위험 표시로서 약해요.

---

## 2. `schema24` — 게시판 비공개 범위 확대 **(실행 필요)**

파일: `supabase/schema24-board-privacy.sql`

### 문제 1 — 게시판 2개가 안 잠겨 있었어요

`bp_select_authenticated` 정책이 잠근 게시판은 schema9 기준 3개뿐이었어요.

| 게시판 | schema9 | schema24 |
|---|---|---|
| 비행기록 `634956de…` | 잠김 | 그대로 |
| 자격증 `d4df52f6…` | 잠김 | 그대로 |
| 문의 `8c4d2f6a…` | 잠김 | 그대로 |
| **업무기록 `2966212a…`** | **전원 열람** | **잠금 추가** |
| **개인설정 `bf6c2b9a…`** | **전원 열람** | **잠금 추가** |
| 상태공유 `b7c87a0e…` | 전원 열람 | 그대로(의도된 공유) |

로그인한 회원이면 누구나 REST API 를 직접 호출해 남의 글을 읽을 수 있던 상태였어요.
- 업무기록: 정비사·관제사·운항관리사의 업무 내역
- 개인설정: 소속 기관, 개인 역할, 계기비행심사 이수일, 조종교육증명 최초취득일,
  교관 커런시 회복 자기신고

### 문제 2 — 댓글이 전부 열려 있었어요

`bc_select_authenticated` 가 `using (true)` 였어요.

지금 댓글을 쓰는 건 **문의 답변 하나**예요(`InquiryAdminPanel` 이 쓰고 `InquiryPage` 가 읽어요).
문의 게시글은 schema9 로 잠갔는데 관리자가 단 **답변은 전원이 읽을 수 있어서**, 글을 잠근
의미가 반쯤 사라진 상태였어요.

schema24 는 **"부모 게시글을 볼 수 있는 사람만 댓글도 보이게"** 바꿔요.

| 누가 | 문의 답변이 보이나 |
|---|---|
| 문의 작성자 | 보임 (본인 글) |
| 관리자(`authorized_orgs`) | 보임 |
| 그 밖의 회원 | **안 보임** |

### 설계 메모
댓글 정책 안에 게시글 정책과 **같은 조건을 그대로 다시 썼어요.** `board_posts` 의 RLS 에
기대는 편이 짧지만, 정책 표현식 안의 하위 질의에 RLS 가 적용되지 않는 상황이 생기면 정책이
조용히 무력화돼요. 길어도 명시하는 쪽을 택했어요.

`or author_id = auth.uid()` 를 넣어서 **내가 쓴 댓글은 언제나 보여요.**

### 실행 후 확인
SQL 끝에 확인 쿼리 3개가 붙어 있어요. 셋 다 `true` 면 정상이에요.

---

## 3. 주석 정리 5곳 (1·2번이 무효화한 것만)

RLS 를 바꾸면 기존 주석이 **반대로** 틀린 말이 돼서 같이 고쳤어요.

| 파일 | 원래 | 지금 |
|---|---|---|
| `lib/baas/config.ts` (자격증) | "누구나 볼 수 있는 구조적 한계" | schema9 로 잠김 |
| `lib/baas/config.ts` (비행기록) | 〃 | schema9 로 잠김 |
| `lib/baas/config.ts` (업무기록) | 〃 | schema24 로 잠김 |
| `lib/baas/config.ts` (개인설정) | 〃 | schema24 로 잠김 |
| `hooks/useLogbookEntries.ts` | 〃 | schema9 로 잠김 |

나머지 주석 불일치(README, `types/*.ts`, 옛 `[SIGNED]` 댓글 워크플로 설명 등)는 손대지
않았어요. 이번 변경과 무관해서 미팅 뒤에 따로 정리하는 게 나아요.

---

## 검증

```
npx tsc --noEmit              통과
npx eslint src --max-warnings=0   통과
npx vitest run               109 통과
npm run build                통과 (CSS 에서 /10·/15·/20 생성 확인)
npx playwright test --list   20건
```

---

## 대표님이 하실 일

1. zip 덮어쓰기 → GitHub Desktop Commit → Push
2. Supabase → SQL Editor → `schema24-board-privacy.sql` Run → 확인 쿼리 3줄 `true`
3. 배포 후 NO-GO 배지에 빨간 바탕이 생겼는지 확인
4. 문의 화면에서 답변이 여전히 잘 보이는지 확인(작성자 본인 계정으로)

삭제된 파일은 없어요. `DELETE-LIST` 필요 없어요.
