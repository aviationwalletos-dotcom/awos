# UPDATE v2.9h — 남은 지적 사항 정리 (2026-09-13)

v2.9g(Tailwind 23곳 + schema24)에 이어 나머지를 처리했어요.
**이 zip 은 v2.9g 를 포함해요.** v2.9g zip 을 아직 안 올리셨으면 이것만 올리면 돼요.

---

## 1. AI 한도 fail-open → 404 일 때만 통과

`netlify/functions/read-document.mjs`

| 상황 | 전 | 후 |
|---|---|---|
| 환경변수 없음 | 통과 | 통과 (그대로) |
| RPC 404 (schema18 미실행) | 통과 | 통과 (그대로) |
| **RPC 5xx·기타 오류** | **통과** | **차단** |
| **네트워크 예외** | **통과** | **차단** |

`consume_ai_quota()` 는 이미 실행돼 있어서 404 는 사실상 안 쓰이는 안전망이에요.
실제로 fail-open 이 발동하는 건 "함수는 있는데 Supabase 가 흔들릴 때"뿐인데, 그때
통과시키면 방어선이 Anthropic 월 한도 하나만 남아요.

**같이 고친 것:** 막을 때 "하루 10회 다 썼어요"라고 하면 거짓말이라, 한도 확인 실패는
**503 + 다른 문구**로 나눴어요.

```
429  AI 읽기는 하루 10회까지예요. 오늘은 다 썼어요.        ← 진짜 소진
503  AI 읽기 사용량을 확인하지 못했어요. 잠시 뒤 다시 해 주세요.  ← 확인 실패 (신규)
```

되돌리려면 `consumeQuota` 의 `allowed: false` 두 줄을 `true` 로 바꾸면 돼요.

---

## 2. 별표 18 제4호 — 잘못 구현된 죽은 코드 삭제

### 무엇이 틀렸나
`dutyTimeLimits.ts` 에 이런 코드가 있었어요.

```ts
requiredRestHours = lastFlightBlockTime >= 8 ? 12 : 10
hasWeeklyRestDay  = 최근 7일 안에 비행 없는 날이 하루라도 있는지
```

원문과 대조하니 두 군데가 어긋나요.

**(1) 표를 2칸으로 눌렀어요.** 별표 18 제4호는 13칸짜리 표예요.

| 비행근무시간 | 휴식 | | 비행근무시간 | 휴식 |
|---|---|---|---|---|
| 8h 미만 | 10h | | 13~14 | 16h |
| 8~9 | 11h | | 14~15 | 17h |
| 9~10 | 12h | | 15~16 | 18h |
| 10~11 | **13h** | | 16~17 | 20h |
| 11~12 | **14h** | | 17~18 | 22h |
| 12~13 | **15h** | | 18~19 | 24h |

**(2) 찾는 열쇠가 달라요. 이게 더 큰 문제예요.**
제4호 표는 **비행근무시간**으로 찾아요. 코드는 **승무시간**을 넣었어요.

- 승무시간 = 항공기가 최초로 움직인 때 ~ 정지한 때 (제1호 비고 1)
- 비행근무시간 = 근무보고를 한 때 ~ 발동기 정지 (제1호 비고 2)

**로그북에는 비행근무시간이 아예 없어요.** 승무시간은 항상 더 짧아서, 그걸로 표를 찾으면
늘 낮은 칸이 나와요 — **휴식을 덜 요구하는 방향**이에요.

**(3) "7일마다 30h"는 값이 맞아요.** 제4호 비고 2에 그대로 있어요. 다만 로그북으로는
"비행 없는 날"까지만 알 수 있어서 **연속 30시간을 확인할 수 없어요.** 그리고 원문이
*"항공운송사업자 및 항공기사용사업자는…"* 으로 시작해요 — 사업자에게 지우는 의무예요.

