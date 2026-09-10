-- ============================================================================
-- schema17-withdrawal-keeps-signatures.sql — 탈퇴해도 상대방 기록 속 서명 증거는 남긴다 (2026-09-10)
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run. (schema12~16 이후)
--
-- [원칙] "내 기록에 적힌 상대방 이름은 남는다" — 종이 로그북과 같다.
--   · 교관이 탈퇴해도 학생 로그북의 교관 이름·서명 이미지는 그대로 (이미 set null 로 돼 있었다)
--   · 학생이 탈퇴해도 교관 서명함의 학생 이름·날짜·기체·시간·스냅샷·해시는 그대로 (이번에 고침)
--   근거: 개인정보보호법 제15조①6호(정당한 이익) — 교관의 비행경력(교관 시간) 증명에 상대방 이름이 필요하다.
--   개인정보처리방침에 "서명 기록에 포함된 이름은 상대방의 비행경력 증명을 위해 탈퇴 후에도 남습니다"를 넣을 것.
--
-- [지워지는 것] 계정, 프로필(이메일·전화·생년월일·주소), 본인 로그북 전체, 본인 자격증·증명서와 그 사진,
--               본인이 낸 자격증·신체검사·증명서 인증 요청(사진이 개인정보), 아직 서명 안 된 요청은 취소
-- [남는 것]     서명 요청 행(승인·반려·취소 이력, 이름, 스냅샷·해시), 교관 손글씨 서명 이미지, 교관 승인 기록(자격번호 = 서명 자격의 증거)
--
-- 유예 없이 즉시 삭제(테스트 단계 결정, 2026-09-10). 유예가 필요해지면 delete_my_account 를 "예약"으로 바꾼다.

-- 1) 요청자가 탈퇴해도 행이 남도록: cascade → set null ------------------------------
alter table public.approval_requests
  drop constraint if exists approval_requests_requester_id_fkey;
alter table public.approval_requests
  alter column requester_id drop not null;
alter table public.approval_requests
  add constraint approval_requests_requester_id_fkey
  foreign key (requester_id) references auth.users (id) on delete set null;

-- 2) 탈퇴 시각 — 화면에서 "탈퇴한 사용자" 표시용
alter table public.approval_requests
  add column if not exists requester_deleted_at timestamptz;

-- 3) 탈퇴 함수: 익명화 → 삭제 ------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, storage
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

  -- (c) 남는 행(서명 이력·교관 승인)은 이메일만 지우고 탈퇴 시각을 남긴다. 이름은 남긴다(위 원칙).
  update public.approval_requests
     set requester_email = null,
         requester_deleted_at = now(),
         updated_at = now()
   where requester_id = me;

  -- (d) 내가 올린 파일 삭제 — 단 교관 서명 이미지(-signature.png)는 학생 기록의 일부라 남긴다.
  --     (참고) SQL 로 storage.objects 를 지우면 목록에서는 사라지지만 실제 파일은 Supabase 정리 주기에 지워진다.
  delete from storage.objects
   where bucket_id = 'board-files'
     and (owner = me or owner_id = me::text)
     and name not like '%-signature.png';

  -- (e) 계정 삭제 → profiles / logbook_entries / certificates 등은 cascade
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- 확인 ------------------------------------------------------------------------------------
select '요청자 FK 삭제규칙(n = set null 이어야)' as 항목, confdeltype::text as 값
  from pg_constraint where conname = 'approval_requests_requester_id_fkey'
union all
select 'requester_deleted_at 컬럼(1이어야)', count(*)::text
  from information_schema.columns
 where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'requester_deleted_at'
union all
select '탈퇴 함수(1이어야)', count(*)::text
  from pg_proc where proname = 'delete_my_account';
