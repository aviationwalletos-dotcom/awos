# UPDATE v2.9m — 서명 이미지 의존 관계 문서화 (2026-09-13)

v2.9l 까지 포함해요. **SQL 없어요.** 주석·문서만 바뀌었고 동작은 그대로예요.

---

## 왜 남기나

v2.9j 에서 서명 그림을 기록에서 빼고 서버에서 가져오게 바꿨어요. 그러면서 **전제가
하나 생겼어요** — 그림이 서버에 살아 있어야 해요. 예전엔 기록 안에 base64 로 박혀 있어서
서버가 어떻든 상관없었어요.

교관 탈퇴 시나리오를 실제로 돌려 보니 세 장치가 그림을 지키고 있었어요. 그런데
**셋이 서로 의존한다는 게 코드 어디에도 안 적혀 있었어요.** 하나만 없어져도 오류 없이
그림만 사라지고, 자동 검증은 전부 통과해요.

## 어디에 적었나

따로 문서만 만들면 안 읽혀요. **망가뜨리러 들어오는 문 네 개**에 각각 표지를 붙였어요.

| 문 | 파일 | 무슨 표지 |
|---|---|---|
| 스토리지 읽기 정책 | `supabase/schema14-hardening.sql` | `name like '%-signature.png'` 줄 위에 "지우지 마세요" |
| 탈퇴 전 파일 정리 | `src/lib/approvals/api.ts` | `deleteMyUploadedFiles` 주석에 filter 조건 경고 |
| 탈퇴 SQL | `supabase/schema22-withdrawal-storage-fix.sql` | "(d) 단계를 되살리지 마세요" |
| 그림을 뺀 장본인 | `src/lib/approvals/select.ts` | `storableSignaturePath` 주석에 세 곳 목록 |

넷 다 **`docs/signature-image-dependency.md`** 를 가리켜요. 자세한 설명·실측 결과·
되돌리는 법은 거기 있어요.

## 실측으로 확인한 것 (교관 탈퇴)

PostgreSQL 에 교관을 만들어 서명시키고 `auth.users` 에서 지웠어요.

| | 탈퇴 전 | 탈퇴 후 |
|---|---|---|
| 서명 행 | 2건 | **2건** |
| `signature_path` | 있음 | **있음** |
| `decided_by`(교관 uuid) | 있음 | **null** |
| 학생이 조회 | 가능 | **가능** |

학생 화면에 남는 것: 교관 이름 · 서명 일시 · 서명 그림 · 스냅샷 + SHA-256 해시.
끊기는 건 교관 계정 uuid 하나예요. schema17 원칙("내 기록에 적힌 상대방 이름은 남는다")
그대로 지켜져요.

## 알아두실 것 하나

`board_files_scoped_read` 의 `or name like '%-signature.png'` 는 느슨해요 — 경로를 알면
로그인한 누구나 읽혀요. 서명 그림이라 민감도가 낮고 경로가 uuid 라 당장 문제는 아니지만,
**조이려면 먼저 대체 경로를 만들고 나서** 지워야 해요. 그냥 지우면 그림이 사라져요.
대안은 문서에 적어 뒀어요.

---

## 검증

```
npx tsc --noEmit                  통과
npx eslint src --max-warnings=0   통과
npx vitest run                    114 통과
npm run build                     통과
npx playwright test --list        20건
```

## 대표님이 하실 일

zip 덮어쓰기 → Commit → Push. **동작 변화 없어서 따로 확인할 화면은 없어요.**
