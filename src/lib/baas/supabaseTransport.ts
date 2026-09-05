// ============================================================================
// Supabase 호환 전송 계층 (aiapp BaaS API 에뮬레이터)
// ============================================================================
// 전략: 앱의 31개 훅은 각자 fetch()로 aiapp REST API를 호출한다. 훅을 전부 다시 쓰는 대신,
// aiapp API의 "요청 경로·응답 모양"을 그대로 흉내 내는 baasFetch를 만들어 fetch 자리에
// 끼운다. 훅 입장에서는 아무것도 달라지지 않았지만, 실제 저장소는 Supabase가 된다.
//
// 인증 설계(중요):
//  - aiapp 방식과 동일하게 "저장된 토큰을 Authorization 헤더로 싣는" 무상태 모델을 유지한다.
//  - Supabase access token은 1시간 만료라서, 로그인 시 access·refresh 토큰을 '::'로 이어붙인
//    합성 토큰을 발급한다(훅은 이를 불투명 문자열로 저장·전송할 뿐이다). 만료 시 어댑터가
//    refresh 토큰으로 조용히 갱신하고 저장 토큰을 교체한다.
//  - 교관 본인검증(useVerifyInstructor)이 같은 /account/login을 다른 계정으로 호출하는데,
//    이 설계에서는 "요청에 실린 토큰"만이 신원이므로 본 세션이 오염되지 않는다.
//
// 보안: 데이터 보호는 Supabase RLS가 담당한다(supabase/schema2-boards.sql).
//  - 게시글: 로그인 사용자 전원 조회(구 aiapp의 '전체 공개'보다 강화), 작성자만 수정/삭제.
//  - 2단계(정규화)에서 도메인별 엄격 정책으로 좁힌다.

import { createClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase/env'
import { BAAS_BASE_URL, getStoredAccessToken, setStoredAccessToken } from './config'

import type { SupabaseClient } from '@supabase/supabase-js'


// ---------------------------------------------------------------------------
// 클라이언트 팩토리
// ---------------------------------------------------------------------------

// [BUGFIX 2026-09-05 · 교착]
//  supabase-js 는 accessToken 옵션이 없으면 REST/RPC/Storage 요청마다 내부적으로 auth.getSession() 을
//  먼저 기다린다. getSession 은 navigator.locks 로 "sb-<ref>-auth-token" 잠금을 잡는데, 이 이름은
//  storageKey 에서 나오므로 메인 클라이언트(세션 유지·자동 갱신)와 여기서 만든 클라이언트가 같은 잠금을
//  두고 경합했다. 게다가 인증 확인(resolveAuth)마다 새 클라이언트를 만들어("Multiple GoTrueClient instances"
//  경고 ×6) 경합이 더 잦았다. 결과: 요청이 네트워크로 나가지도 못한 채 멈춤 → 승인 조회 실패로 서명 요청함
//  탭 누락, 재진입 시 "로그인 상태를 확인하는 중" 무한 대기(E2E 04에서 재현, 사람 브라우저는 타이밍상 통과).
//  대책:
//   1) 데이터 클라이언트는 accessToken 콜백을 주어 getSession 을 아예 타지 않게 한다.
//   2) 인증 전용 클라이언트는 하나만 만들어 재사용하고, storageKey 를 따로 줘 잠금 이름을 분리한다.

// [2026-09-05 · 요청 시간 제한]
//  E2E 에서 supabase.co 로 보낸 요청이 응답도 실패도 없이 무한히 걸리는 현상이 재현됐다(연결 정체).
//  걸린 요청을 영원히 기다리면 화면이 "로그인 상태를 확인하는 중"에 멈춘다. 일반 요청 20초, 파일 업로드 60초를
//  넘기면 오류로 끊어 호출부(재시도 로직·오류 표시)가 동작하게 한다.
const REQUEST_TIMEOUT_MS = 20_000
const UPLOAD_TIMEOUT_MS = 60_000
function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal || typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return fetch(input, init)
  }
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const ms = url.includes('/storage/v1/') ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS
  return fetch(input, { ...init, signal: AbortSignal.timeout(ms) })
}

