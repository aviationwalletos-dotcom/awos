# AWOS 법령 개정 대응 매뉴얼 (새 Claude 채팅에 그대로 붙여넣는 문서)

> **쓰는 법**: 법령 관리 탭에서 빨간 "변경됨" 칩이 뜨면 → 이 문서 전체를 복사해 새 Claude 채팅 첫 메시지에 붙이고 → 그 아래에 (1) 바뀐 조문·별표 이름 (2) 법령정보센터에서 받은 개정 원문 PDF (3) 최신 `awos-*.zip` 을 같이 올린다. 이 세 가지면 그 Claude 는 이 프로젝트를 몰라도 고칠 수 있다.
>
> 작성 2026-09-10. 이 문서는 저장소 `docs/regulation-update-manual.md` 에 있고, 관리자 대시보드 "법령 관리" 탭에서 "매뉴얼 복사" 버튼으로도 복사된다.

---

## 0. 너(Claude)에게 — 이 채팅에서 할 일

너는 조종사 로그북 웹앱 **AWOS(Aviation Wallet OS)** 의 코드에서 **항공 법령 값을 개정 내용에 맞게 고치는 일**을 한다. 사용자(대표, 우혁준)는 조종사이고 초보 개발자다. **한국어 해요체, 결론 먼저, 지시는 한 번에 하나.** 코드는 zip 으로 주고받는다.

순서:
1. 사용자가 올린 개정 원문(PDF)에서 **바뀐 조문·별표의 새 값**을 찾아 아래 §3 표의 "코드 값"과 대조한다. 값이 안 바뀌었으면 "값 변경 없음, `appliedEffectiveDate` 만 올리면 돼요"라고 답한다.
2. 바뀐 값이 있으면 §3 표의 **파일·함수**를 고친다. 값만 바꾸고 구조는 건드리지 않는다. 조문 번호가 바뀌면 화면 문구·주석의 조문 번호도 같이 바꾼다.
3. `src/data/regulations.ts` 에서 해당 항목의 `appliedVersion`, `appliedEffectiveDate`, `valuesSummary` 를 새 개정에 맞게 올린다. 조문 번호가 바뀌면 `articles`, `watchArticles` 도.
4. §4 검증 명령을 전부 통과시킨다.
5. §5 방식으로 zip 을 만들어 준다. 바꾼 파일과 "무엇이 얼마로 바뀌었는지" 표를 함께 준다.
6. 사용자에게: "zip 덮어쓰기 → push → 법령 관리 탭에서 '확인함'" 세 단계만 안내한다.

절대 하지 말 것: 법을 해석해서 값을 **추정**하지 않는다. 원문에 숫자가 없으면 사용자에게 묻는다. 관련 없는 파일을 정리·리팩터링하지 않는다.

**이 문서도 코드다.** 값이 있는 파일·함수 위치를 옮기거나 이름을 바꿨으면 이 문서 §3 표를 같이 고쳐서 zip 에 넣는다(`docs/regulation-update-manual.md`). 안 그러면 다음 개정 때 이 문서가 거짓말을 한다.

---

## 1. 프로젝트 한 줄

React 19 + Vite + TypeScript + Supabase + Netlify. 저장소 `github.com/aviationwalletos-dotcom/awos`. 사용자는 zip 을 받아 GitHub Desktop 으로 덮어쓰기 → Commit → Push 하면 Netlify 가 자동 배포한다. **zip 은 파일 삭제를 전달하지 못한다** — 지운 파일이 있으면 목록으로 따로 알려준다.

작업 위치: zip 을 `/home/claude/awos` 에 풀어서 작업한다. 최상위 폴더가 `awos/` 로 한 겹 더 있으면 벗긴다.

```bash
cd /home/claude && rm -rf awos && mkdir awos && cd awos && unzip -q /mnt/user-data/uploads/awos-*.zip
# 한 겹 더 있으면: mv awos/* awos/.[!.]* . ; rmdir awos
npm install --no-audit --no-fund --cache /tmp/npmcache2 --legacy-peer-deps
```

---

## 2. 법령 관리 탭이 알려주는 것

관리자 대시보드 → "법령 관리" 탭. 법령 카드마다:
- 상단 배지: 현행 시행일(법령정보센터 API). `appliedEffectiveDate` 보다 새로우면 "개정 있음".
- 노란 띠: **시행 예정** 개정(오늘 이후 시행일). 미리 준비할 것.
- 조문 칩: 우리가 쓰는 조문마다 본문 해시를 마지막 "확인함"과 비교. **빨간 "변경됨" = 그 조문만 읽으면 된다.**
- "확인함": 지금 해시를 기준으로 저장. 코드 반영이 끝난 뒤에 누른다.

---

## 3. 법령 값 ↔ 코드 위치 (이 표가 핵심)

