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

import { BAAS_BASE_URL, getStoredAccessToken, setStoredAccessToken } from './config'

import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vflyqnbdquaanpkvuinz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_GwIFABkaVgmSrYPtrrVgww_bVQYP4oE'

// ---------------------------------------------------------------------------
// 클라이언트 팩토리
// ---------------------------------------------------------------------------

/** 세션을 전혀 저장하지 않는 인증 전용 클라이언트(로그인 검증·토큰 갱신·가입에만 사용). */
function makeAuthClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** 특정 access token의 권한으로 동작하는 데이터 클라이언트(간단 캐시). */
let cachedDataClient: { token: string; client: SupabaseClient } | null = null
function dataClientFor(accessToken: string): SupabaseClient {
  if (cachedDataClient?.token === accessToken) return cachedDataClient.client
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
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

async function resolveAuth(init: RequestInit | undefined): Promise<AuthCtx | null> {
  const packed = extractPackedToken(init)
  if (!packed) return null
  const { access, refresh } = unpackToken(packed)

  const authClient = makeAuthClient()
  const { data: userData } = await authClient.auth.getUser(access)
  if (userData?.user) {
    return { client: dataClientFor(access), userId: userData.user.id, email: userData.user.email ?? '', packed }
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
        return { client: dataClientFor(session.access_token), userId: u2.user.id, email: u2.user.email ?? '', packed: newPacked }
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
    return fail(401, '아이디 또는 비밀번호가 올바르지 않습니다.')
  }
  const packed = packToken(data.session.access_token, data.session.refresh_token)
  return ok({ access_token: packed, token_type: 'bearer' })
}

async function accountResponseFor(ctx: AuthCtx): Promise<Record<string, unknown>> {
  const profile = await getProfile(ctx.client, ctx.userId)
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
  const { data, error } = await auth.auth.signUp({ email, password })
  if (error) {
    const msg = /already/i.test(error.message) ? '이미 가입된 이메일입니다.' : error.message
    return fail(400, msg)
  }
  const session = data.session
  if (!session) {
    return fail(
      500,
      '가입은 접수되었으나 자동 로그인에 실패했습니다. 관리자에게 문의해주세요(이메일 확인 설정).',
    )
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

  const { data, count, error } = await ctx.client
    .from('board_posts')
    .select('*', { count: 'exact' })
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
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
  const safeName = filename.replace(/[^\w.\-가-힣]/g, '_')
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
