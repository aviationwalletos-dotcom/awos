-- ============================================================================
-- schema8-admin-emails.sql — 관리자 구성원 상세(이메일) 조회 함수
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run.
-- [효과] authorized_orgs에 등록된 관리자만 회원들의 가입 이메일을 조회할 수 있다.
--        (구성원 현황에서 이름 클릭 → 상세 정보에 계정 이메일 표시)

create or replace function public.admin_member_emails()
returns table (id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email::text
    from auth.users u
   where exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid());
$$;

revoke all on function public.admin_member_emails() from public;
grant execute on function public.admin_member_emails() to authenticated;

select '이메일 함수(1이어야)' as 항목, count(*)::text as 값
  from pg_proc where proname = 'admin_member_emails';