### 무엇을 했나
**둘 다 지웠어요.** 고칠 수가 없어서요 — 계산에 필요한 비행근무시간이 로그북에 없어요.
없는 값을 추정해서 채우는 건 "AI 는 문서에 없는 값을 만들지 않는다" 원칙에 어긋나고요.
지운 자리에 **왜 계산할 수 없는지**를 조문 번호와 함께 남겨 뒀어요.

### 실사용 영향은 없었어요
둘 다 **화면·테스트 어디에도 쓰이지 않았어요.** 계산만 하고 버렸어요.
`DutyTimeLimitCard` 가 쓰는 건 `today8h`·`last28d100h`·`last365d1000h` 셋뿐이고,
그 셋은 원문과 정확히 일치해요(제1호 8h, 제2호 100h·1,000h, 기장 1명 편성).

### 화면에 뜨던 문구도 고쳤어요
`src/data/regulations.ts` 의 `valuesSummary` 는 주석이 아니라 **법령 관리 탭에 실제로
보이는 글**이에요. 여기 "휴식 10h/12h, 7일마다 30h"라고 적혀 있어서, 앱이 그 값을
적용하는 것처럼 읽혔어요. 안 다룬다고 고쳤어요.

> **대표님 확인 부탁:** 제4호 비고 1·2가 둘 다 "항공운송사업자 및 항공기사용사업자는"으로
> 시작해요. 자가용 조종사에겐 적용 안 되는 게 맞나요? 아니라면 되살릴 방법을 다시 볼게요.

---

## 3. 주석 불일치 — 나머지 전부

v2.9g 에서 5곳(게시판 공개 범위)을 고쳤고, 이번에 나머지를 정리했어요.

| 파일 | 원래 | 지금 |
|---|---|---|
| `types/logbook.ts` | "실 서버 연동 전까지 localStorage" | localStorage 1차 + Supabase best-effort 동기화 |
| `types/certificate.ts` | 〃 | 〃 |
| `lib/flightExperienceCertificateSync.ts` | "소속 기관 계정이 [APPROVED] 댓글로 승인" | **승인 주체는 관리자(대표)**, 경로는 `approval_requests`(schema12) |
| `lib/baas/authorization.ts` | 댓글 접두어로 판정하는 것처럼 서술 | 판정은 `approval_requests`, 이 파일은 권한 집합만 제공 |
| `lib/baas/config.ts` | 제거된 게시판의 옛 워크플로 설명 | 제거 사실 + 남은 상수는 저장용이라고 명시 |
| `README.md` | "aiapp BaaS 프록시, 추후 Supabase 이전 예정" | Supabase·Netlify Functions·테스트 스택 |
| `README.md` | `npm install` | `--legacy-peer-deps` 옵션 + 검증 5종 + DB·환경변수 표 |

`flightExperienceCertificateSync.ts` 는 "기관·학교가 확인" 표현이 금지 정책인데 주석에
남아 있었어요. 정책대로 고쳤어요.

README 에 한 줄 넣어 뒀어요 — **검증 5종이 통과해도 Tailwind 클래스 오타는 안 잡힌다**는
것. v2.9g 에서 5일간 안 잡힌 이유예요.

---

## 4. E2E 뒷정리 실패를 로그로 남기기

정리 코드는 원래 있었는데 `.catch(() => undefined)` 로 **조용히 삼켰어요.** 테스트가
중간에 죽으면 운영 DB 에 찌꺼기가 남는데 알 방법이 없었어요.

6곳을 `console.warn('[cleanup] …')` 으로 바꿨어요. GitHub Actions 로그에서
`[cleanup]` 으로 검색하면 나와요.

04-signature 의 진단용 `.catch`(본문 텍스트 읽기 실패 대비) 3곳은 **안 건드렸어요** —
그건 일부러 삼키는 자리예요.

---

## 5. schema24 board id 대조 (v2.9g 검증)

SQL 에 하드코딩한 id 가 `config.ts` 와 어긋나면 조용히 구멍이 생겨서 맞춰 봤어요.