### 3-1. 항공안전법 시행규칙 (국토교통부령)

| 조문 | 법의 내용 (2026-07-01 시행 기준) | 코드 값이 있는 곳 |
|---|---|---|
| **별표 8** 신체검사 유효기간 | 2종: 40세 미만 60개월 / 40~49세 24개월 / 50세 이상 12개월. 1종: 12개월, 6개월 예외(운송·사용사업 60세 이상, 1인 조종 여객운송 40세 이상). 3종: 48/24/12. 만료일은 그 달 말일(비고 1) | `src/data/certificateOptions.ts` → `medicalValidityMonths()` (숫자 60/24/12/48, 6/12, 나이 40/50) · `computeMedicalExpiryDate()` (말일 처리) |
| **제99조③** 항공영어 유효기간 | 4등급 3년 · 5등급 6년 · 6등급 영구 | `src/data/certificateOptions.ts` → `EPTA_VALID_YEARS` |
| **별표 18** 승무시간 (기장 1명 편성) | 24시간 8h · 연속 28일 100h · 365일 1,000h · 휴식: 비행근무 8h 미만 10h, 이상 12h · 7일마다 30h 휴식 | `src/lib/dutyTimeLimits.ts` → `computeDutyTimeLimits()` (`makeCheck(..., 8)`, `daysAgo(today, 27)…100`, `daysAgo(today, 364)…1000`, `requiredRestHours` 10/12) · 라벨: `src/components/logbook/DutyTimeLimitCard.tsx` |
| **제121조** 최근 비행경험(운송·사용사업) | 90일 이착륙 3회 + 야간 1회 | `src/lib/flightReadiness.ts` → `windowDays = commercial ? 90 : 180`, `landingCount >= 3`, `nightLandingCount >= 1` |
| **제125조** 조종교육 비행경험 | 1년 10시간 (② 회복: 동승 야간 이착륙 1회 포함 10시간) | `src/lib/flightReadiness.ts` → `instructorStart = monthsAgo(today, 12)`, `instructorHours >= 10` · 문구 `CurrencyDashboard.tsx` |
| **제78조** 비행시간 산정 | 1인 조종 항공기의 기장 외 조종사 시간 1/2 | `src/lib/eligibility/logTotals.ts` → `sicRaw * 0.5` |
| **제77조** 비행경력 증명 / **별지 제36호** | 비행이 끝날 때마다 기장·감독자 증명 / 서식 열 구성 | `src/lib/flightExperienceRows.ts`(열 배정) · `src/lib/pdf/pilotCertificatePdf.ts`(서식 그리기) |
| **별표 4** 응시경력 | PPL 40h(전문교육기관 35h)·단독 10h·단독 야외 5h·270km / CPL 200h(150h)·PIC 100h(70h)·야외 PIC 20h·540km·계기 10h·야간 5h+이착륙 5회 / 헬기 CPL 150h(100h)·PIC 35h / IR: PIC 야외 50h·계기훈련 40h / 초급 교관 200h+IR / 선임 500h(교관 275h) / ATPL 1,500h·감독하 500h·야외 200h·계기 75h·야간 100h / 시뮬레이터 상한 PPL 5h, CPL 20h(FFS·FTD 20, BATD 5), ATPL 100h(FFS 100, FTD 25, BATD 5) / 타종류 1/3 또는 10h(PPL)·50h(CPL)·200h(ATPL) | `src/lib/eligibility/rules.ts` → 규칙 객체 `ppl-airplane`, `ppl-helicopter`, `cpl-airplane`, `cpl-helicopter`, `atpl-airplane`, `atpl-helicopter`, `mpl`, 계기비행증명·초급·선임 교관 생성 함수, `PPL_SIM/CPL_SIM/IR_SIM`, `PPL_CROSS/CPL_CROSS` 상수. 각 `hours:`/`count:`/`distanceKm:` 값 |
| **제92조③⑤⑥** | ③ 항공전문의 단축 최대 1/2 · ⑤ 1종은 2·3종 겸함 · ⑥ 자가용 IR 은 1종 기준 | `flightReadiness.ts` `medicalValid = class1Valid || class2Valid` · 안내 문구 `CertificateForm.tsx`, `rules.ts`(IR notes) |

### 3-2. 항공안전법 (법률)

| 조문 | 내용 | 코드 |
|---|---|---|
| 제34·35·37·44조 | 자격증명 종류·한정·계기·교관 | 조문 번호 표기만. `src/components/logbook/MyCertificateStatusCard.tsx`, `src/types/certificate.ts` |
| 제36·37조, 제46조①1호 | 한정 없는 등급은 조종연습만 | `flightReadiness.ts` `ratingHeld`, `CurrencyDashboard.tsx` "한정 없음" |
| **제76조② → 제39조의4 (2026-11-13 시행)** | 자격증명서·신체검사증명서 소지 의무. 조문 번호가 바뀐다 | 화면·문서에 "제76조②"라고 쓴 곳을 `grep -rn "76조" src` 로 찾아 "제39조의4"로 |
| 제56조③ | 사업자 승무시간 기록 15개월 보관 | 앱 미사용(문서 참고용) |

