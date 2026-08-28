# Aviation Wallet OS (AWOS)

항공 종사자를 위한 디지털 로그북과 자격 리스크 방어 인프라.
개인은 비행기록·자격을 관리하고, 소속 기관은 구성원의 자격 만료와 GO/NO-GO 상태를 관제한다.

## 기술 스택

- React 19 + TypeScript
- Vite (빌드)
- Tailwind CSS
- React Router (SPA 라우팅)
- 백엔드: 현재는 aiapp BaaS 프록시 사용 (추후 Supabase로 이전 예정)

## 로컬에서 실행하기

사전 준비: [Node.js](https://nodejs.org) 20 버전 이상 설치.

```bash
npm install      # 의존성 설치 (최초 1회)
npm run dev      # 개발 서버 실행 → 안내되는 http://localhost:5173 접속
```

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
  data/         정적 데이터 (기관 목록, 자격 옵션 등)
```
