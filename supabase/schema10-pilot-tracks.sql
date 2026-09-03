-- ============================================================================
-- schema10-pilot-tracks.sql — v1.1 보유 트랙·생년월일·운항형태 컬럼
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run. (schema3 → schema4 다음, 순서 무관)
-- [효과] profiles 테이블에 v1.1 필드 3개를 추가한다. 기관 대시보드(구성원 현황)에서
--        구성원의 보유 트랙을 볼 수 있게 되고, 앱이 계정 정보 첫 로드 시 서버 값을 채운다.
--
-- [적용 안 해도 되는가] 된다. 앱은 이 컬럼이 없어도 동작한다.
--   트랙·생년월일·운항형태는 (1) localStorage (2) "개인설정" 게시글 JSON 에 먼저 저장되고,
--   profiles 쓰기는 best-effort(실패해도 무시)다. 이 스키마는 기관 대시보드 노출과
--   기기 간 초기 동기화 품질을 올리는 용도다.
--
-- [되돌리기] alter table public.profiles drop column pilot_tracks, drop column birth_date, drop column operation_type;

alter table public.profiles
  add column if not exists pilot_tracks text[]      -- 예: '{aircraft,lsa}'
    check (pilot_tracks <@ array['aircraft','lsa','ultralight']::text[]),
  add column if not exists birth_date date,
  add column if not exists operation_type text
    check (operation_type in ('general','commercial'));

comment on column public.profiles.pilot_tracks   is 'v1.1 보유 조종 트랙(복수). aircraft=항공기 조종사, lsa=경량항공기 조종사, ultralight=초경량비행장치 조종자';
comment on column public.profiles.birth_date     is 'v1.1 생년월일. 항공신체검사 유효기간(별표 8)이 연령으로 갈려 필요';
comment on column public.profiles.operation_type is 'v1.1 운항형태. general=일반(최근비행경험 180일), commercial=여객·2인조종·운송사업(90일+야간)';

-- 기존 단일 역할에서 1회 이관 (이미 값이 있으면 건드리지 않음)
update public.profiles
   set pilot_tracks = case individual_role
                        when 'pilot'       then array['aircraft']
                        when 'drone_pilot' then array['ultralight']
                        else null
                      end
 where pilot_tracks is null
   and individual_role in ('pilot','drone_pilot');

-- 확인
select '컬럼(3이어야)' as 항목, count(*)::text as 값
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name in ('pilot_tracks','birth_date','operation_type')
union all
select '이관된 프로필', count(*)::text from public.profiles where pilot_tracks is not null;
