-- ============================================================================
-- schema15-contact-identities.sql — 가입 전 이메일 확인이 "연결된 로그인 방법"의 이메일까지 보게 한다
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run.
--
-- 배경: 카카오·구글로 연결된 이메일(auth.identities)은 계정 이메일(auth.users.email)과 다를 수 있다.
--   예) 계정 이메일 wogjs1118@gmail.com, 카카오 연결 이메일 enomis1234@naver.com
--   Supabase 는 연결 이메일도 "이미 사용 중"으로 보고 가입을 막는데, 우리 확인 함수는 계정 이메일만 봐서
--   가입 버튼을 누른 뒤에야 애매한 화면이 떴다. 이제 즉시 "이미 가입된 이메일 · 그 방법으로 로그인" 안내가 뜬다.
--
-- [되돌리기] schema13 의 contact_exists 를 다시 실행.

-- 반환: email_taken / phone_taken / email_providers(그 이메일이 묶인 로그인 방법: 'email' | 'google' | 'kakao' ...)
drop function if exists public.contact_exists(text, text);
create or replace function public.contact_exists(p_email text default null, p_phone text default null)
returns table (email_taken boolean, phone_taken boolean, email_providers text[])
language sql
stable
security definer
set search_path = public
as $$
  with providers as (
    -- 이메일·비밀번호 계정(계정 이메일이 일치하고 email identity 가 있는 경우) + 소셜 연결 이메일
    select distinct i.provider
      from auth.identities i
      join auth.users u on u.id = i.user_id
     where p_email is not null and trim(p_email) <> ''
       and (
         lower(coalesce(i.identity_data ->> 'email', '')) = lower(trim(p_email))
         or (i.provider = 'email' and lower(u.email) = lower(trim(p_email)))
       )
  )
  select
    (exists (select 1 from providers))
    or coalesce((
      select true from auth.users u
       where p_email is not null and trim(p_email) <> ''
         and lower(u.email) = lower(trim(p_email))
       limit 1
    ), false) as email_taken,
    coalesce((
      select true from public.profiles pr
       where public.normalize_phone(p_phone) is not null
         and public.normalize_phone(pr.phone) = public.normalize_phone(p_phone)
       limit 1
    ), false)
    or
    coalesce((
      select true from auth.users u
       where public.normalize_phone(p_phone) is not null
         and public.normalize_phone(u.raw_user_meta_data ->> 'phone') = public.normalize_phone(p_phone)
         and not exists (select 1 from public.profiles pr2 where pr2.id = u.id)
       limit 1
    ), false) as phone_taken,
    coalesce((select array_agg(provider order by provider) from providers), '{}'::text[]) as email_providers
$$;
revoke all on function public.contact_exists(text, text) from public;
grant execute on function public.contact_exists(text, text) to anon, authenticated;

-- 확인: 연결 이메일로 물으면 true 가 나와야 한다(예시는 실제 값으로 바꿔서)
-- select * from public.contact_exists('enomis1234@naver.com', null);
select '확인 함수(1이어야)' as 항목, count(*)::text as 값
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'contact_exists';
