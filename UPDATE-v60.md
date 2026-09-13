# UPDATE v2.9j — 서명 이미지를 기록에 싣지 않기 (2026-09-13)

v2.9i 까지 포함해요. schema24 는 이미 Run 하셨으니 **이번엔 SQL 없어요. zip 만 올리면 돼요.**

---

## 무엇이 문제였나

교관이 서명할 때 저장소 업로드가 실패하거나 8초를 넘기면, `InstructorSignatureInboxSection.tsx:58`
이 **data URL 을 그대로** 서명 경로로 써요(서명 자체가 막히는 것보다 낫다는 판단 — 타당해요).

그 값이 `approval_requests.signature_path` 에 들어가고, `AutoSyncEntryDecisions.tsx` 가
그걸 학생 기록의 `instructorSignature.signatureDataUrl` 로 옮겨요. 그러면

- 기록 한 건이 **600 B → 3~5 KB** 로 커져요
- localStorage 와 **동기화 게시글**이 같이 무거워져요
- 798건이 전부 그러면 **3.3 MB (5MB 한도의 66%)**

회선이 느린 교관이 몰아서 서명하면 연달아 걸려요.

## 무엇을 했나

**기록에는 짧은 저장소 URL 만 싣고, data URL 은 버려요.**

버려도 이미지는 안 사라져요. 이미 서버 `approval_requests.signature_path` 에 남아 있고,
기록 상세 화면이 **그 행을 이미 조회하고 있어요**(서명 이력 타임라인 때문에).
그래서 화면에서 필요한 순간에 이미 손에 들고 있어요.

### 고친 세 자리

| 파일 | 무엇 |
|---|---|
| `AutoSyncEntryDecisions.tsx:91` | 서버 동기화로 들어오는 서명 — `data:` 면 기록에 안 넣음 |
| `EntryDetailDialog.tsx:225` | 서명 직후 경로 — 같은 가드 |
| `EntryDetailDialog.tsx:151` | 표시 — 기록에 없으면 **이미 불러온 승인 행**에서 가져옴 |

### 새 순수 함수 둘 (`lib/approvals/select.ts`)

```ts
storableSignaturePath(path)   // data: 면 undefined, 저장소 경로면 그대로
latestSignaturePath(rows)     // decided_at 기준 가장 나중 서명의 이미지
```

**`latestSignaturePath` 가 중요해요.** 서명 → 수정(서명 해제) → 재서명 하면 승인 행이
여러 개 생겨요. 아무거나 집으면 **옛 서명 그림이 떠요.** 서명 이력 타임라인의
`latestSignature` 와 같은 기준(`decided_at` 오름차순, 마지막)을 써요.

단위 테스트 5건을 붙였어요(109 → **114**).

---

## 왜 "실패하면 서명을 이미지 없이 확정" 이 아니라 이 방식인가

되돌릴 수 있어서예요.

"이미지를 안 남긴다"는 한 번 지나가면 못 살려요. 이 방식은 **서버에 원본이 다 있어서**
언제든 방향을 바꿀 수 있어요. 그리고 *"서명 이미지가 없어도 서명으로 인정되느냐"* 는
법 판단을 지금 안 해도 돼요.

관련해서 확인한 것들:

- **PDF 는 서명 이미지를 안 써요.** 별지 36호는 `발급자: ______ (서명 또는 인)` 공란,
  별지 2호는 `e.instructorSignature ? '전자서명' : ''` — **객체 존재만** 봐요
- **자격증은 영향 없어요.** 교관 확인(endorsement)도 같은 `SignaturePad` 를 타지만,
  `CertificateApprovalStatusWatcher` 는 `approvalStatus` 만 복사하고 자격증 타입엔
  서명 필드가 없어요. **인라인 경로는 비행기록 하나뿐이었어요**
- **불러오기 게이트가 안 깨져요.** `hasSignatureHistory` 는
  `signedRequestId || instructorSignature` 를 보는데, 이미지를 빼도 객체(이름·uuid·시각)는 남아요
- **탈퇴해도 남아요.** schema17 이 `requester_id` 를 `set null` 로 바꿔 행이 살아남고,
  `decided_by` 도 원래 `set null` 이에요. `ar_select` 의 `requester_id = auth.uid()` 로
  학생이 계속 읽을 수 있어요

---

## 잃는 것 두 가지

**① 오프라인에서 서명 그림만 안 보여요.** 서명자 이름·일시·서명 여부는 기록에 남아 있어서
그대로 보여요. 그림만 서버 왕복이 필요해요. 서명 이력 타임라인은 원래부터 서버 의존이라
새로 생긴 제약이 아니에요.

**② 이미 base64 가 박힌 옛 기록은 그대로예요.** 코드가 기록 값을 먼저 쓰기 때문에 화면은
지금과 똑같아요. 그 기록을 수정해 재서명하면 자연히 빠져요. 지금 서명된 기록이 몇 건 안
되니 그냥 두셔도 돼요.

---

## 검증

```
npx tsc --noEmit                  통과
npx eslint src --max-warnings=0   통과
npx vitest run                    114 통과 (109 + 신규 5)
npm run build                     통과
npx playwright test --list        20건
```

---

## 대표님이 하실 일

1. zip 덮어쓰기 → Commit → Push (**SQL 없음**)
2. 배포 뒤 **기록 상세에서 교관 서명 그림이 그대로 보이는지** 확인
   - 이미 서명된 기록을 열어 보시면 돼요. 옛 기록은 기록 안의 값을 쓰고,
     새 기록은 서버에서 가져와요. 둘 다 보여야 정상이에요

삭제된 파일 없어요.