### 3-3. 운항기술기준 (국토교통부 고시, 고정익)

| 항 | 내용 | 코드 |
|---|---|---|
| **8.2.2** 최근 비행경험 | 나. 일반 180일 이착륙 3회 / 가. 여객·2인조종 90일 + 야간 1회, 동일 등급 | `flightReadiness.ts` `windowDays`, `byClass` |
| **8.2.3** 계기비행 | 6개월 접근 6회 + 계기비행 6시간, 심사 후 6개월 인정 | `flightReadiness.ts` `ifrStart = monthsAgo(today, 6)`, `approachCount >= 6 && instrumentHours >= 6`, `isWithinMonthsFromToday(instrumentCheckDate, today, 6)` |
| **8.2.4 가** 자격회복 | 교관 동승 2시간·이착륙 3회 | `flightReadiness.ts` `recoveryHint` 문구 |
| **8.1.7.6** 로그북 항목 | 16개 항목 | `src/types/logbook.ts`, `src/components/logbook/EntryForm.tsx` |
| 정의 43 크로스컨트리 | 출발지 외 1개 지점 착륙 | `EntryForm.tsx` InfoTip 문구 |

### 3-4. 적용 버전 기록

`src/data/regulations.ts` — 항목마다 `appliedVersion`(예: '국토교통부령 제1601호 (시행 2026-07-01)'), `appliedEffectiveDate`('2026-07-01'), `valuesSummary`(코드 값 요약 + "[YYYY-MM-DD 원문 대조 완료]"). **코드를 고치면 이 셋을 반드시 같이 올린다.** 조문이 추가·삭제되면 `articles`, `watchArticles`, `annexKeywords` 도.

---

## 4. 검증 (전부 통과해야 zip 을 만든다)

```bash
cd /home/claude/awos
npx tsc --noEmit                         # 타입
npx eslint src --max-warnings=0          # 린트
npx vitest run                           # 단위 테스트(99건 이상). 값 바꾸면 테스트도 같이 고친다: src/lib/eligibility/*.test.ts, src/data/*.test.ts
npx vite build                           # 빌드
npx playwright test --list               # E2E 17건 목록만(브라우저 없음)
```

값을 바꿨는데 테스트가 깨지면 **테스트의 기대값을 새 법령 값으로 고친다**(테스트가 옛 법을 기억하고 있는 것).

---

## 5. zip 만들기 (누적 스냅샷, 영문 파일명, 매번 새 이름)

```bash
cd /home/claude && rm -f /mnt/user-data/outputs/awos-*.zip && \
zip -qr /mnt/user-data/outputs/awos-<버전>-<MMDD>.zip awos \
  -x 'awos/node_modules/*' 'awos/dist/*' 'awos/.git/*' 'awos/test-results/*' 'awos/playwright-report/*'
```

그리고 `UPDATE-v56.md`(저장소 루트, 이어쓰기) 끝에 "무엇이 왜 바뀌었는지" 몇 줄을 붙인다. 형식은 파일 안의 앞 항목들을 따른다.

---

## 6. 답변 형식 (사용자에게)

1. 결론 한 줄: "별표 8 값 3개 바뀌어서 `certificateOptions.ts` 고쳤어요." 
2. 표: 조문 · 전 값 · 후 값 · 파일
3. 검증 결과 한 줄
4. "zip 덮어쓰기 → push → 법령 관리 탭 '확인함'" — 이 세 단계만. 삭제할 파일이 있으면 목록.

---

## 7. 자주 헷갈리는 것

- **"상업" 운항형태의 1종 6개월**: 법은 (운송·사용사업 60세↑) 또는 (1인 조종 여객운송 40세↑) 인데, 앱은 편성 정보가 없어 "상업 40세↑"를 전부 6개월로 보수 적용한다. 개정으로 이 구조가 바뀌면 `medicalValidityMonths` 의 `commercialSinglePilot` 분기.
- **별표 18 은 사업자 의무**: 자가용에는 법정 한도가 없어 카드가 "참고"로 뜬다. 값이 바뀌어도 이 구분은 유지.
- **경량항공기 커런시는 법정 요건 없음**, 초경량은 공단 운영세칙(법령정보센터 API 범위 밖, 수동 확인).
- 조문 번호를 화면에 표기할 때는 **실제 조문 번호**만 쓴다("관련 법령에 따라" 같은 두루뭉술한 표현 금지).
- 문체: 해요체. 화면 문구에 버전 번호·지명(울진 등) 넣지 않는다.
