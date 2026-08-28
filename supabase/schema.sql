-- ============================================================================
-- AWOS (Aviation Wallet OS) — Supabase 데이터베이스 스키마 v1
-- ============================================================================
-- 사용법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여넣고 Run.
--
-- 설계 원칙
--  1) 검색·정렬에 쓰이는 필드는 컬럼으로, 공식 서식의 중첩 구조(범주별/자격별/조건별
--     시간 등)는 jsonb로 보존한다 — 앱의 타입(LogbookEntry 등)과 1:1 대응.
--  2) 모든 테이블에 RLS(행 수준 보안)를 켜고, "본인 것만" 원칙을 기본으로 한다.
--     기관 열람은 사용자가 명시적으로 공유한 것(status_shares)만 허용한다.
--  3) 기존 aiapp 데이터 이관을 위해 legacy_post_id 컬럼을 둔다(중복 이관 방지 키).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. 공통: updated_at 자동 갱신 트리거 함수
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. 프로필 — auth.users(수파베이스 내장 인증)와 1:1
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_type text not null check (user_type in ('individual', 'organization')),
  name text not null,
  -- 개인: pilot / atc / mechanic / dispatcher / drone_pilot (기관 계정은 null)
  individual_role text check (individual_role in ('pilot','atc','mechanic','dispatcher','drone_pilot')),
  -- 소속(개인) 또는 기관명(기관 계정)
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- 본인 프로필 읽기/쓰기
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 헬퍼: 현재 사용자가 특정 기관의 "기관 계정"인가
create or replace function public.is_org_of(inst text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and user_type = 'organization' and institution = inst
  );
$$;

-- 헬퍼: 현재 사용자가 특정 기관의 "승인된 교관"인가 (아래 instructor_approvals 참조)
create or replace function public.is_approved_instructor_of(inst text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.instructor_approvals
    where user_id = auth.uid() and institution = inst and status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. 비행기록 — 앱의 LogbookEntry와 1:1
-- ---------------------------------------------------------------------------
create table public.logbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  departure text not null,
  arrival text not null,
  via_airports text,
  aircraft_type text not null,
  aircraft_identification text,
  block_time numeric(6,1) not null check (block_time >= 0),
  flight_category text not null,                 -- '주간' | '야간' | '계기'
  category_hours jsonb,                          -- 단발육상/다발육상/회전익/기타
  piloting_time jsonb,                           -- dualReceived/pic/sic/flightInstructor
  ground_trainer_time numeric(6,1),
  conditions jsonb,                              -- day/night/crossCountry/actualInstrument/simulatedInstrument
  instrument_approaches int,
  day_landings int,
  night_landings int,
  notes text,
  origin text not null default 'manual'
    check (origin in ('manual','legacy_excel','flight_experience_certificate')),
  legacy_source_note text,
  pilot_certification jsonb,                     -- 본인 확인 서명(dataURL 제외 메타만 권장)
  instructor_signature jsonb,                    -- 교관 서명 결과 스냅샷
  certificate_approval_status text
    check (certificate_approval_status in ('pending','confirmed','rejected')),
  certificate_issuer text,
  legacy_post_id text unique,                    -- aiapp 게시글 id (이관 중복 방지)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_logbook_user_date on public.logbook_entries (user_id, date desc);
create trigger trg_logbook_updated before update on public.logbook_entries
  for each row execute function public.set_updated_at();

alter table public.logbook_entries enable row level security;
create policy "logbook_all_own" on public.logbook_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. 자격증 — 앱의 Certificate와 1:1
-- ---------------------------------------------------------------------------
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,                        -- '조종사 자격증명' 등 6종
  issuer text not null,
  issued_date date not null,
  expiry_date date,
  notes text,
  legacy_post_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_certificates_user on public.certificates (user_id, expiry_date);
create trigger trg_certificates_updated before update on public.certificates
  for each row execute function public.set_updated_at();

alter table public.certificates enable row level security;
create policy "certificates_all_own" on public.certificates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. 업무기록 (정비사·관제사·운항관리사·드론용)
-- ---------------------------------------------------------------------------
create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  payload jsonb not null,                        -- 직군별 상이한 필드는 jsonb로 보존
  legacy_post_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_worklogs_user_date on public.work_logs (user_id, date desc);
create trigger trg_worklogs_updated before update on public.work_logs
  for each row execute function public.set_updated_at();

alter table public.work_logs enable row level security;
create policy "worklogs_all_own" on public.work_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. 교관 승인 — 개인이 기관에 "나 이 기관 교관임" 신청, 기관이 승인
-- ---------------------------------------------------------------------------
create table public.instructor_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  instructor_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_at timestamptz,
  legacy_post_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, institution)
);
create trigger trg_instructor_approvals_updated before update on public.instructor_approvals
  for each row execute function public.set_updated_at();

