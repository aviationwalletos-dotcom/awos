# UPDATE v29 — 회원가입 자격 구분 3종 복수 선택 (2026-09-03)

- 가입 폼 "역할(조종사/드론 조종사)" → **"자격 구분(항공기 · 경량항공기 · 초경량)" 복수 선택**. 최소 1개.
- 기존 `individual_role`은 호환용으로 자동 파생(항공기·경량 포함 → pilot, 초경량만 → drone_pilot).
- 저장 경로 3중: ① 가입 메타데이터 `pilot_tracks` → profiles(schema10 적용 시 컬럼 저장, 미적용이면 무시) ② 첫 로그인 시 usePilotTracks가 "개인설정" 게시글에 동기화 ③ 이메일 인증 전 이탈 대비 브라우저 임시 보관(이메일 키) 후 첫 로그인 때 복원·삭제.
- 계정 응답 `data`에 `pilot_tracks`·`birth_date`·`operation_type` 노출(schema10 적용 시).
