# UPDATE v2.9k — react-router 7 · 정리 (2026-09-13)

v2.9j 까지 포함해요. **SQL 없어요.**

---

## 1. react-router 6.30.6 → 7.18.3 ✅

`npm audit` 의 moderate 2건이 사라졌어요.

```
전: 3 vulnerabilities (2 moderate, 1 high)
후: 1 high severity vulnerability        ← xlsx 만 남음
```

### 왜 안전했나
쓰는 API 가 여섯 개뿐이에요 — `BrowserRouter` · `Link` · `Route` · `Routes` ·
`Navigate` · `useNavigate`. 전부 v7 에 그대로 있어요. 라우트도 중첩 없는 **평면 10개**고,
데이터 라우터(`createBrowserRouter`·`loader`·`action`)를 안 써요. v7 의 주요 파괴적 변경이
대부분 그 영역이라 해당 사항이 없어요. React 19 · Node 20 이라 요구사항도 이미 충족해요.

`package.json` 과 `package-lock.json` 이 **같이** 갱신됐어요. 이번엔 lock 을 반드시
함께 커밋해 주세요.

### ⚠️ 이건 꼭 눈으로 확인해 주세요
컨테이너에 브라우저가 없어서 **E2E 를 실행하지 못했어요.** tsc·eslint·단위테스트·빌드는
전부 통과하지만, 라우팅 회귀는 그 넷이 못 잡는 영역이에요.

배포 뒤 이 경로들만 눌러봐 주세요.

| 확인 | 경로 |
|---|---|
| 첫 화면 → 로그인 | `/` → `/login` |
| 카카오 로그인 복귀 | `/auth/callback` |
| 로그북 · 대시보드 · 계정 | 헤더 로고 클릭 |
| 문의 | `/inquiry` |
| 비밀번호 재설정 메일 링크 | `/reset-password` |
| 새로고침 (SPA 폴백) | 아무 화면에서 F5 |

매일 05:00 KST E2E 20건이 돌아서 내일 아침이면 자동으로도 확인돼요. 다만 그전에
한 번 눌러보시는 게 빨라요.

**되돌리기:** `package.json` 의 `"react-router-dom": "^7.18.3"` 을 `"^6.8.0"` 으로 바꾸고
`npm install --no-audit --no-fund --legacy-peer-deps` 하면 돼요.

---

## 2. 파일 정리 → `DELETE-LIST-0913.md`

zip 은 삭제를 전하지 못해서 따로 정리했어요. 두 개예요.

- **`.DS_Store`** — `.gitignore` 에 있는데 그 전에 커밋돼서 계속 남아요
- **`UPDATE-理쒖쥌-0904.md`** — 한글 파일명이 깨진 중복본. 원본 `UPDATE-최종-0904.md` 는 멀쩡해요

나머지 한글 파일명 16개는 **그대로 둬요.** 전부 루트의 `.md` 라 빌드를 안 타고 인코딩도
정상이에요. 자세한 건 `DELETE-LIST-0913.md` 에 적어 뒀어요.

---

## 3. 저장소 비공개 — 대표님이 하셔야 해요

GitHub 설정이라 제가 못 해요.

```
github.com/aviationwalletos-dotcom/awos
→ Settings → 맨 아래 Danger Zone → Change repository visibility → Make private
```

**왜 지금 하는 게 좋냐**
- UPDATE 문서들이 내부 진단·미해결 위험·법 해석을 그대로 담고 있어요
- 인수인계 문서에 Supabase 프로젝트 id, 게시판 id, 운영 이메일이 있어요
- GitHub 은 **공개** 저장소가 60일 조용하면 스케줄 워크플로를 자동으로 꺼요.
  그러면 매일 E2E 가 멈추고 → Supabase 가 7일 유휴로 정지돼요

**주의:** 비공개로 바꿔도 같은 60일 규정을 적용받는다는 보고가 있어요.
**45일쯤마다 커밋 하나** 넣는 알림을 따로 걸어 두세요.

---

## 4. xlsx — **안 했어요.** 이유를 읽어 주세요

"다 하자"고 하셨지만 이건 하지 않는 게 낫다고 판단했어요. 근거를 드릴게요.

### 상황
npm 의 `xlsx` 는 0.18.5 에서 멈춰 있어요. SheetJS 가 npm 을 떠났거든요.
그래서 `npm audit` 이 high 로 잡고 "No fix available" 이라고 해요.

### 길이 셋인데 셋 다 문제가 있어요

**① 공식 CDN 판 (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`)**
정답이지만 제가 못 해요. 컨테이너에서 `cdn.sheetjs.com` 이 막혀 있어요(403).
설치를 못 하니 `package-lock.json` 을 갱신할 수 없고, **lock 과 package.json 이 어긋나면
Netlify 빌드가 깨져요.** 라이브 사이트가 내려가요.

**② `@e965/xlsx@0.20.3` (npm 에 있는 재배포판)**
설치도 되고 검증도 할 수 있어요. 그런데 **출처를 확인할 수 없어요.**
패키지 메타데이터에 `author: "sheetjs"`, `homepage: sheetjs.com` 이라고 적혀 있지만
그건 원본에서 복사한 값일 뿐이고, 실제 배포 주체는 `@e965` 라는 제3자 스코프예요.
공식 tarball 과 바이트 비교를 하려 해도 CDN 이 막혀서 못 해요.

**알려진 취약점이 있는 공식 패키지**를 **출처를 검증할 수 없는 재배포판**으로 바꾸는 건
K-EPL 같은 기관 협업을 앞둔 프로젝트에서 오히려 설명하기 어려워져요.

**③ 그대로 두기** ← 지금 선택

### 그대로 둬도 되는 근거
- 파싱이 **브라우저에서만** 일어나요(`LegacyExcelImport.tsx:358`, 동적 import). 서버·DB 무관
- 위험 범위는 **파일을 연 본인의 탭 하나**
- 사용자가 **자기 탈론 파일**을 올리는 구조예요. 남이 보낸 수상한 엑셀을 여는 흐름이 아니에요

### 미팅 뒤에 하실 순서 (Node 가 있는 컴퓨터에서)
```bash
# 1) package.json 의 xlsx 줄을 아래로 교체
#    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"

# 2) lock 갱신 — 이게 성공해야만 다음으로
npm install --no-audit --no-fund --legacy-peer-deps

# 3) 검증
npx tsc --noEmit && npm run build && npx vitest run

# 4) 실제 탈론 파일로 엑셀 가져오기 한 번

# 5) package.json 과 package-lock.json 을 반드시 같이 커밋
```
2번이 실패하면 `package.json` 을 되돌리면 끝이에요. 아무것도 안 깨져요.

---

## 검증

```
npx tsc --noEmit                  통과
npx eslint src --max-warnings=0   통과
npx vitest run                    114 통과
npm run build                     통과
npx playwright test --list        20건 (실행은 못 함 — 브라우저 없음)
npm audit                         3건 → 1건 (xlsx 만 남음)
```

---

## 대표님이 하실 일

1. zip 덮어쓰기 → Commit → Push (**`package-lock.json` 같이 커밋 확인**)
2. 배포 뒤 **위 라우팅 표 6가지 클릭** ← 이번엔 이게 제일 중요해요
3. `DELETE-LIST-0913.md` 의 파일 2개 삭제
4. GitHub Settings → 저장소 비공개 + 45일 알림
5. v2.9j 확인 못 하셨으면 같이: 서명된 기록 상세에서 **교관 서명 그림**이 보이는지
