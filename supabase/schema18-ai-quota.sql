-- ============================================================================
-- schema18-ai-quota.sql — AI 문서 읽기 하루 한도 (계정당 10회) (2026-09-10)
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run.
-- [왜] 버튼을 반복해서 누르면(실수든 장난이든) API 잔액이 빠진다. 장당 1~3센트라 하루 10회면 하루 최대 30센트/계정.
-- [동작] Netlify 함수 read-document 가 AI 를 부르기 직전에 consume_ai_quota() 를 호출한다.
--        허용이면 count 가 1 오르고, 초과면 false 를 돌려주고 함수는 429 로 막는다.
--        이 SQL 을 아직 안 돌렸으면 함수는 한도 없이 통과시킨다(기능이 멈추지 않게). 실행하면 그때부터 적용.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);
-- insert/update 는 아래 함수(security definer)만 한다.

create or replace function public.consume_ai_quota(p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  used integer;
begin
  if me is null then
    raise exception '로그인이 필요해요.';
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (me, today, 0)
  on conflict (user_id, day) do nothing;

  select count into used from public.ai_usage where user_id = me and day = today for update;

  if used >= p_limit then
    return jsonb_build_object('allowed', false, 'used', used, 'limit', p_limit);
  end if;

  update public.ai_usage set count = used + 1, updated_at = now() where user_id = me and day = today;
  return jsonb_build_object('allowed', true, 'used', used + 1, 'limit', p_limit);
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public;
grant execute on function public.consume_ai_quota(integer) to authenticated;

-- 오래된 기록 정리(선택): 30일 지난 행은 필요 없다. 필요하면 주기적으로 실행.
-- delete from public.ai_usage where day < (now() at time zone 'Asia/Seoul')::date - 30;

-- 확인
select 'ai_usage 테이블(1이어야)' as 항목, count(*)::text as 값
  from information_schema.tables where table_schema = 'public' and table_name = 'ai_usage'
union all
select '한도 함수(1이어야)', count(*)::text from pg_proc where proname = 'consume_ai_quota';
