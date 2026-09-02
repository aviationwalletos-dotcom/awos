-- ============================================================================
-- schema5-admin-directory.sql — 관리자 구성원 현황 조회 권한 (상태 공유 절차 제거)
-- ============================================================================
-- [실행 방법] Supabase 대시보드 → SQL Editor → 전체 붙여넣고 Run.
-- [효과] authorized_orgs에 등록된 관리자 계정이 profiles(가입 회원 목록)를 조회할 수 있게
--        되어, 회원이 "상태 공유"를 누르지 않아도 관리자 페이지 구성원 현황에 바로 표시된다.
-- 일반 회원은 여전히 본인 프로필만 볼 수 있다(기존 정책 유지).

drop policy if exists "profiles_select_authorized_admin" on public.profiles;
create policy "profiles_select_authorized_admin" on public.profiles
  for select to authenticated
  using (
    exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid())
  );

-- 확인: 관리자 계정으로 로그인한 상태의 앱에서 구성원 현황 탭에 전체 회원이 보이면 성공.
