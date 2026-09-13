-- ============================================================================
-- schema22-withdrawal-storage-fix.sql — 회원 탈퇴 실패 수정 (2026-09-13)
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run. (schema17 이후, 한 번만)
--
-- [증상] 탈퇴 버튼을 누르면 "Direct deletion from storage tables is not allowed. Use the Storage API instead."
-- [원인] schema17 의 (d) 단계에서 storage.objects 를 SQL delete 로 지우려 했다.
--        Supabase 는 스토리지 테이블 직접 삭제를 트리거로 막고 Storage API 사용을 요구한다.
--        이 예외로 함수 전체가 롤백돼 탈퇴가 아예 되지 않았다(데이터는 그대로 남았으므로 피해 없음).
-- [수정] (d) 삭제. 대신 파일은 앱이 탈퇴 직전에 Storage API 로 지운다(자격증·증명서 사진).
--        교관 서명 이미지는 상대방 기록의 일부라 그대로 둔다(schema17 원칙).
-- [주의] 스토리지 파일이 남아도 접근은 막힌다 — board_files_scoped_read 정책이 "내 요청에 붙은 파일"만 읽게 하므로
--        요청 행이 지워지거나 익명화되면 더 이상 열람 경로가 없다.
--
-- ⚠️ [2026-09-13 추가] (d) 단계를 되살리지 마세요. v2.9j 이후 학생 기록의 교관 서명 그림은
--    기록이 아니라 이 스토리지 파일에만 있어요. 탈퇴가 파일을 지우면 학생 로그북에서 그림이
--    사라지고, schema17 의 "교관 손글씨 서명 이미지는 남는다" 원칙이 깨져요.
--    docs/signature-image-dependency.md 에 의존 관계 3곳을 정리해 뒀어요.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception '로그인이 필요해요.';
  end if;

  -- (a) 내 사진이 붙은 인증 요청은 통째로 삭제(자격증·신체검사·비행경력증명서 사진 = 개인정보)
  delete from public.approval_requests
   where requester_id = me
     and kind in ('certificate', 'medical', 'flight_experience');

  -- (b) 아직 서명 안 된 요청은 취소 — 교관 서명함에 처리 못 할 항목이 남지 않게
  update public.approval_requests
     set status = 'cancelled',
         decision_note = coalesce(decision_note, '') || case when decision_note is null or decision_note = '' then '' else ' · ' end || '요청자 탈퇴',
         updated_at = now()
   where requester_id = me
     and status = 'pending';

  -- (c) 남는 행(서명 이력·교관 승인)은 이메일만 지우고 탈퇴 시각을 남긴다. 이름은 남긴다.
  update public.approval_requests
     set requester_email = null,
         requester_deleted_at = now(),
         updated_at = now()
   where requester_id = me;

  -- (d) 스토리지 파일 삭제는 여기서 하지 않는다(위 [원인] 참고). 앱이 Storage API 로 먼저 지운다.

  -- (e) 계정 삭제 → profiles / logbook_entries / certificates 등은 cascade
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- 확인: storage 직접 삭제 구문이 사라졌는지
select case when prosrc like '%storage.objects%' then '아직 남아 있음 — 다시 실행하세요'
            else '정상(스토리지 직접 삭제 없음)' end as 결과
  from pg_proc where proname = 'delete_my_account';
