-- ============================================================================
-- schema9-inquiry-privacy.sql — 문의 게시판 개인정보 보호 (본인 + 관리자만 조회)
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run. (schema6 정책을 문의 게시판까지 확장해 재생성)

drop policy if exists "bp_select_authenticated" on public.board_posts;
create policy "bp_select_authenticated" on public.board_posts
  for select to authenticated
  using (
    board_id not in (
      '634956de-9ab1-4417-84c0-088a5d655e20',  -- 비행기록
      'd4df52f6-fd5d-4a19-a252-7a2ffd9e245d',  -- 자격증
      '8c4d2f6a-1b3e-4a7c-9d05-2e6f8a1b4c7d'   -- 문의
    )
    or author_id = auth.uid()
    or exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid())
  );

select '게시판 잠금(3개 보드)' as 항목,
       (qual like '%8c4d2f6a%')::text as 문의포함
  from pg_policies
 where tablename = 'board_posts' and policyname = 'bp_select_authenticated';
