# UPDATE v2.9u — 초경량·경량 한정사항도 여러 개 (2026-09-14)

v2.9t 까지 포함해요. **SQL 없어요. Netlify 함수가 바뀌었어요.**

---

## 제가 어제 만든 실수예요

조종교육증명 문제와 **같은 종류**입니다 — 여러 개짜리를 하나로 눌러놓은 것.

어제 초경량·경량을 붙이면서 이렇게 썼어요.

| 자격 종류 | 스키마 |
|---|---|
| 항공기 `classRatings` | 배열 — "빠짐없이 배열로" |
| 항공기 `flightInstructorRatings` | 배열 |
| 항공기 `instrumentRatings` | 배열 |
| **초경량 `ultralightKind`** | **문자열 하나** ❌ |
| **경량 `lsaKind`** | **문자열 하나** ❌ |

같은 XII 한정사항 칸을 읽는데 항공기만 배열이고 초경량·경량은 단수였어요.
매핑도 하나만 만들고 `return` 했고요.

**한정사항에 종류가 둘 이상이면 하나만 등록돼요.**
예를 들어 무인멀티콥터 1종 + 무인비행기 2종을 가진 분은 하나를 잃어요.

## 고친 것

### ① 스키마를 배열로
```
ultralightRatings: [{ kind: 'UAS_MULTICOPTER', grade: 1 },
                    { kind: 'UAS_AIRPLANE',    grade: 2 }]
lsaRatings:        ['LSA_AIRPLANE', 'LSA_GYROPLANE']
```
항공기 `classRatings` 와 같은 구조예요.

### ② guide 에도 규칙 추가
```
초경량·경량도 한정사항에 종류가 여러 개 적힐 수 있습니다.
하나만 적혀 있으면 항목 1개짜리 배열로, 여러 개면 전부 넣으세요.
예: 무인멀티콥터/1종, 무인비행기/2종
  → [{kind:'UAS_MULTICOPTER',grade:1},{kind:'UAS_AIRPLANE',grade:2}]
```

### ③ 매핑이 여러 개를 만든다
**첫 항목이 폼 본체**가 되고, 나머지는 항공기 한정처럼 **체크 목록**에 함께 떠요.
같은 종류가 두 번 오면 한 번만 만들고, 모르는 코드는 건너뛰되 나머지는 살려요.

### ④ 예전 단수 형식도 계속 받아요
`ultralightKind`/`uasGrade`/`lsaKind` 가 와도 그대로 읽어요.

Netlify 함수와 프론트는 **같은 배포에 올라가지만 캐시 때문에 잠깐 어긋날 수 있어요.**
그 사이에 읽기가 통째로 실패하면 곤란해서 하위호환을 남겼어요. 테스트로 고정했고요.

테스트 5건 추가. 163 → **168**.

---

## 같이 점검한 것 — 나머지는 괜찮아요

| 확인 | 결과 |
|---|---|
| 항공기 `classRatings`·`instrumentRatings`·`flightInstructorRatings` | 원래 배열 ✅ |
| `documentKind` · `licenceCode` | 한 문서에 하나뿐이라 단수가 맞음 ✅ |
| `eptaLevel` · `eptaValidUntil` | 자격증에 한 줄만 적힘 ✅ |
| `medicalClass` | 신체검사증명 한 장에 하나 ✅ |

**`medicalClass` 는 다른 문제가 하나 있어요.** 스키마에 **두 번** 정의돼 있어요
(`'제1종'|'제2종'|'제3종'` 문자열 / `정수 1,2,3`). JS 라 뒤엣것만 살아요.
신체검사 읽기가 지금 잘 되고 있으면 그대로 두시고, 이상하면 알려 주세요.

---

## 검증

```
npx tsc --noEmit                  통과
npx eslint src --max-warnings=0   통과
npx vitest run                    168 통과 (163 + 신규 5)
npm run build                     통과
npx playwright test --list        20건
node --check netlify/functions/*  통과
```

프롬프트 개선은 **실제 AI 호출로 검증 못 했어요** — 컨테이너에 API 키가 없어요.

## 대표님이 하실 일

1. zip 덮어쓰기 → Commit → Push
2. **Netlify 함수가 바뀌었어요** — 배포 뒤 초경량 자격증을 다시 읽혀 보세요
3. 무인멀티콥터 1종이 그대로 잘 나오는지 확인(한정사항이 하나여도 배열로 와야 해요)
