# Aviation Wallet OS (AWOS)

항공 종사자를 위한 디지털 로그북과 자격 리스크 방어 인프라.
개인은 비행기록·자격을 관리하고, 소속 기관은 구성원의 자격 만료와 GO/NO-GO 상태를 관제한다.

## 기술 스택

- React 19 + TypeScript
- Vite (빌드)
- Tailwind CSS
- React Router (SPA 라우팅)
- 백엔드: Supabase (Seoul 리전) — 인증·DB·스토리지
- 서버리스 함수: Netlify Functions (`netlify/functions/`) — AI 문서 읽기, 법령 변경 감지
- 테스트: Vitest(단위) + Playwright(E2E)

## 로컬에서 실행하기

사전 준비: [Node.js](https://nodejs.org) 20 버전 이상 설치.

```bash
# 표준 npm install 은 자주 실패한다. 아래 옵션을 그대로 쓴다.
npm install --no-audit --no-fund --legacy-peer-deps

npm run dev      # 개발 서버 실행 → 안내되는 http://localhost:5173 접속
```

### 바꾼 뒤 반드시 돌리는 검증 5종

```bash
npx tsc --noEmit                   # 타입
npx eslint src --max-warnings=0    # 린트
npx vitest run                     # 단위 테스트
npm run build                      # 빌드
npx playwright test --list         # E2E 목록(실행은 CI에서)
```

주의: 이 다섯 개가 모두 통과해도 **Tailwind 클래스 이름 오타는 잡히지 않는다.**
Tailwind 는 모르는 클래스를 오류 없이 버린다. 색·배경을 바꾼 뒤에는 화면을 직접 볼 것.

### DB

`supabase/schema*.sql` 을 번호 순서대로 Supabase SQL Editor 에서 실행한다.
새 스키마 파일이 늘어나면 그 파일만 추가로 실행하면 된다.

### 환경변수 (Netlify)

| 이름 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | AI 문서 읽기 (secret 체크) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | 서버리스 함수의 Supabase 접근 |
| `LAW_GO_KR_OC` | 법령정보센터 API |
| `VITE_SENTRY_DSN` | 선택 — 넣으면 오류 모니터링이 켜진다 |

## 배포용 빌드

```bash
npm run build    # dist/ 폴더에 정적 파일 생성
npm run preview  # 빌드 결과를 로컬에서 미리보기
```

## 배포

이 저장소는 Netlify 자동 배포를 위한 `netlify.toml`을 포함한다.
GitHub 저장소를 Netlify에 연결하면, 이후 코드를 푸시할 때마다 자동으로 빌드·배포된다.
자세한 순서는 함께 제공된 배포 안내서(DEPLOY_GUIDE.md)를 참고한다.

## 주요 폴더 구조

```
src/
  components/   화면 구성 요소 (로그북/대시보드/자격/업무기록 등)
  hooks/        상태·데이터 로직 (baas/ 는 백엔드 통신)
  lib/          핵심 유틸 (동기화, 자격 판정 규칙, 재시도 등)
  pages/        라우트별 페이지 (로그인/로그북/대시보드 등)
  types/        타입 정의
  data/         정적 데이터 (기관 목록, 자격 옵션, 법령 목록 등)

supabase/       DB 스키마·RLS 정책 (번호 순서대로 실행)
netlify/        서버리스 함수
e2e/            Playwright E2E 테스트
docs/           기능 설명서
```

## 기록 저장 구조

비행기록·자격증은 **localStorage 가 1차 저장소**이고, Supabase 게시판에 best-effort 로
동기화된다. 조회 범위는 RLS 로 본인 + 관리자에게만 열려 있다(`supabase/schema9`, `schema24`).
같은 계정을 두 기기에서 동시에 쓰면 마지막 수정이 이긴다.
