-- AWOS schema11 — 이메일 로그인(비밀번호) 설정 여부 조회
--
-- 배경:
--   소셜(구글·카카오) 계정에 비밀번호를 설정해도 GoTrue 는
--     · identities 에 email identity 를 만들지 않고
--     · app_metadata.providers 에도 'email' 을 추가하지 않는다.
--   비밀번호는 auth.users.encrypted_password 에만 저장되는데 이 컬럼은
--   /auth/v1/user 응답에 포함되지 않는다. 그래서 계정정보 화면의
--   "이메일 미연결" 배지가 실제로 연결된 뒤에도 계속 미연결로 남아 있었다.
--
-- 이 함수는 본인(auth.uid()) 계정에 대해서만 true/false 를 돌려준다.
-- 비밀번호 값이나 해시는 절대 노출하지 않는다.

create or replace function public.has_email_login()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select u.encrypted_password is not null
         and u.encrypted_password <> ''
         and u.email is not null
        from auth.users u
       where u.id = auth.uid()
    ),
    false
  )
$$;

revoke all on function public.has_email_login() from public;
revoke all on function public.has_email_login() from anon;
grant execute on function public.has_email_login() to authenticated;

comment on function public.has_email_login() is
  'AWOS: 현재 로그인한 계정에 이메일+비밀번호 로그인이 설정돼 있는지 여부. 계정 이메일이 없으면 false.';
