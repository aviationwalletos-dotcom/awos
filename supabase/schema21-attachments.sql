-- ============================================================================
-- schema21-attachments.sql — 첨부 여러 장 (자격증 앞·뒷면, 증명서 여러 쪽) (2026-09-10)
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run.
-- attachment_path(첫 장)는 그대로 두고, 전체 목록을 attachment_paths 에 둔다. 예전 요청은 attachment_paths 가 비어 있으면 attachment_path 하나로 본다.

alter table public.approval_requests
  add column if not exists attachment_paths text[] not null default '{}'::text[];

select 'attachment_paths 컬럼(1이어야)' as 항목, count(*)::text as 값
  from information_schema.columns
 where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'attachment_paths';
