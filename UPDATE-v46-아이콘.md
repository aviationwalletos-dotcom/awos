# UPDATE v46 — 앱 아이콘 통일 (2026-09-04)

앱 아이콘을 **방패 + 상승하는 항공기**로 교체. 카카오 동의 화면·홈 화면 설치(PWA)·파비콘·애플 터치 아이콘·스토어 등록에 전부 같은 이미지를 쓴다.

- `public/icons/icon.svg` — 파비콘(벡터, 같은 지오메트리로 생성)
- `public/icons/icon-192.png`, `icon-512.png` — PWA
- `public/icons/icon-512-maskable.png` — 안드로이드 마스커블(안전 영역 80% 안에 배치)
- `public/icons/apple-touch-icon.png` — iOS 홈 화면(180)
- 서비스워커 캐시 v4 (아이콘 갱신)

카카오 디벨로퍼스·구글 OAuth 동의 화면·Play 스토어에는 `outputs/awos-icon/AWOS-앱아이콘-512.png`(사각) 또는 `1024-스토어용.png`를 올린다.
