-- ============================================================================
-- AWOS — Supabase 스키마 2탄: 게시판 호환 계층 + 스토리지
-- ============================================================================
-- 사용법: SQL Editor → New query → 전체 붙여넣고 Run (1탄 schema.sql 실행 후에)
--
-- 배경: 앱 훅 31개는 "게시판에 JSON 게시글" 모양으로 서버와 통신한다. 1단계 이전에서는
-- 이 모양을 그대로 받아주는 호환 테이블(board_posts/board_comments)로 무중단 전환하고,
-- 2단계에서 schema.sql의 정규화 테이블로 옮기며 도메인별 엄격 RLS로 좁힌다.
--
-- 보안 수준: 조회는 "로그인한 사용자 전원"(구 aiapp은 비로그인 전체 공개였음 → 강화),
-- 작성/수정/삭제는 작성자 본인만. 완전한 도메인별 잠금은 2단계에서.
-- ============================================================================

-- 프로필에 전화번호 컬럼 추가 (가입 폼 항목)
alter table public.profiles add column if not exists phone text;

-- ---------------------------------------------------------------------------
-- 게시글 (aiapp 동적 게시판 호환)
-- ---------------------------------------------------------------------------
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id text not null,                        -- config.ts의 게시판 상수 8종을 그대로 사용
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null,
  title text not null default '',
  content text,
  is_hidden boolean not null default false,
  attachments jsonb not null default '[]',       -- [{id, file_name, url}]
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_board_posts_board_created on public.board_posts (board_id, created_at desc);
create index if not exists idx_board_posts_author on public.board_posts (author_id);
drop trigger if exists trg_board_posts_updated on public.board_posts;
create trigger trg_board_posts_updated before update on public.board_posts
  for each row execute function public.set_updated_at();

alter table public.board_posts enable row level security;

drop policy if exists "bp_select_authenticated" on public.board_posts;
create policy "bp_select_authenticated" on public.board_posts
  for select to authenticated using (true);
drop policy if exists "bp_insert_own" on public.board_posts;
create policy "bp_insert_own" on public.board_posts
  for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "bp_update_own" on public.board_posts;
create policy "bp_update_own" on public.board_posts
  for update to authenticated using (auth.uid() = author_id);
drop policy if exists "bp_delete_own" on public.board_posts;
create policy "bp_delete_own" on public.board_posts
  for delete to authenticated using (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- 댓글 (서명 완료/승인·반려 표시 [SIGNED]/[APPROVED]/[REJECTED] 워크플로우용)
-- ---------------------------------------------------------------------------
create table if not exists public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null,
  content text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_board_comments_post on public.board_comments (post_id, created_at);
drop trigger if exists trg_board_comments_updated on public.board_comments;
create trigger trg_board_comments_updated before update on public.board_comments
  for each row execute function public.set_updated_at();

alter table public.board_comments enable row level security;

drop policy if exists "bc_select_authenticated" on public.board_comments;
create policy "bc_select_authenticated" on public.board_comments
  for select to authenticated using (true);
-- 댓글은 타인 게시글에도 달 수 있어야 한다(교관 서명, 기관 승인) — 단 author는 본인만
drop policy if exists "bc_insert_own_author" on public.board_comments;
create policy "bc_insert_own_author" on public.board_comments
  for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "bc_update_own" on public.board_comments;
create policy "bc_update_own" on public.board_comments
  for update to authenticated using (auth.uid() = author_id);
drop policy if exists "bc_delete_own" on public.board_comments;
create policy "bc_delete_own" on public.board_comments
  for delete to authenticated using (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- 스토리지: 첨부파일 버킷 (서명 이미지, 증명서 사진)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('board-files', 'board-files', true)
on conflict (id) do nothing;

drop policy if exists "board_files_public_read" on storage.objects;
create policy "board_files_public_read" on storage.objects
  for select using (bucket_id = 'board-files');
drop policy if exists "board_files_auth_insert" on storage.objects;
create policy "board_files_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'board-files');

-- ============================================================================
-- 끝. Table Editor에 board_posts / board_comments가 추가되면 성공입니다.
-- ============================================================================
