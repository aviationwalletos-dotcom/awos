-- ============================================================================
-- schema20-endorsement.sql — 교관 확인(Endorsement)을 교관 전자서명으로 (2026-09-10)
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run. (schema12 이후)
-- [왜] 지금까지 "교관 확인"은 학생이 자격증 탭에 "교관이 확인해 줬다"고 자기 신고했다.
--      운항기술기준 2.2.2.5·2.2.2.6·2.2.3.2 의 확인(endorsement)은 교관의 행위이므로,
--      비행 기록 서명과 같은 구조(대상 교관 지정 → 교관 손글씨 서명 → 스냅샷·해시)로 받는다.
-- [방법] approval_requests.kind 에 'endorsement' 추가. 검증·판정 로직은 'signature' 와 동일하게.

-- 1) kind 허용값 --------------------------------------------------------------
alter table public.approval_requests drop constraint if exists approval_requests_kind_check;
alter table public.approval_requests
  add constraint approval_requests_kind_check
  check (kind in ('signature','instructor','certificate','medical','flight_experience','endorsement'));

-- 2) 삽입 검증 트리거: endorsement 도 signature 처럼 (대상 교관 필수 · 본인 불가 · 해당 구분 승인 교관) ----
create or replace function public.approval_requests_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('signature','instructor','endorsement') and new.track is null then
    raise exception '자격 구분(track)이 필요합니다.';
  end if;
  if new.kind in ('signature','endorsement') then
    if new.target_id is null then
      raise exception '서명 요청에는 대상 교관이 필요합니다.';
    end if;
    if new.target_id = new.requester_id then
      raise exception '본인에게는 서명을 요청할 수 없습니다.';
    end if;
    if not exists (
      select 1 from public.approval_requests i
       where i.kind = 'instructor' and i.status = 'approved'
         and i.requester_id = new.target_id and i.track = new.track
    ) then
      raise exception '해당 구분으로 승인된 교관이 아닙니다.';
    end if;
  end if;
  return new;
end;
$$;

-- 3) 판정 RPC: endorsement 도 대상 교관만, 승인 시 서명 이미지 필수 ---------------------
create or replace function public.decide_approval_request(
  p_id uuid,
  p_decision text,
  p_note text default null,
  p_signature_path text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_name text;
  r public.approval_requests;
begin
  if me is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception '결정값은 approved 또는 rejected 여야 합니다.';
  end if;

  select * into r from public.approval_requests where id = p_id for update;
  if not found then
    raise exception '요청을 찾을 수 없습니다.';
  end if;
  if r.status <> 'pending' then
    raise exception '이미 처리된 요청입니다(%).', r.status;
  end if;

  if r.kind in ('signature','endorsement') then
    if r.target_id is distinct from me then
      raise exception '이 서명 요청의 대상 교관만 처리할 수 있습니다.';
    end if;
    if not exists (
      select 1 from public.approval_requests i
       where i.kind = 'instructor' and i.status = 'approved'
         and i.requester_id = me and i.track = r.track
    ) then
      raise exception '해당 구분의 승인 교관이 아닙니다.';
    end if;
    if p_decision = 'approved' and (p_signature_path is null or p_signature_path = '') then
      raise exception '서명 이미지가 필요합니다.';
    end if;
  else
    if not public.is_awos_admin() then
      raise exception '관리자만 처리할 수 있습니다.';
    end if;
  end if;

  select name into my_name from public.profiles where id = me;

  update public.approval_requests
     set status = p_decision,
         decided_by = me,
         decided_by_name = coalesce(my_name, ''),
         decided_at = now(),
         decision_note = nullif(p_note, ''),
         signature_path = case when r.kind in ('signature','endorsement') and p_decision = 'approved' then p_signature_path else null end
   where id = p_id
   returning * into r;
  return r;
end;
$$;
revoke all on function public.decide_approval_request(uuid, text, text, text) from public;
grant execute on function public.decide_approval_request(uuid, text, text, text) to authenticated;

-- 확인
select 'kind 제약(endorsement 포함, 1이어야)' as 항목, count(*)::text as 값
  from pg_constraint where conname = 'approval_requests_kind_check' and pg_get_constraintdef(oid) like '%endorsement%';
