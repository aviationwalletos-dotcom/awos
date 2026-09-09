-- ============================================================================
-- schema16-regulation-checks.sql — 관리자 "법령 관리" 탭의 확인 기록 (2026-09-09)
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run.
-- 법령별로 "마지막으로 최신 여부를 확인한 시각·확인자·메모·확인 당시 시행일"을 남긴다. 관리자만 읽고 쓴다.

create table if not exists public.regulation_checks (
  regulation_id text primary key,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id) on delete set null,
  checked_by_name text,
  latest_effective_date text,
  note text
);
alter table public.regulation_checks enable row level security;
drop policy if exists "regulation_checks_admin_all" on public.regulation_checks;
create policy "regulation_checks_admin_all" on public.regulation_checks
  for all to authenticated
  using (public.is_awos_admin())
  with check (public.is_awos_admin());

select '테이블(1이어야)' as 항목, count(*)::text as 값
  from information_schema.tables where table_schema = 'public' and table_name = 'regulation_checks';