/** 세션을 전혀 저장하지 않는 인증 전용 클라이언트(로그인 검증·토큰 갱신·가입에만 사용). 하나만 만들어 재사용. */
let sharedAuthClient: SupabaseClient | null = null
function makeAuthClient(): SupabaseClient {
  if (sharedAuthClient) return sharedAuthClient
  sharedAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'awos-auth-shim', // 메인 클라이언트와 잠금 이름 분리
    },
    global: { fetch: timedFetch },
  })
  return sharedAuthClient
}

/** 특정 access token의 권한으로 동작하는 데이터 클라이언트(간단 캐시). getSession 을 타지 않는다. */
let cachedDataClient: { token: string; client: SupabaseClient } | null = null
function dataClientFor(accessToken: string): SupabaseClient {
  if (cachedDataClient?.token === accessToken) return cachedDataClient.client
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => accessToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'awos-data-client' },
    global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch: timedFetch },
  })
  cachedDataClient = { token: accessToken, client }
  return client
}

// ---------------------------------------------------------------------------
// 합성 토큰(access::refresh) 유틸
// ---------------------------------------------------------------------------

const TOKEN_SEP = '::'

function packToken(access: string, refresh: string | null | undefined): string {
  return refresh ? `${access}${TOKEN_SEP}${refresh}` : access
}

function unpackToken(packed: string): { access: string; refresh: string | null } {
  const idx = packed.indexOf(TOKEN_SEP)
  if (idx === -1) return { access: packed, refresh: null }
  return { access: packed.slice(0, idx), refresh: packed.slice(idx + TOKEN_SEP.length) }
}

/** 요청에 실린(또는 저장된) 합성 토큰을 꺼낸다. */
function extractPackedToken(init?: RequestInit): string | null {
  const headers = init?.headers
  let auth: string | null = null
  if (headers instanceof Headers) auth = headers.get('Authorization')
  else if (Array.isArray(headers)) auth = headers.find(([k]) => k.toLowerCase() === 'authorization')?.[1] ?? null
  else if (headers) auth = (headers as Record<string, string>)['Authorization'] ?? null
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length)
  return getStoredAccessToken()
}

// ---------------------------------------------------------------------------
// 응답 헬퍼 — aiapp envelope 재현
// ---------------------------------------------------------------------------

