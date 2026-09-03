# UPDATE v23 — 폼 컨트롤 가시성 (2026-09-03)

`src/index.css` 한 곳에서 처리. 개별 폼 파일은 손대지 않음.

- 모든 입력·select·textarea·button에 `color-scheme: dark` → 달력·시간 선택기·숫자 스피너·드롭다운 팝업이 다크 테마로 그려짐
- 입력칸 테두리 대비 상향(10% → 22%, hover 34%, focus cyan) — 어두운 패널 위에서 칸이 안 보이던 문제
- select 옵션 목록 배경/글자색 지정(브라우저에 따라 color-scheme만으로는 흰 목록이 뜸)
- 숫자 스피너(아워미터·비행시간·분 입력) 항상 표시
- 크롬 자동완성의 흰색/노란 배경 제거
- placeholder 대비 상향
