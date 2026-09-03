# UPDATE v41 — PDF 직접 생성 (2026-09-04)

브라우저 인쇄 대화상자에 기대던 방식을 버리고 앱이 **PDF 파일을 직접 만들어 저장**합니다.
웹·iOS Safari·홈 화면 앱·(향후) 네이티브 앱에서 같은 코드로 동작합니다.

## 용량 전략
| 항목 | 크기 | 언제 내려받나 |
|---|---|---|
| 초기 앱 번들 | 변화 없음 (562KB / gzip 162KB) | 로그인 시 |
| PDF 엔진(pdf-lib + fontkit) | gzip 509KB | **PDF 버튼을 처음 누를 때 1회**, 이후 서비스워커 캐시 |
| 한글 폰트 `/fonts/awos-kr.ttf` | 369KB / gzip 182KB | 같은 시점 1회, 이후 캐시 |
| 결과 PDF | 별지 36호 70건 3페이지 **65KB**, 별지 2호 12건 **26KB** | 문서에 쓰인 글자만 서브셋 임베드 |

- 폰트는 Noto Sans CJK KR을 **KS X 1001 완성형 2,350자 + 라틴·기호**로 서브셋(원본 16MB → 369KB). 완성형 밖 희귀 한글은 □로 표시.
- pdf-lib 서브셋 임베드가 CFF(OTF)에서 깨지는 문제가 있어 TrueType으로 변환하고 글리프를 4바이트 정렬했습니다(`public/fonts/` 생성 절차는 코드 주석 참조).

## 저장 경로 (CSV도 동일)
`lib/ui/saveFile.ts` — iOS·홈 화면 앱에서는 **공유 시트**("파일에 저장"·에어드랍·메일), 그 외는 일반 다운로드. `<a download>`가 iOS PWA에서 불안정하던 문제 해결.

## 구조
- `lib/pdf/pdfCore.ts` — 엔진(표·페이지 넘김·초안 배지·페이지 번호)
- `lib/pdf/pilotCertificatePdf.ts` — 별지 제36호 (23열, 머리글 4단, 페이지마다 반복)
- `lib/pdf/ultralightCertificatePdf.ts` — 별지 제2호 (무인/유인 열 차이, 인증 만료 제외)
- `lib/flightExperienceRows.ts` — 행 계산 공유
- HTML 인쇄 모듈 4개 삭제. 버튼은 "비행경력증명서 PDF 저장", 진행 토스트 표시.
