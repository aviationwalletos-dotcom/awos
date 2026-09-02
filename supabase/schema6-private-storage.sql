-- ============================================================================
-- schema6-private-storage.sql — 비행기록·자격증 본인 전용 저장 구조 (보안 마지막 항목)
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run.
-- [효과]
--   1) 새 테이블 user_logbook_entries / user_certificates: 본인만 읽고 쓸 수 있고,
--      관리자(authorized_orgs)만 추가로 조회 가능. 새로 저장되는 기록은 모두 여기로 감.
--   2) 기존 "비행기록"·"자격증" 게시판 글은 본인 + 관리자만 조회하도록 잠금
--      (다른 회원이 API로 남의 기록을 읽던 구조적 허점 제거).
--   서명 요청·증명서 승인 등 다른 게시판은 기존 그대로 동작한다.

-- 1) 본인 전용 테이블 ---------------------------------------------------------
create table if not exists public.user_logbook_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  app_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);
create table if not exists public.user_certificates (
  user_id uuid not null references auth.users (id) on delete cascade,
  app_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

drop trigger if exists trg_ule_updated on public.user_logbook_entries;
create trigger trg_ule_updated before update on public.user_logbook_entries
  for each row execute function public.set_updated_at();
drop trigger if exists trg_uc_updated on public.user_certificates;
create trigger trg_uc_updated before update on public.user_certificates
  for each row execute function public.set_updated_at();

alter table public.user_logbook_entries enable row level security;
alter table public.user_certificates enable row level security;

drop policy if exists "ule_owner_all" on public.user_logbook_entries;
create policy "ule_owner_all" on public.user_logbook_entries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "ule_admin_select" on public.user_logbook_entries;
create policy "ule_admin_select" on public.user_logbook_entries
  for select to authenticated
  using (exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid()));

drop policy if exists "uc_owner_all" on public.user_certificates;
create policy "uc_owner_all" on public.user_certificates
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "uc_admin_select" on public.user_certificates;
create policy "uc_admin_select" on public.user_certificates
  for select to authenticated
  using (exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid()));

-- 2) 기존 게시판 잠금 ---------------------------------------------------------
-- 비행기록(634956de-…)·자격증(d4df52f6-…) 게시판 글: 본인 + 관리자만 조회.
-- 다른 게시판(서명·승인·상태공유 등)은 종전대로 로그인 회원 모두 조회 가능.
drop policy if exists "bp_select_authenticated" on public.board_posts;
create policy "bp_select_authenticated" on public.board_posts
  for select to authenticated
  using (
    board_id not in ('634956de-9ab1-4417-84c0-088a5d655e20', 'd4df52f6-fd5d-4a19-a252-7a2ffd9e245d')
    or author_id = auth.uid()
    or exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid())
  );

-- 3) 확인 ---------------------------------------------------------------------
select '새 테이블(2여야)' as 항목, count(*)::text as 값
  from information_schema.tables
 where table_schema = 'public' and table_name in ('user_logbook_entries', 'user_certificates')
union all
select '게시판 잠금 정책(1이어야)', count(*)::text
  from pg_policies
 where tablename = 'board_posts' and policyname = 'bp_select_authenticated'
   and qual like '%board_id%';