| 상수에만 있고 SQL 에 없는 것 | 판정 |
|---|---|
| `3ecd1885…` | 게시판 아님(프로젝트 ID) — 제외 맞음 |
| `b7c87a0e…` 상태공유 | 의도된 공유 — 제외 맞음 |

나머지 5개는 전부 잠금 목록에 있어요. ✅

---

## 안 한 것 — xlsx 교체

**못 했어요. 컨테이너에서 `cdn.sheetjs.com` 이 막혀 있어요(403).**

`npm audit` 결과는 확인했어요.
```
xlsx  *
Severity: high
Prototype Pollution in sheetJS
SheetJS Regular Expression Denial of Service (ReDoS)
No fix available          ← npm 판이 0.18.5 에서 멈춰서
```

교체 자체는 한 줄이에요.
```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

**그런데 여기서 하면 위험해요.**
- 제가 설치를 못 하니 `package-lock.json` 을 갱신할 수 없어요
- lock 과 package.json 이 어긋나면 **Netlify 빌드가 깨져요**
- tsc·build·테스트를 새 버전으로 못 돌려 봐요

라이브 사이트에 실사용자 5명이 있고 미팅이 내일이에요. **확인 못 한 의존성 교체를
지금 올리는 건 취약점보다 위험해요.** 위험 범위도 "본인이 올린 엑셀을 파싱하는 본인
브라우저 탭"으로 좁고요.

### 미팅 뒤에 하실 순서
1. 로컬에서 `package.json` 의 xlsx 줄을 위 URL 로 교체
2. `npm install --no-audit --no-fund --legacy-peer-deps` → `package-lock.json` 갱신됨
3. `npx tsc --noEmit` → `npm run build` → `npx vitest run`
4. 엑셀 가져오기를 실제 탈론 파일로 한 번 돌려 보기
5. **package.json 과 package-lock.json 을 반드시 같이 커밋**

---

## 새로 찾은 것 — react-router (조치 안 함)

`npm audit` 에 xlsx 말고 하나 더 떴어요.

```
react-router  6.0.0 - 7.17.0    Severity: moderate
· Open redirect via backslash in <Link> and useNavigate
· Arbitrary Constructor Injection via deserializeErrors() (SSR Hydration)
fix: react-router-dom@7.18.3 — breaking change
```

현재 `6.30.6` 이에요. **실제 노출은 낮다고 봐요.** 확인한 근거:

- SSR 쪽은 해당 없음 — 이 앱은 SSR 을 안 써요
- 오픈 리다이렉트는 `next` 파라미터가 유일한 경로인데, `AuthCallbackPage.tsx:49` 가
  이미 `/^\/(?![/\\])/` 로 `//evil.com`·`/\evil.com` 을 막고 있어요. 게다가 React Router 의
  `navigate()` 가 아니라 `window.location.replace` 를 써서 취약 경로를 안 타요

v6 → v7 은 breaking change 라 **미팅 전에 건드릴 일이 아니에요.** 미팅 뒤 과제로만 올려 둬요.

---

## 검증

```
npx tsc --noEmit                  통과
npx eslint src --max-warnings=0   통과
npx vitest run                    109 통과
npm run build                     통과 (CSS 에 /10·/15·/20 생성 확인)
npx playwright test --list        20건
node --check netlify/functions/*  3개 모두 통과
package-lock.json                 변경 없음
```

---

## 대표님이 하실 일

1. zip 덮어쓰기 → Commit → Push
2. Supabase → SQL Editor → **`schema24-board-privacy.sql` Run** (아직 안 하셨으면)
   → 확인 쿼리 3줄이 `true`
3. 배포 뒤 확인 3가지
   - NO-GO 배지에 **빨간 바탕**이 생겼는지
   - **문의 답변**이 작성자 본인 계정에서 여전히 보이는지 ← schema24 영향
   - **AI 읽기**가 정상 동작하는지 ← 한도 로직 변경 영향
4. 제4호 비고 1·2의 적용 대상(사업자 한정인지) 확인

삭제된 파일 없어요. `DELETE-LIST` 필요 없어요.
