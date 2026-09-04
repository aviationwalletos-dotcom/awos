-- ============================================================================
-- schema12-approval-requests.sql — 서명·승인 전용 테이블 (부채 3단계)
-- ============================================================================
-- [실행] Supabase → SQL Editor → 전체 붙여넣고 Run. 기존 데이터에는 손대지 않는다.
--
-- [배경]
--   지금까지 서명 요청·교관 승인·자격증/신체검사 인증·비행경력증명서 승인은 전부
--   "동적 게시판 게시글 + [APPROVED]/[REJECTED]/[SIGNED] 댓글"로 표현했다.
--   상태를 알려면 게시글 목록을 전부 받고 댓글을 배치 조회해 파싱해야 해서
--   요청이 쌓일수록 새로고침마다 무거워졌고, 교관 승인은 계정당 1건이라 항공기 교관이
--   경량·초경량으로 추가 신청할 수 없었다.
--
-- [결정]
--   1. 요청 1건 = 행 1개. status 컬럼으로 서버에서 바로 필터한다.
--   2. 교관 승인은 (사용자 × 자격 구분 track) 단위다. 항공기 승인과 별개로 초경량을 신청할 수 있다.
--   3. 판정(승인/반려/서명)은 RPC 하나(decide_approval_request)로만 한다. 직접 UPDATE 정책은 없다.
--      → 판정 뒤에는 바꿀 수 없다(불변). 누가·언제 판정했는지 행에 남는다(감사 추적).
--   4. 서명 요청의 대상 교관은 "그 구분으로 승인된 교관"이어야 한다. 트리거로 강제한다.
--   5. 기존 게시판 데이터는 이관하지 않는다(폐기 결정, 2026-09-05).
--
-- [되돌리기]
--   drop function if exists public.decide_approval_request(uuid, text, text, text);
--   drop function if exists public.cancel_approval_request(uuid);
--   drop function if exists public.is_awos_admin();
--   drop table if exists public.approval_requests;

-- 0) 관리자 판정 헬퍼 -----------------------------------------------------------
-- authorized_orgs(schema3)에 등록된 계정 = 관리자.
create or replace function public.is_awos_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.authorized_orgs a where a.user_id = auth.uid())
$$;
revoke all on function public.is_awos_admin() from public;
grant execute on function public.is_awos_admin() to authenticated;

-- 1) 테이블 ---------------------------------------------------------------------
create table if not exists public.approval_requests (
  id               uuid primary key default gen_random_uuid(),
  -- signature: 기록 서명 / instructor: 교관 승인 / certificate: 자격증 인증
  -- medical: 항공신체검사 인증 / flight_experience: 비행경력증명서 승인
  kind             text not null check (kind in ('signature','instructor','certificate','medical','flight_experience')),
  requester_id     uuid not null references auth.users (id) on delete cascade,
  requester_name   text not null default '',
  requester_email  text,
  -- 서명 요청의 대상 교관. 그 외 종류는 null(관리자 풀이 처리).
  target_id        uuid references auth.users (id) on delete set null,
  -- 자격 구분. 교관 승인·서명 요청은 필수, 자격증류는 참고값.
  track            text check (track in ('aircraft','lsa','ultralight')),
  -- 앱 내부 대상 id(비행기록 id / 자격증 id / 증명서 id). 교관 승인은 null.
  subject_id       text,
  affiliation      text,
  title            text not null default '',
  -- 사람이 읽는 요약(관리자 화면·서명 요청함 카드에 그대로 표시)
  summary          text,
  -- 기록 스냅샷 등 구조화 데이터(예: 서명 대상 기록의 날짜·기체·시간)
  payload          jsonb not null default '{}'::jsonb,
  -- 첨부(자격증 사진·증명서 사진) — board-files 저장소 URL
  attachment_path  text,
  status           text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_by       uuid references auth.users (id) on delete set null,
  decided_by_name  text,
  decided_at       timestamptz,
  decision_note    text,
  -- 교관 손그림 서명 이미지 URL(서명 요청 승인 시)
  signature_path   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists approval_requests_requester_idx
  on public.approval_requests (requester_id, kind, status);
create index if not exists approval_requests_target_idx
  on public.approval_requests (target_id, status) where target_id is not null;
create index if not exists approval_requests_queue_idx
  on public.approval_requests (kind, status, created_at desc);
-- 같은 대상에 대기중 요청은 하나만(중복 클릭 방지). 판정된 뒤에는 다시 요청할 수 있다.
create unique index if not exists approval_requests_one_pending_idx
  on public.approval_requests (kind, requester_id, coalesce(subject_id, ''), coalesce(track, ''))
  where status = 'pending';
-- 교관 승인은 구분별로 승인 1건만 유지(재신청은 반려 뒤에만).
create unique index if not exists approval_requests_one_approved_instructor_idx
  on public.approval_requests (requester_id, track)
  where kind = 'instructor' and status = 'approved';

drop trigger if exists trg_approval_requests_updated on public.approval_requests;
create trigger trg_approval_requests_updated before update on public.approval_requests
  for each row execute function public.set_updated_at();

-- 2) 무결성 트리거 --------------------------------------------------------------
-- 서명 요청: 대상 교관은 같은 track 으로 승인된 교관이어야 한다(fail-closed).
-- 교관 승인·서명 요청: track 필수.
create or replace function public.approval_requests_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('signature','instructor') and new.track is null then
    raise exception '자격 구분(track)이 필요합니다.';
  end if;
  if new.kind = 'signature' then
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
drop trigger if exists trg_approval_requests_validate on public.approval_requests;
create trigger trg_approval_requests_validate before insert on public.approval_requests
  for each row execute function public.approval_requests_validate();

