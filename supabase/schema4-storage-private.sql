-- ============================================================================
-- schema4-storage-private.sql — 첨부파일 저장소 비공개 전환 (SEC-003)
-- ============================================================================
-- [실행 방법] Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run.
-- [실행 시점] 반드시 앱 코드 배포(useSignedFileUrl 적용 버전) "이후"에 실행할 것.
--   순서가 바뀌면 배포 전 구버전 화면에서 서명 이미지가 잠시 안 보일 수 있다(데이터 손실은 없음).
--
-- [무엇이 바뀌나]
-- 기존: board-files 버킷이 공개 읽기 → URL만 알면 로그인 없이 누구나 이미지 열람 가능.
-- 이후: 버킷 비공개 + 로그인 사용자에게만 읽기 허용. 앱은 표시 시점에 1시간짜리
--        서명 URL(signed URL)을 발급해 보여준다(코드의 useSignedFileUrl 훅).

-- 1) 버킷 자체를 비공개로 전환 (public URL 무력화)
update storage.buckets set public = false where id = 'board-files';

-- 2) 공개 읽기 정책 제거
drop policy if exists "board_files_public_read" on storage.objects;

-- 3) 로그인 사용자 읽기 허용 (서명 URL 발급에 필요)
--    ※ 2단계(정규 테이블 이전) 때 "관련 당사자만"으로 더 좁힐 예정.
drop policy if exists "board_files_auth_read" on storage.objects;
create policy "board_files_auth_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'board-files');

-- 4) 확인: public 컬럼이 false여야 한다.
--   select id, public from storage.buckets where id = 'board-files';
