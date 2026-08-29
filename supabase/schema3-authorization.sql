-- ============================================================================
-- schema3-authorization.sql — 승인·서명 권한의 원천 (SEC-001)
-- ============================================================================
-- [실행 방법] Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run.
--
-- [이 테이블이 하는 일]
-- "[APPROVED]/[REJECTED]/[SIGNED] 댓글을 누가 써야 유효한가"의 기준이 되는
-- 기관(organization) 계정 목록. 앱은 이 목록에 있는 계정의 승인 댓글만 인정하고,
-- 그 승인을 받은 교관의 [SIGNED] 댓글만 서명으로 인정한다.
--
-- [중요] 이 테이블에 기관 계정을 등록하기 전까지는 어떤 승인·서명도 새로 인정되지
-- 않는다(fail-closed). 아래 3단계의 "기관 계정 등록"을 반드시 진행할 것.

create table if not exists public.authorized_orgs (
  user_id uuid primary key,          -- 기관 계정의 auth 사용자 id (auth.users.id)
  org_name text not null,            -- 기관 이름 (예: '한국항공대학교 비행교육원')
  note text,                         -- 메모 (담당자, 등록 사유 등)
  created_at timestamptz not null default now()
);

alter table public.authorized_orgs enable row level security;

-- 읽기: 누구나 가능(기관 목록은 공개 정보 성격이며, 앱이 로그인 전 상태에서도 판정
-- 준비를 할 수 있어야 한다). 쓰기 정책은 만들지 않는다 = 오직 Supabase 대시보드
-- (관리자/service_role)에서만 등록·수정·삭제 가능. 이것이 이 설계의 핵심이다.
drop policy if exists "authorized_orgs_select_all" on public.authorized_orgs;
create policy "authorized_orgs_select_all" on public.authorized_orgs
  for select using (true);

-- ============================================================================
-- 기관 계정 등록 (관리자가 직접 수행)
-- ============================================================================
-- 1단계: 기관 계정의 user_id 찾기 — 아래 조회를 실행해 기관 계정 이메일의 id를 확인.
--   select id, email, created_at from auth.users order by created_at;
--
-- 2단계: 아래 insert의 값을 바꿔 실행 (기관 수만큼 반복).
--   insert into public.authorized_orgs (user_id, org_name, note)
--   values ('여기에-auth-users의-id', '기관 이름', '등록 메모')
--   on conflict (user_id) do update set org_name = excluded.org_name, note = excluded.note;
--
-- 3단계: 확인.
--   select * from public.authorized_orgs;
--
-- [검증 팁] 등록한 id가 실제 댓글의 author_id와 일치하는지 확인하려면:
--   select author_id, author_name, left(content, 30) from public.board_comments
--    where content like '[APPROVED]%' order by created_at desc limit 5;
-- 위 결과의 author_id가 authorized_orgs.user_id와 같아야 기존 승인들이 계속 유효하다.
