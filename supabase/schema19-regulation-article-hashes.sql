-- ============================================================================
-- schema19-regulation-article-hashes.sql — 법령 관리: 조문 단위 변경 감지용 해시 저장 (2026-09-10)
-- ============================================================================
-- [실행] Supabase → SQL Editor → Run. (schema16 이후)
-- [왜] "일부개정"만으로는 우리가 쓰는 조문이 바뀌었는지 모른다. 관리자가 "확인함"을 누를 때
--      각 조문·별표 본문의 SHA-256 을 저장해 두고, 다음 확인 때 해시가 다르면 그 조문만 "변경됨"으로 띄운다.
-- [형식] { "제77조": "sha256hex", "별표8": "..." }

alter table public.regulation_checks
  add column if not exists article_hashes jsonb not null default '{}'::jsonb;

select 'article_hashes 컬럼(1이어야)' as 항목, count(*)::text as 값
  from information_schema.columns
 where table_schema = 'public' and table_name = 'regulation_checks' and column_name = 'article_hashes';
