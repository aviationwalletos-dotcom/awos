-- schema24 — 게시판 비공개 범위 확대 (2026-09-13)
-- [실행] Supabase → SQL Editor → Run.
--
-- [문제 1] schema9 가 잠근 게시판은 비행기록·자격증·문의 3개뿐이었다.
--   업무기록(2966212a…)·개인설정(bf6c2b9a…) 은 bp_select_authenticated 의 not in 목록에 없어서,
--   로그인한 회원이면 누구나 REST API 로 남의 글을 읽을 수 있었다.
--   - 업무기록: 정비사·관제사·운항관리사의 업무 내역
--   - 개인설정: 소속 기관, 개인 역할, 계기비행심사 이수일, 조종교육증명 최초취득일,
--               교관 커런시 회복 자기신고
--
-- [문제 2] board_comments 의 조회 정책이 `using (true)` 였다.
--   문의 게시글 자체는 schema9 로 잠갔지만 관리자가 다는 "답변"은 댓글로 저장된다
--   (InquiryAdminPanel 이 쓰고 InquiryPage 가 읽는다). 그래서 글은 안 보이는데
--   답변은 전원이 읽을 수 있는 상태였다.
--
-- [방침] 댓글은 "부모 게시글을 볼 수 있는 사람만" 볼 수 있게 한다. 게시글 정책과 같은 조건을
--   댓글 정책 안에 그대로 다시 쓴다. board_posts 의 RLS 에 기대지 않는 이유는, 정책 표현식
--   안의 하위 질의에 RLS 가 적용되지 않는 환경이 생기면 정책이 조용히 무력화되기 때문이다.
--
-- 상태공유 게시판(b7c87a0e…)은 의도된 공유라 잠그지 않는다.

-- ---------------------------------------------------------------------------
-- 1. 게시글 — 잠금 대상을 3개 → 5개로
-- ---------------------------------------------------------------------------
drop policy if exists "bp_select_authenticated" on public.board_posts;
create policy "bp_select_authenticated" on public.board_posts
  for select to authenticated
  using (
    board_id not in (
      '634956de-9ab1-4417-84c0-088a5d655e20',  -- 비행기록
      'd4df52f6-fd5d-4a19-a252-7a2ffd9e245d',  -- 자격증
      '8c4d2f6a-1b3e-4a7c-9d05-2e6f8a1b4c7d',  -- 문의
      '2966212a-877c-4964-a927-18e40802b32d',  -- 업무기록   (schema24 추가)
      'bf6c2b9a-b210-4c3f-a1ad-9bcd06805270'   -- 개인설정   (schema24 추가)
    )
    or author_id = auth.uid()
    or exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. 댓글 — 부모 게시글을 볼 수 있는 사람만
-- ---------------------------------------------------------------------------
-- 내가 쓴 댓글은 언제나 보인다(or author_id = auth.uid()).
-- 문의 흐름 확인:
--   · 문의 작성자 → 본인 글이므로 답변 댓글도 보임
--   · 관리자(authorized_orgs) → 모든 글이 보이므로 답변도 보임
--   · 그 밖의 회원 → 글이 안 보이므로 답변도 안 보임
drop policy if exists "bc_select_authenticated" on public.board_comments;
create policy "bc_select_authenticated" on public.board_comments
  for select to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1
        from public.board_posts p
       where p.id = board_comments.post_id
         and (
           p.board_id not in (
             '634956de-9ab1-4417-84c0-088a5d655e20',  -- 비행기록
             'd4df52f6-fd5d-4a19-a252-7a2ffd9e245d',  -- 자격증
             '8c4d2f6a-1b3e-4a7c-9d05-2e6f8a1b4c7d',  -- 문의
             '2966212a-877c-4964-a927-18e40802b32d',  -- 업무기록
             'bf6c2b9a-b210-4c3f-a1ad-9bcd06805270'   -- 개인설정
           )
           or p.author_id = auth.uid()
           or exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid())
         )
    )
  );

-- 하위 질의가 post_id 로 board_posts 를 매번 찾으므로 기본키 인덱스로 충분하지만,
-- 댓글 목록 조회가 post_id 기준이라 기존 인덱스(idx_board_comments_post)도 그대로 쓰인다.

-- ---------------------------------------------------------------------------
-- 3. 확인 — 아래 3줄이 모두 true 여야 한다
-- ---------------------------------------------------------------------------
select '게시글: 업무기록 잠김' as 항목,
       (qual like '%2966212a%')::text as 결과
  from pg_policies
 where tablename = 'board_posts' and policyname = 'bp_select_authenticated';

select '게시글: 개인설정 잠김' as 항목,
       (qual like '%bf6c2b9a%')::text as 결과
  from pg_policies
 where tablename = 'board_posts' and policyname = 'bp_select_authenticated';

select '댓글: 부모 글 조건 적용' as 항목,
       (qual like '%board_posts%')::text as 결과
  from pg_policies
 where tablename = 'board_comments' and policyname = 'bc_select_authenticated';
