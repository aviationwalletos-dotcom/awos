-- ============================================================================
-- schema23-instructor-list-excludes-withdrawn.sql — 탈퇴한 교관을 서명 대상 목록에서 제외 (2026-09-13)
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run. (schema17 이후)
--
-- [증상] 탈퇴한 교관이 "서명할 교관" 목록에 계속 보이고, 고르면 서명 요청이 실패한다.
-- [원인] 교관 목록(list_approved_instructors)은 approval_requests 의 교관 승인 행에서 이름을 읽는다.
--        schema17 이 탈퇴해도 그 행을 남기도록 바꿨다(서명 자격의 증거로 보존). 그래서 이름은 남고
--        requester_id 만 null 이 되어, 목록엔 뜨지만 요청은 서버 검증(대상 교관 확인)에서 막혔다.
-- [수정] requester_id 가 살아 있고(탈퇴 안 함) requester_deleted_at 이 비어 있는 교관만 돌려준다.
--        보존된 행 자체는 그대로 둔다 — 이미 받은 서명의 "서명 자격" 증거는 유지돼야 한다.

create or replace function public.list_approved_instructors()
returns table (
  user_id uuid,
  name text,
  track text,
  affiliation text,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.requester_id, r.requester_name, r.track, r.affiliation, r.decided_at
    from public.approval_requests r
   where r.kind = 'instructor' and r.status = 'approved'
     and r.requester_id is not null          -- 탈퇴하면 set null (schema17)
     and r.requester_deleted_at is null      -- 탈퇴 표시가 있으면 제외
     and exists (select 1 from auth.users u where u.id = r.requester_id)
     and auth.uid() is not null
$$;
revoke all on function public.list_approved_instructors() from public;
grant execute on function public.list_approved_instructors() to authenticated;

-- 확인: 지금 목록에 나오는 교관 수
select '서명 가능한 교관 수' as 항목, count(*)::text as 값 from public.list_approved_instructors();