alter table public.instructor_approvals enable row level security;
-- 신청자 본인: 자기 신청 생성·조회
create policy "ia_select_own" on public.instructor_approvals
  for select using (auth.uid() = user_id);
create policy "ia_insert_own" on public.instructor_approvals
  for insert with check (auth.uid() = user_id);
-- 해당 기관의 기관 계정: 조회·승인/반려(상태 변경)
create policy "ia_select_org" on public.instructor_approvals
  for select using (public.is_org_of(institution));
create policy "ia_update_org" on public.instructor_approvals
  for update using (public.is_org_of(institution));

-- ---------------------------------------------------------------------------
-- 6. 서명 요청 — 훈련생이 비행기록에 대해 교관 서명을 요청
-- ---------------------------------------------------------------------------
create table public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  requester_name text not null,
  institution text not null,                     -- 요청이 향하는 기관(그 기관의 승인 교관이 열람)
  entry_id uuid references public.logbook_entries (id) on delete set null,
  entry_snapshot jsonb not null,                 -- 서명 대상 기록 스냅샷(요청 시점 고정)
  status text not null default 'pending' check (status in ('pending','signed','declined')),
  signed_by uuid references auth.users (id),
  signed_by_name text,
  signed_at timestamptz,
  legacy_post_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sigreq_institution_status on public.signature_requests (institution, status);
create trigger trg_sigreq_updated before update on public.signature_requests
  for each row execute function public.set_updated_at();

alter table public.signature_requests enable row level security;
-- 요청자: 생성·조회·(대기 중) 삭제
create policy "sr_select_requester" on public.signature_requests
  for select using (auth.uid() = requester_id);
create policy "sr_insert_requester" on public.signature_requests
  for insert with check (auth.uid() = requester_id);
create policy "sr_delete_requester" on public.signature_requests
  for delete using (auth.uid() = requester_id and status = 'pending');
-- 해당 기관의 승인 교관: 조회·서명(상태 변경)
create policy "sr_select_instructor" on public.signature_requests
  for select using (public.is_approved_instructor_of(institution));
create policy "sr_update_instructor" on public.signature_requests
  for update using (public.is_approved_instructor_of(institution));

-- ---------------------------------------------------------------------------
-- 7. 상태 공유 — 개인이 소속 기관 대시보드에 자기 현황을 공유(옵트인)
-- ---------------------------------------------------------------------------
create table public.status_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  snapshot jsonb not null,                       -- 총시간/자격/GO·NO-GO 등 공유 시점 스냅샷
  legacy_post_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, institution)                  -- 기관당 1개(갱신 방식)
);
create trigger trg_status_shares_updated before update on public.status_shares
  for each row execute function public.set_updated_at();

alter table public.status_shares enable row level security;
-- 본인: 전체 권한(공유 생성·갱신·회수)
create policy "ss_all_own" on public.status_shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 해당 기관 계정: 조회만
create policy "ss_select_org" on public.status_shares
  for select using (public.is_org_of(institution));

-- ---------------------------------------------------------------------------
-- 8. 비행경력증명서 승인 요청 — 증명서 기반 이관 기록의 기관 확인
-- ---------------------------------------------------------------------------
create table public.fec_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requester_name text not null,
  institution text not null,
  entry_id uuid references public.logbook_entries (id) on delete set null,
  payload jsonb not null,                        -- 항목별 누적시간·발급기관 등
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_at timestamptz,
  legacy_post_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_fec_updated before update on public.fec_requests
  for each row execute function public.set_updated_at();

alter table public.fec_requests enable row level security;
create policy "fec_select_own" on public.fec_requests
  for select using (auth.uid() = user_id);
create policy "fec_insert_own" on public.fec_requests
  for insert with check (auth.uid() = user_id);
create policy "fec_select_org" on public.fec_requests
  for select using (public.is_org_of(institution));
create policy "fec_update_org" on public.fec_requests
  for update using (public.is_org_of(institution));

-- ============================================================================
-- 끝. 실행 후 왼쪽 Table Editor에서 테이블 8개가 보이면 성공입니다.
-- ============================================================================
