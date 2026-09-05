-- ============================================================================
-- schema14-hardening.sql — 배포 전 보안 보강 (2026-09-05)
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run. 기존 데이터는 건드리지 않는다.
--
-- 1) approval_requests 의 요청자 이름·이메일을 서버가 강제로 채운다
--    (클라이언트가 다른 사람 이름을 넣어 관리자·교관을 속이는 것 방지)
-- 2) 저장소(board-files) 읽기를 본인 파일 · 관리자 · 서명 이미지로 제한한다
--    (지금까지는 로그인한 누구나 URL만 알면 다른 회원의 자격증 사진을 볼 수 있었다)
-- 3) 승인 교관 목록에서 이메일을 뺀다(학생 드롭다운에는 이름·소속이면 충분)
--
-- [되돌리기]
--   drop trigger if exists trg_approval_requests_identity on public.approval_requests;
--   drop function if exists public.approval_requests_force_identity();
--   drop policy if exists "board_files_scoped_read" on storage.objects;
--   create policy "board_files_auth_read" on storage.objects for select to authenticated using (bucket_id = 'board-files');
--   (list_approved_instructors 는 schema12 버전으로 다시 만들면 된다)

-- 1) 요청자 신원 강제 ------------------------------------------------------------
create or replace function public.approval_requests_force_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_email text;
begin
  select p.name into v_name from public.profiles p where p.id = new.requester_id;
  select u.email into v_email from auth.users u where u.id = new.requester_id;
  new.requester_name := coalesce(nullif(trim(v_name), ''), nullif(trim(new.requester_name), ''), '회원');
  new.requester_email := v_email;
  return new;
end;
$$;
drop trigger if exists trg_approval_requests_identity on public.approval_requests;
create trigger trg_approval_requests_identity before insert on public.approval_requests
  for each row execute function public.approval_requests_force_identity();

-- 2) 저장소 읽기 범위 --------------------------------------------------------------
-- 본인이 올린 파일 / 관리자 / 서명 이미지(파일명이 -signature.png 로 끝남: 학생이 교관 서명을 봐야 하므로)
drop policy if exists "board_files_auth_read" on storage.objects;
drop policy if exists "board_files_scoped_read" on storage.objects;
create policy "board_files_scoped_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'board-files'
    and (
      owner = auth.uid()
      or owner_id = auth.uid()::text
      or public.is_awos_admin()
      or name like '%-signature.png'
    )
  );

-- 3) 승인 교관 목록(이메일 제외) ------------------------------------------------------
drop function if exists public.list_approved_instructors();
create or replace function public.list_approved_instructors()
returns table (
  user_id uuid,
  name text,
  track text,
  affiliation text,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.requester_id, r.requester_name, r.track, r.affiliation, r.decided_at
    from public.approval_requests r
   where r.kind = 'instructor' and r.status = 'approved'
     and auth.uid() is not null
$$;
revoke all on function public.list_approved_instructors() from public;
grant execute on function public.list_approved_instructors() to authenticated;

-- 4) 확인 ---------------------------------------------------------------------
select '신원 트리거(1이어야)' as 항목, count(*)::text as 값
  from pg_trigger where tgname = 'trg_approval_requests_identity'
union all
select '저장소 읽기 정책(scoped 1 · auth_read 0이어야)', string_agg(policyname, ', ')
  from pg_policies where tablename = 'objects' and policyname like 'board_files_%read%'
union all
select '교관 목록 함수(1이어야)', count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'list_approved_instructors';