-- 3) RLS ------------------------------------------------------------------------
alter table public.approval_requests enable row level security;

-- 읽기: 요청자 본인 / 서명 대상 교관 / 관리자 / (누구나) 승인된 교관 목록(서명 대상 선택용)
drop policy if exists "ar_select" on public.approval_requests;
create policy "ar_select" on public.approval_requests
  for select to authenticated
  using (
    requester_id = auth.uid()
    or target_id = auth.uid()
    or public.is_awos_admin()
    or (kind = 'instructor' and status = 'approved')
  );

-- 쓰기: 본인 명의 대기중 요청만 만들 수 있다. 판정 컬럼은 비어 있어야 한다.
drop policy if exists "ar_insert_own" on public.approval_requests;
create policy "ar_insert_own" on public.approval_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and status = 'pending'
    and decided_by is null and decided_at is null and signature_path is null
  );

-- update/delete 정책 없음 = 아래 RPC 로만 상태가 바뀐다.

-- 4) 판정 RPC -------------------------------------------------------------------
-- p_decision: 'approved' | 'rejected'
-- 서명 요청은 대상 교관 본인만(그리고 여전히 그 구분의 승인 교관일 때만), 그 외는 관리자만.
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
  r public.approval_requests;
  me uuid := auth.uid();
  my_name text;
begin
  if me is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception '판정 값이 올바르지 않습니다.';
  end if;

  select * into r from public.approval_requests where id = p_id for update;
  if not found then
    raise exception '요청을 찾을 수 없습니다.';
  end if;
  if r.status <> 'pending' then
    raise exception '이미 처리된 요청입니다(%).', r.status;
  end if;

  if r.kind = 'signature' then
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
         signature_path = case when r.kind = 'signature' and p_decision = 'approved' then p_signature_path else null end
   where id = p_id
   returning * into r;
  return r;
end;
$$;
revoke all on function public.decide_approval_request(uuid, text, text, text) from public;
grant execute on function public.decide_approval_request(uuid, text, text, text) to authenticated;

-- 5) 취소 RPC(요청자 본인, 대기중만) -------------------------------------------
create or replace function public.cancel_approval_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.approval_requests;
begin
  select * into r from public.approval_requests where id = p_id for update;
  if not found then
    raise exception '요청을 찾을 수 없습니다.';
  end if;
  if r.requester_id is distinct from auth.uid() then
    raise exception '본인 요청만 취소할 수 있습니다.';
  end if;
  if r.status <> 'pending' then
    raise exception '이미 처리된 요청은 취소할 수 없습니다.';
  end if;
  update public.approval_requests set status = 'cancelled' where id = p_id;
end;
$$;
revoke all on function public.cancel_approval_request(uuid) from public;
grant execute on function public.cancel_approval_request(uuid) to authenticated;

-- 6) 확인 ---------------------------------------------------------------------
select '테이블(1이어야)' as 항목, count(*)::text as 값
  from information_schema.tables
 where table_schema = 'public' and table_name = 'approval_requests'
union all
select 'RPC(2여야)', count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('decide_approval_request','cancel_approval_request')
union all
select '정책(2여야)', count(*)::text
  from pg_policies where tablename = 'approval_requests';
