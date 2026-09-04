# UPDATE v52 — 기술 부채 1단계: 잔재 제거 · 페이지 분할 (2026-09-04)

검증: 타입 0 · 린트 0 · 테스트 57 · 빌드 통과. **동작 변화 없음** — 파일 구조만 바뀜.

## 1a. 빌더 잔재 제거
- `data-mbaas-oid` / `data-mbaas-dynamic` 속성 **2,064개, 69개 파일**에서 제거. DOM이 가벼워지고 diff가 읽기 쉬워짐.

## 1b. LogbookPage 분할 (1,026줄 → 8파일)
| 파일 | 줄 | 역할 |
|---|---|---|
| `pages/LogbookPage.tsx` | 225 | 레이아웃·헤더·히어로·탭 라우팅 |
| `pages/logbook/useLogbookPageModel.tsx` | 441 | 모든 상태·훅·핸들러 (`LogbookModel` 타입) |
| `pages/logbook/tabs/MyRecordsTab.tsx` | 164 | 비행기록·총계·진척도 |
| `pages/logbook/tabs/CertificatesTab.tsx` | 100 | 자격증 |
| `pages/logbook/tabs/InputTab.tsx` | 69 | 기록 입력·가져오기 |
| `pages/logbook/tabs/WorkLogTab.tsx` | 55 | 업무기록(정비·관제·운항관리) |
| `pages/logbook/tabs/CurrencyTab.tsx` | 34 | 커런시 |
| `pages/logbook/tabs/SignatureInboxTab.tsx` | 18 | 서명 요청함 |
- 각 탭은 `m: LogbookModel` 하나만 받아 필요한 값만 구조분해. 새 탭을 만들거나 고칠 때 해당 파일만 보면 됨.

## 다음
- 2단계: Playwright 핵심 흐름 5개 자동 테스트
- 3단계: 서명·승인을 게시판+댓글 대신 `approval_requests` 테이블로 (기존 데이터는 폐기하기로 함 → 이관 스크립트 불필요)
