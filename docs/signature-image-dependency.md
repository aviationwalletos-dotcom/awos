# 교관 서명 이미지 — 세 곳이 서로 의존해요 (2026-09-13)

**한 줄:** 학생 기록의 교관 서명 그림은 이제 **서버에만** 있어요. 아래 세 장치 중
**하나만 없어져도 그림이 조용히 사라져요.** 오류도 안 나고 테스트도 통과해요.

---

## 왜 이렇게 됐나

v2.9j(2026-09-13) 전에는 서명 그림이 **학생 기록 안에 base64 로 박혀** 있었어요.
교관이 저장소 업로드에 실패하면 data URL 을 그대로 실었거든요
(`InstructorSignatureInboxSection.tsx` — 서명이 막히는 것보다 낫다는 판단).

그 값이 기록 한 건을 **600B → 3~5KB** 로 부풀렸어요. 798건이면 3.3MB 로
localStorage 5MB 한도의 66% 를 먹어요. 그래서 v2.9j 에서 **기록에는 짧은 저장소 경로만
싣고, 그림은 서버 `approval_requests.signature_path` 에서 가져오도록** 바꿨어요.

바꾼 자리:
- `lib/approvals/select.ts` — `storableSignaturePath()` / `latestSignaturePath()`
- `components/logbook/AutoSyncEntryDecisions.tsx`
- `components/logbook/EntryDetailDialog.tsx`

**대신 그림이 서버에 살아 있어야 한다는 전제가 생겼어요.** 예전엔 기록에 박혀 있어서
서버가 어떻든 상관없었어요. 이제는 아니에요.

---

## 그림을 지켜 주는 세 장치

### ① `delete_my_account()` 가 스토리지를 안 건드린다
**파일:** `supabase/schema22-withdrawal-storage-fix.sql`

schema17 에는 탈퇴 시 `storage.objects` 를 SQL 로 지우는 (d) 단계가 있었는데,
Supabase 가 직접 삭제를 막아서 탈퇴 자체가 실패했어요. schema22 에서 그 단계를
**삭제**했어요. 결과적으로 탈퇴가 스토리지 파일을 전혀 건드리지 않아요.

> ⚠️ 나중에 "탈퇴 시 파일 정리"를 SQL 로 되살리면 서명 그림이 같이 지워져요.

### ② 앱의 탈퇴 전 파일 정리가 서명을 제외한다
**파일:** `src/lib/approvals/api.ts` → `deleteMyUploadedFiles()`

```ts
.filter((p) => p && !p.includes('://') && !p.endsWith('-signature.png'))
```

자격증·신체검사·증명서 사진만 지우고 `-signature.png` 는 남겨요.

> ⚠️ 이 `filter` 의 `-signature.png` 조건을 빼면, **교관이 탈퇴할 때 본인이 남긴
> 서명 그림이 전부 지워져요.** 학생 기록에서 그림만 사라져요.

### ③ 스토리지 읽기 정책에 서명 예외가 있다
**파일:** `supabase/schema14-hardening.sql` → `board_files_scoped_read`

```sql
bucket_id = 'board-files'
and (
  owner = auth.uid()
  or owner_id = auth.uid()::text
  or public.is_awos_admin()
  or name like '%-signature.png'     -- ← 이 줄
)
```

서명 파일은 **소유자와 무관하게** 로그인한 사용자가 읽을 수 있어요. 교관이 올린
파일을 학생이 봐야 하기 때문이에요.

> ⚠️ 보안 강화한다고 이 줄을 지우면, 학생이 **남(교관)이 올린 파일**을 못 읽게 돼서
> 그림이 사라져요. 교관이 탈퇴하면 `owner` 도 없어지니 더더욱 경로가 없어요.
>
> 이 줄이 느슨해 보이는 건 사실이에요(경로를 알면 아무 로그인 사용자나 읽힘).
> 조이려면 **먼저 대체 경로를 만들고** 나서 지워야 해요 — 예를 들어
> "내가 requester 인 approval_requests 의 signature_path 와 일치하는 파일"로
> 좁히는 식이에요.

---

## 탈퇴해도 남는 것 (실측 확인, 2026-09-13)

PostgreSQL 에 교관을 만들어 서명시키고 `auth.users` 에서 지워서 확인했어요.

| | 탈퇴 전 | 탈퇴 후 |
|---|---|---|
| 서명 행(`approval_requests`) | 2건 | **2건** |
| `signature_path` | 있음 | **있음** |
| `decided_by`(교관 uuid) | 있음 | **null** (FK `on delete set null`) |
| 학생이 조회 | 가능 | **가능** (`ar_select` 의 `requester_id = auth.uid()`) |

학생 화면에 남는 것: **교관 이름 · 서명 일시 · 서명 그림 · 당시 스냅샷 + SHA-256 해시.**
끊기는 건 교관 계정 uuid 하나예요. 근거는 schema17 — 개인정보보호법 제15조①6호(정당한 이익),
"내 기록에 적힌 상대방 이름은 남는다"(종이 로그북과 같다).

---

## 깨졌는지 확인하는 법

자동 검증으로는 **안 잡혀요.** tsc·eslint·vitest·build 전부 통과하고, E2E 도 서명
"완료" 여부만 보지 그림이 보이는지는 안 봐요.

사람이 봐야 해요:
1. 서명된 비행기록을 연다 → 상세 화면에 **교관 서명 그림**이 보이는지
2. 위 세 파일 중 하나를 고쳤다면 반드시 1번을 다시 한다

---

## 되돌리려면

그림을 다시 기록 안에 넣고 싶으면 `storableSignaturePath()` 가 `path` 를 그대로
돌려주게 바꾸면 돼요. 서버에 원본이 다 있으니 언제든 방향을 바꿀 수 있어요 —
이 구조를 고른 이유이기도 해요.
