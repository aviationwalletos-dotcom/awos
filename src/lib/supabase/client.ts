// Supabase 클라이언트 (완전 독립 백엔드)
//
// URL과 anon 키는 브라우저에 공개되는 값이다(설계상 공개용). 데이터 보호는 키 은닉이
// 아니라 서버의 RLS(행 수준 보안) 정책이 담당한다 — supabase/schema.sql 참조.
// service_role 키는 절대 프론트엔드에 넣지 않는다.

import { createClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
