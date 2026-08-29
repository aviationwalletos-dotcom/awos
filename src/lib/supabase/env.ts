// Supabase 접속 정보의 단일 출처 (Single Source of Truth)
//
// [왜 이 파일이 필요한가]
// 이전에는 URL과 publishable 키가 client.ts와 supabaseTransport.ts 두 곳에 중복 정의되어,
// 키를 교체할 때 한 곳만 고치는 사고가 날 수 있었다. 이제 모든 코드는 이 파일에서만 읽는다.
//
// [키 공개에 대하여]
// 아래 publishable 키는 브라우저에 공개되도록 설계된 값이다(설계상 공개용).
// 데이터 보호는 키 은닉이 아니라 서버의 RLS(행 수준 보안) 정책이 담당한다.
// service_role 키는 절대 프론트엔드 어디에도 넣지 않는다.
//
// [환경변수 우선]
// Netlify(또는 로컬 .env)에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 설정되어 있으면
// 그 값을 우선 사용하고, 없으면 아래 기본값으로 동작한다(설정 전에도 앱이 깨지지 않도록).

const envUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined
const envKey = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined

export const SUPABASE_URL: string =
  typeof envUrl === 'string' && envUrl.length > 0 ? envUrl : 'https://vflyqnbdquaanpkvuinz.supabase.co'

export const SUPABASE_ANON_KEY: string =
  typeof envKey === 'string' && envKey.length > 0 ? envKey : 'sb_publishable_GwIFABkaVgmSrYPtrrVgww_bVQYP4oE'
