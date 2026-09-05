-- ============================================================================
-- schema13-unique-contact.sql — 전화번호 1개 = 계정 1개, 가입 전 이메일·전화번호 중복 확인
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run.
--
-- [결정 2026-09-05]
--   같은 사람이 계정을 여러 개 만드는 것을 줄이기 위해 전화번호를 계정당 하나로 제한한다.
--   전화번호는 SMS 인증 없이 입력받는 값이라 "남의 번호 입력"까지는 못 막는다(실사용자 테스트 뒤 SMS 인증 검토).
--   이메일은 Supabase Auth 가 이미 계정 단위로 유일하게 관리한다 — 여기서는 가입 전에 "이미 가입된 이메일"을
--   친절하게 알려주기 위한 확인 함수만 둔다.
--
-- [주의] 이미 같은 전화번호를 쓰는 계정이 2개 이상이면 유니크 인덱스를 만들지 않고 목록만 보여준다.
--        (아래 확인 표의 "전화번호 중복 그룹"을 정리한 뒤 이 파일을 다시 실행하면 인덱스가 생긴다.)
--
-- [되돌리기]
--   drop index if exists public.profiles_phone_unique_idx;
--   drop function if exists public.contact_exists(text, text);
--   drop function if exists public.normalize_phone(text);

-- 1) 전화번호 정규화: 숫자만 남긴다. '010-1234-5678' = '01012345678'
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '')
$$;

-- 2) 가입 전 중복 확인(익명 호출 허용). 존재 여부(true/false)만 돌려주고 누구인지는 알려주지 않는다.
create or replace function public.contact_exists(p_email text default null, p_phone text default null)
returns table (email_taken boolean, phone_taken boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
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
    -- 인증 메일을 기다리는 중이라 아직 프로필이 없는 계정의 가입 번호(메타데이터)도 본다.
    -- (A가 가입 후 인증 전인 사이에 B가 같은 번호로 가입하는 틈을 막는다. 프로필이 생긴 계정은 위 조건이 담당.)
    coalesce((
      select true from auth.users u
       where public.normalize_phone(p_phone) is not null
         and public.normalize_phone(u.raw_user_meta_data ->> 'phone') = public.normalize_phone(p_phone)
         and not exists (select 1 from public.profiles pr2 where pr2.id = u.id)
       limit 1
    ), false) as phone_taken
$$;
revoke all on function public.contact_exists(text, text) from public;
grant execute on function public.contact_exists(text, text) to anon, authenticated;

-- 3) 전화번호 유니크 인덱스(중복이 없을 때만 생성)
do $$
declare
  dup_count int;
begin
  select count(*) into dup_count
    from (
      select public.normalize_phone(phone) as k
        from public.profiles
       where public.normalize_phone(phone) is not null
       group by 1
      having count(*) > 1
    ) d;
  if dup_count > 0 then
    raise notice 'profiles.phone 중복 그룹 %건 — 정리 후 이 파일을 다시 실행하세요(아래 확인 표 참고).', dup_count;
  else
    execute 'create unique index if not exists profiles_phone_unique_idx
               on public.profiles (public.normalize_phone(phone))
            where public.normalize_phone(phone) is not null';
  end if;
end $$;

-- 4) 확인 ---------------------------------------------------------------------
-- 인덱스가 생겼는지(1이어야) + 중복 그룹 목록(비어 있어야)
select '전화번호 유니크 인덱스(1이어야)' as 항목, count(*)::text as 값
  from pg_indexes where schemaname = 'public' and indexname = 'profiles_phone_unique_idx'
union all
select '중복 전화번호 → 계정들',
       coalesce(string_agg(k || ' : ' || emails, ' | '), '(없음)')
  from (
    select public.normalize_phone(pr.phone) as k,
           string_agg(coalesce(u.email, pr.id::text), ', ') as emails
      from public.profiles pr
      left join auth.users u on u.id = pr.id
     where public.normalize_phone(pr.phone) is not null
     group by 1
    having count(*) > 1
  ) d;
