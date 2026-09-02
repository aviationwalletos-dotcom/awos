-- ============================================================================
-- schema7-account-deletion.sql — 회원 탈퇴(계정 자체 삭제) 기능
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run.
-- [효과] 로그인한 사용자가 앱에서 "회원 탈퇴"를 누르면 자신의 auth 계정을 삭제한다.
--        profiles / user_logbook_entries / user_certificates / board_posts 등
--        auth.users를 참조하는 데이터는 on delete cascade로 함께 삭제된다.
--        (Google Play의 "앱 내 계정 삭제" 요건 대응)

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- 확인: 1이 나오면 성공
select '탈퇴 함수(1이어야)' as 항목, count(*)::text as 값
  from pg_proc where proname = 'delete_my_account';