function ok<T>(data: T): Response {
  return new Response(JSON.stringify({ result: 'SUCCESS', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fail(status: number, message: string): Response {
  return new Response(JSON.stringify({ result: 'FAIL', message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function toErrorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

// ---------------------------------------------------------------------------
// 프로필 캐시(작성자 이름 표기용)
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string
  user_type: 'individual' | 'organization'
  name: string
  individual_role: string | null
  institution: string | null
  phone: string | null
  created_at: string
}

const profileCache = new Map<string, ProfileRow>()

async function getProfile(client: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const hit = profileCache.get(userId)
  if (hit) return hit
  const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (data) profileCache.set(userId, data as ProfileRow)
  return (data as ProfileRow | null) ?? null
}

// ---------------------------------------------------------------------------
// 인증 컨텍스트 해석(+ 만료 시 자동 갱신)
// ---------------------------------------------------------------------------

interface AuthCtx {
  client: SupabaseClient
  userId: string
  email: string
  packed: string
}

/**
 * 계정 이메일. 비즈 앱 전환 전에 카카오로 가입한 계정은 auth.users.email 이 비어 있고,
 * 이후 로그인에서 카카오가 준 이메일은 identities[].identity_data.email 에만 들어온다. 그 값을 대체로 쓴다.
 */
function emailOf(user: { email?: string | null; identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null }): string {
  if (user.email) return user.email
  for (const id of user.identities ?? []) {
    const e = id.identity_data?.email
    if (typeof e === 'string' && e.includes('@')) return e
  }
  return ''
}

async function resolveAuth(init: RequestInit | undefined): Promise<AuthCtx | null> {
  const packed = extractPackedToken(init)
  if (!packed) return null
  const { access, refresh } = unpackToken(packed)

  const authClient = makeAuthClient()
  const { data: userData } = await authClient.auth.getUser(access)
  if (userData?.user) {
    return { client: dataClientFor(access), userId: userData.user.id, email: emailOf(userData.user), packed }
  }

  // access 만료 → refresh로 조용히 갱신 시도
  if (refresh) {
    const { data: refreshed } = await authClient.auth.refreshSession({ refresh_token: refresh })
    const session = refreshed?.session
    if (session?.access_token) {
      const newPacked = packToken(session.access_token, session.refresh_token)
      // 저장 토큰이 이 토큰이었다면 갱신본으로 교체(다음 요청부터 새 토큰 사용)
      if (getStoredAccessToken() === packed) setStoredAccessToken(newPacked)
      const { data: u2 } = await authClient.auth.getUser(session.access_token)
      if (u2?.user) {
        return { client: dataClientFor(session.access_token), userId: u2.user.id, email: emailOf(u2.user), packed: newPacked }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// 게시글 행 ↔ aiapp 응답 모양 변환
// ---------------------------------------------------------------------------

interface PostRow {
  id: string
  board_id: string
  author_id: string
  author_name: string
  title: string
  content: string | null
  is_hidden: boolean
  attachments: Array<{ id: number; file_name: string; url: string }> | null
  views: number
  created_at: string
  updated_at: string | null
}

function toListItem(row: PostRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    views: row.views ?? 0,
    author_id: row.author_id,
    author_name: row.author_name,
    is_hidden: row.is_hidden,
    created_at: row.created_at,
    categories: null,
    link_url: null,
    rating: null,
  }
}

function toDetail(row: PostRow) {
  return {
    id: row.id,
    board_id: row.board_id,
    title: row.title,
    content: row.content ?? '',
    views: row.views ?? 0,
    author_id: row.author_id,
    author_name: row.author_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    attachments: row.attachments ?? [],
    categories: null,
    link_url: null,
    rating: null,
    board_settings: null,
  }
}

// ---------------------------------------------------------------------------
// 업로드(presign 에뮬레이션): file_id ↔ 스토리지 경로 매핑(세션 메모리)
// ---------------------------------------------------------------------------

const UPLOAD_SCHEME = 'sb-upload://'
let uploadSeq = 1
const pendingUploads = new Map<number, { path: string; contentType: string; fileName: string; cdnUrl: string }>()

function publicUrlFor(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/board-files/${path}`
}

/**
 * [SEC-003] 비공개 버킷 전환 대응: board-files 스토리지 URL(또는 data: URL)을 받아
 * 표시 가능한 URL로 바꾼다. data: URL은 그대로, 스토리지 URL은 로그인 토큰으로 1시간짜리
 * 서명 URL을 발급해 돌려준다. 발급 실패(비로그인·토큰 만료 등) 시 null.
 * 주의: 댓글에는 기존 형식의 public 경로 문자열이 그대로 저장되며(하위 호환),
 * 이 함수가 표시 시점에 경로만 추출해 서명한다.
 */
/** 이메일 인증 완료 페이지에서 링크에 실려 온 세션을 로그인 세션으로 채택한다. */
export function adoptAuthSession(accessToken: string, refreshToken: string | null): void {
  setStoredAccessToken(packToken(accessToken, refreshToken))
}

/** 내 프로필(profiles) 일부 필드를 저장하고 캐시를 비운다. 계정정보 페이지의 역할·소속 저장에 사용. */
export async function updateMyProfileFields(fields: {
  individual_role?: string | null
  institution?: string | null
  // v1.1 — schema10-pilot-tracks.sql 적용 전에는 컬럼이 없어 실패할 수 있다. 호출부는 best-effort로 다룬다.
  pilot_tracks?: string[] | null
  birth_date?: string | null
  operation_type?: string | null
}): Promise<void> {
  const client = getAuthedDataClient()
  const userId = getAuthedUserId()
  if (!client || !userId) throw new Error('로그인이 필요합니다.')
  const { error } = await client.from('profiles').update(fields).eq('id', userId)
  if (error) throw new Error(error.message)
  profileCache.delete(userId)
}

/** 현재 로그인 액세스 토큰(원문). 인증 서버 직접 호출(계정 연결 등)에 사용. */
export function getAuthedAccessToken(): string | null {
  const packed = getStoredAccessToken()
  if (!packed) return null
  try {
    return unpackToken(packed).access
  } catch {
    return null
  }
}

/** 현재 로그인 사용자의 auth uid (JWT sub). 비로그인/파싱 실패 시 null. */
export function getAuthedUserId(): string | null {
  const packed = getStoredAccessToken()
  if (!packed) return null
  try {
    const { access } = unpackToken(packed)
    const payload = JSON.parse(atob(access.split('.')[1] ?? ''))
    return typeof payload?.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/** 현재 로그인 토큰이 실린 Supabase 클라이언트(정규 테이블 RLS 조회용). 비로그인 시 null. */
export function getAuthedDataClient() {
  const packed = getStoredAccessToken()
  if (!packed) return null
  const { access } = unpackToken(packed)
  return dataClientFor(access)
}

export async function createSignedBoardFileUrl(rawUrl: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  if (!rawUrl) return null
  if (rawUrl.startsWith('data:')) return rawUrl
  const marker = '/board-files/'
  const idx = rawUrl.indexOf(marker)
  if (idx === -1) return null
  const path = decodeURIComponent(rawUrl.slice(idx + marker.length))
  const packed = getStoredAccessToken()
  if (!packed) return null
  const { access } = unpackToken(packed)
  try {
    const { data, error } = await dataClientFor(access).storage.from('board-files').createSignedUrl(path, expiresInSeconds)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 메인: baasFetch
// ---------------------------------------------------------------------------

export async function baasFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

  // 업로드 2단계: presign URL로의 PUT을 스토리지 업로드로 라우팅
  if (url.startsWith(UPLOAD_SCHEME)) {
    return handleStoragePut(url, init)
  }

  // BaaS 경로가 아니면(외부 URL, data: URL 등) 진짜 fetch로 통과
  if (!url.startsWith(BAAS_BASE_URL)) {
    return fetch(input as RequestInfo, init)
  }

  const path = url.slice(BAAS_BASE_URL.length).split('?')[0]
  const query = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1) : '')
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = typeof init?.body === 'string' ? safeJson(init.body) : null

  try {
    // ---- 계정 ----
    if (path === '/account/login' && method === 'POST') return await handleLogin(body)
    if (path === '/account/signup-project' && method === 'POST') return await handleSignup(body)
    if (path === '/account/info' && method === 'GET') return await handleAccountInfo(init)
    if (path === '/account/logout' && method === 'POST') return ok(null)
    if (path === '/account/profile/change-password' && method === 'POST') return await handleChangePassword(init, body)

    // ---- 파일 업로드 presign ----
    if (path === '/upload/presign' && method === 'POST') return handlePresign(body)

    // ---- 게시판 ----
    const publicPosts = path.match(/^\/public\/boards\/[^/]+\/([^/]+)\/posts$/)
    if (publicPosts && method === 'GET') return await handleListPosts(publicPosts[1], query, init)

    const createPost = path.match(/^\/boards\/[^/]+\/([^/]+)\/posts$/)
    if (createPost && method === 'POST') return await handleCreatePost(createPost[1], body, init)

    const publicDetail = path.match(/^\/public\/boards\/posts\/([^/]+)$/)
    if (publicDetail && method === 'GET') return await handlePostDetail(publicDetail[1], init)

    const postOps = path.match(/^\/boards\/posts\/([^/]+)$/)
    if (postOps && method === 'PUT') return await handleUpdatePost(postOps[1], body, init)
    if (postOps && method === 'DELETE') return await handleDeletePost(postOps[1], init)

    const hiddenOp = path.match(/^\/boards\/posts\/([^/]+)\/hidden$/)
    if (hiddenOp && method === 'PATCH') return await handleToggleHidden(hiddenOp[1], body, init)

    const publicComments = path.match(/^\/public\/boards\/posts\/([^/]+)\/comments$/)
    if (publicComments && method === 'GET') return await handleListComments(publicComments[1], init)
    // v1.1 — 여러 게시글의 댓글을 한 번에 (서명 요청함·승인 목록의 N+1 조회 제거)
    if (path === '/public/boards/comments/batch' && method === 'GET') return await handleListCommentsBatch(query.get('post_ids') ?? '', init)

    const createComment = path.match(/^\/boards\/posts\/([^/]+)\/comments$/)
    if (createComment && method === 'POST') return await handleCreateComment(createComment[1], body, init)

    return fail(404, `알 수 없는 API 경로입니다: ${path}`)
  } catch (e) {
    return fail(500, toErrorMessage(e, '서버 처리 중 오류가 발생했습니다.'))
  }
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 계정 핸들러
// ---------------------------------------------------------------------------

async function handleLogin(body: Record<string, unknown> | null): Promise<Response> {
  const email = String(body?.user_id ?? '')
  const password = String(body?.user_pw ?? body?.password ?? '')
  if (!email || !password) return fail(400, '아이디와 비밀번호를 입력해주세요.')

  const auth = makeAuthClient()
  const { data, error } = await auth.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    if (/confirm/i.test(error?.message ?? '')) {
      return fail(401, '이메일 인증이 완료되지 않았어요. 받은 메일의 [이메일 인증하기] 버튼을 눌러주세요.')
    }
    return fail(401, '아이디 또는 비밀번호가 올바르지 않습니다.')
  }
  const packed = packToken(data.session.access_token, data.session.refresh_token)
  return ok({ access_token: packed, token_type: 'bearer' })
}

/** 이메일 인증 가입 경로: 프로필이 아직 없으면 가입 시 동봉한 메타데이터로 즉석 생성한다. */
async function ensureProfileFromMetadata(ctx: AuthCtx): Promise<ProfileRow | null> {
  try {
    const { access } = unpackToken(ctx.packed)
    const { data: userData } = await makeAuthClient().auth.getUser(access)
    const meta = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>
    const row = {
      id: ctx.userId,
      user_type: (meta.user_type as string) === 'organization' ? 'organization' : 'individual',
      name: String(meta.name ?? ctx.email.split('@')[0] ?? '회원'),
      individual_role: (meta.individual_role as string) ?? null,
      institution: (meta.organization_affiliation as string) ?? null,
      phone: (meta.phone as string) ?? null,
    }
    const { error } = await ctx.client.from('profiles').upsert(row)
    if (error) return null
    // v1.1 — pilot_tracks 컬럼은 schema10 적용 후에만 존재. 없으면 조용히 무시.
    if (Array.isArray(meta.pilot_tracks)) {
      await ctx.client.from('profiles').update({ pilot_tracks: meta.pilot_tracks }).eq('id', ctx.userId).then(() => undefined, () => undefined)
    }
    profileCache.delete(ctx.userId)
    return await getProfile(ctx.client, ctx.userId)
  } catch {
    return null
  }
}

async function accountResponseFor(ctx: AuthCtx): Promise<Record<string, unknown>> {
  let profile = await getProfile(ctx.client, ctx.userId)
  if (!profile) profile = await ensureProfileFromMetadata(ctx)
  return {
    id: ctx.userId,
    user_id: ctx.email,
    name: profile?.name ?? ctx.email.split('@')[0],
    phone: profile?.phone ?? '',
    is_profile_completed: true,
    last_logged_at: null,
    created_at: profile?.created_at ?? new Date().toISOString(),
    data: {
      user_type: profile?.user_type ?? 'individual',
      individual_role: profile?.individual_role ?? undefined,
      organization_affiliation: profile?.institution ?? undefined,
      pilot_tracks: (profile as { pilot_tracks?: string[] } | null)?.pilot_tracks ?? undefined,
      birth_date: (profile as { birth_date?: string } | null)?.birth_date ?? undefined,
      operation_type: (profile as { operation_type?: string } | null)?.operation_type ?? undefined,
    },
  }
}

async function handleAccountInfo(init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  return ok(await accountResponseFor(ctx))
}

async function handleSignup(body: Record<string, unknown> | null): Promise<Response> {
  const email = String(body?.user_id ?? '')
  const password = String(body?.user_pw ?? body?.password ?? '')
  const name = String(body?.name ?? '')
  const phone = String(body?.phone ?? '')
  const extra = (body?.data ?? {}) as Record<string, unknown>
  if (!email || !password || !name) return fail(400, '필수 정보를 입력해주세요.')

  const auth = makeAuthClient()
  const { data, error } = await auth.auth.signUp({
    email,
    password,
    options: {
      // 인증 완료 후 첫 계정 조회 때 프로필을 자동 생성할 수 있도록 가입 정보를 메타데이터로 동봉
      data: {
        name,
        phone: phone || null,
        user_type: (extra.user_type as string) === 'organization' ? 'organization' : 'individual',
        individual_role: (extra.individual_role as string) ?? null,
        pilot_tracks: Array.isArray(extra.pilot_tracks) ? extra.pilot_tracks : null,
        organization_affiliation: (extra.organization_affiliation as string) ?? null,
      },
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  })
  if (error) {
    const msg = /already/i.test(error.message) ? '이미 가입된 이메일입니다.' : error.message
    return fail(400, msg)
  }
  const session = data.session
  if (!session) {
    // 이메일 인증(Confirm email) 사용 중 — 인증 메일이 발송되었고, 인증 완료 시 프로필이 자동 생성된다.
    // [주의] 이미 가입된(미인증 포함) 이메일이면 Supabase는 오류 없이 identities 가 빈 사용자를 돌려주고 메일은 보내지 않는다.
    //        이 경우를 "보냈어요"로 안내하면 사용자는 메일을 기다리기만 하게 된다.
    const alreadyRegistered = Array.isArray(data.user?.identities) && data.user.identities.length === 0
    return ok({ pending_verification: true, user_id: email, already_registered: alreadyRegistered })
  }

  const client = dataClientFor(session.access_token)
  const profileRow = {
    id: data.user!.id,
    user_type: (extra.user_type as string) === 'organization' ? 'organization' : 'individual',
    name,
    individual_role: (extra.individual_role as string) ?? null,
    institution: (extra.organization_affiliation as string) ?? null,
    phone: phone || null,
  }
  const { error: profileError } = await client.from('profiles').upsert(profileRow)
  if (profileError) return fail(500, `프로필 저장에 실패했습니다: ${profileError.message}`)
  profileCache.delete(data.user!.id)

  const ctx: AuthCtx = {
    client,
    userId: data.user!.id,
    email,
    packed: packToken(session.access_token, session.refresh_token),
  }
  return ok(await accountResponseFor(ctx))
}

async function handleChangePassword(init: RequestInit | undefined, body: Record<string, unknown> | null): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const current = String(body?.current_password ?? '')
  const next = String(body?.new_password ?? '')
  if (!current || !next) return fail(400, '비밀번호를 입력해주세요.')

  const auth = makeAuthClient()
  const { error: verifyError } = await auth.auth.signInWithPassword({ email: ctx.email, password: current })
  if (verifyError) return fail(400, '현재 비밀번호가 올바르지 않습니다.')

  const { refresh } = unpackToken(ctx.packed)
  const scoped = makeAuthClient()
  const { error: setError } = await scoped.auth.setSession({
    access_token: unpackToken(ctx.packed).access,
    refresh_token: refresh ?? '',
  })
  if (setError) return fail(500, '세션 확인에 실패했습니다. 다시 로그인해주세요.')
  const { error: updateError } = await scoped.auth.updateUser({ password: next })
  if (updateError) return fail(500, `비밀번호 변경에 실패했습니다: ${updateError.message}`)
  return ok(null)
}

// ---------------------------------------------------------------------------
// 게시판 핸들러
// ---------------------------------------------------------------------------

async function handleListPosts(boardId: string, query: URLSearchParams, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const offset = Number(query.get('offset') ?? 0)
  const limit = Math.min(Number(query.get('limit') ?? 20), 100)

  // v1.1 — author=me: 본인 게시글만 서버에서 거른다. 로그북·자격증·개인설정처럼 "내 것"만 필요한 목록이
  // 게시판 전체(모든 사용자)를 100건씩 끝까지 내려받던 문제 해결. 사용자·기록이 늘어도 요청 수가 늘지 않는다.
  let q = ctx.client
    .from('board_posts')
    .select('*', { count: 'exact' })
    .eq('board_id', boardId)
  if (query.get('author') === 'me') q = q.eq('author_id', ctx.userId)
  const { data, count, error } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (error) return fail(500, error.message)

  return ok({
    items: (data as PostRow[]).map(toListItem),
    total_count: count ?? data.length,
    offset,
    limit,
    board_settings: null,
  })
}

async function handleCreatePost(boardId: string, body: Record<string, unknown> | null, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const profile = await getProfile(ctx.client, ctx.userId)

  const fileIds = Array.isArray(body?.file_ids) ? (body!.file_ids as number[]) : []
  const attachments = fileIds.flatMap((id) => {
    const u = pendingUploads.get(id)
    return u ? [{ id, file_name: u.fileName, url: u.cdnUrl }] : []
  })

  const { data, error } = await ctx.client
    .from('board_posts')
    .insert({
      board_id: boardId,
      author_id: ctx.userId,
      author_name: profile?.name ?? ctx.email.split('@')[0],
      title: String(body?.title ?? ''),
      content: String(body?.content ?? ''),
      is_hidden: Boolean(body?.is_hidden ?? false),
      attachments,
    })
    .select('*')
    .single()
  if (error) return fail(500, error.message)
  return ok(toDetail(data as PostRow))
}

async function handlePostDetail(postId: string, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const { data, error } = await ctx.client.from('board_posts').select('*').eq('id', postId).maybeSingle()
  if (error) return fail(500, error.message)
  if (!data) return fail(404, '게시글을 찾을 수 없습니다.')
  return ok(toDetail(data as PostRow))
}

async function handleUpdatePost(postId: string, body: Record<string, unknown> | null, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const patch: Record<string, unknown> = {}
  if (typeof body?.title === 'string') patch.title = body.title
  if (typeof body?.content === 'string') patch.content = body.content
  const { data, error } = await ctx.client
    .from('board_posts')
    .update(patch)
    .eq('id', postId)
    .select('*')
    .maybeSingle()
  if (error) return fail(500, error.message)
  if (!data) return fail(403, '수정 권한이 없거나 게시글이 없습니다.')
  return ok(toDetail(data as PostRow))
}

async function handleDeletePost(postId: string, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const { error } = await ctx.client.from('board_posts').delete().eq('id', postId)
  if (error) return fail(500, error.message)
  return ok(null)
}

async function handleToggleHidden(postId: string, body: Record<string, unknown> | null, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const { data, error } = await ctx.client
    .from('board_posts')
    .update({ is_hidden: Boolean(body?.is_hidden) })
    .eq('id', postId)
    .select('*')
    .maybeSingle()
  if (error) return fail(500, error.message)
  if (!data) return fail(403, '변경 권한이 없거나 게시글이 없습니다.')
  return ok(toDetail(data as PostRow))
}

interface CommentRow {
  id: string
  post_id: string
  author_id: string
  author_name: string
  content: string
  is_hidden: boolean
  created_at: string
  updated_at: string | null
}

async function handleListComments(postId: string, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const { data, count, error } = await ctx.client
    .from('board_comments')
    .select('*', { count: 'exact' })
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) return fail(500, error.message)
  const items = (data as CommentRow[]).map((c) => ({ ...c, replies: [] as never[] }))
  return ok({ items, total_count: count ?? items.length })
}

async function handleListCommentsBatch(postIdsCsv: string, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const ids = postIdsCsv.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500)
  if (ids.length === 0) return ok({ items: [], total_count: 0 })
  const { data, error } = await ctx.client
    .from('board_comments')
    .select('*')
    .in('post_id', ids)
    .order('created_at', { ascending: true })
  if (error) return fail(500, error.message)
  const items = (data as CommentRow[]).map((c) => ({ ...c, replies: [] as never[] }))
  return ok({ items, total_count: items.length })
}

async function handleCreateComment(postId: string, body: Record<string, unknown> | null, init?: RequestInit): Promise<Response> {
  const ctx = await resolveAuth(init)
  if (!ctx) return fail(401, '로그인이 필요합니다.')
  const profile = await getProfile(ctx.client, ctx.userId)
  const { data, error } = await ctx.client
    .from('board_comments')
    .insert({
      post_id: postId,
      author_id: ctx.userId,
      author_name: profile?.name ?? ctx.email.split('@')[0],
      content: String(body?.content ?? ''),
    })
    .select('*')
    .single()
  if (error) return fail(500, error.message)
  return ok({ ...(data as CommentRow), replies: [] })
}

// ---------------------------------------------------------------------------
// 업로드 핸들러
// ---------------------------------------------------------------------------

function handlePresign(body: Record<string, unknown> | null): Response {
  const filename = String(body?.filename ?? `file-${Date.now()}`)
  const contentType = String(body?.content_type ?? 'application/octet-stream')
  // [BUGFIX] 저장소 객체 키에는 한글·공백 등이 들어가면 거부된다("Invalid key").
  // 예전에는 가-힣을 그대로 남겨서, 한글 이름 사진(예: 자격증사진.jpg)은 업로드가 항상 실패했다.
  // 원본 파일명은 pendingUploads 에 따로 보관하므로 표시에는 영향이 없다.
  const dot = filename.lastIndexOf('.')
  const ext = dot > 0 ? filename.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : ''
  const base = (dot > 0 ? filename.slice(0, dot) : filename).replace(/[^a-zA-Z0-9._-]/g, '')
  const safeName = `${base.slice(0, 40) || 'file'}${ext ? `.${ext}` : ''}`
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
  const fileId = uploadSeq++
  const cdnUrl = publicUrlFor(path)
  pendingUploads.set(fileId, { path, contentType, fileName: filename, cdnUrl })

  // presign 엔드포인트는 boolean result envelope을 쓴다(훅이 그렇게 파싱함)
  return new Response(
    JSON.stringify({
      result: true,
      data: { original: { presign_url: `${UPLOAD_SCHEME}${path}`, cdn_url: cdnUrl }, file_id: fileId },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

async function handleStoragePut(url: string, init?: RequestInit): Promise<Response> {
  const path = url.slice(UPLOAD_SCHEME.length)
  const packed = getStoredAccessToken()
  if (!packed) return fail(401, '로그인이 필요합니다.')
  const { access } = unpackToken(packed)
  const client = dataClientFor(access)
  const bodyBlob = init?.body as Blob | ArrayBuffer | undefined
  if (!bodyBlob) return fail(400, '업로드할 파일이 없습니다.')
  const contentType =
    (init?.headers && (init.headers as Record<string, string>)['Content-Type']) || 'application/octet-stream'
  const { error } = await client.storage.from('board-files').upload(path, bodyBlob, { contentType, upsert: true })
  if (error) return fail(500, `파일 업로드 실패: ${error.message}`)
  return new Response(null, { status: 200 })
}
