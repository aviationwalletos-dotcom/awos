// approval_requests 테이블 접근 계층(schema12).
//
// 원칙
//  - 목록은 서버에서 status/kind 로 걸러 받는다. 댓글 파싱·전체 스캔 없음.
//  - 판정은 RPC(decide_approval_request)로만 한다. 클라이언트가 status 를 직접 고치지 않는다.
//  - "승인된 교관" 집합은 짧게 캐시하고, 판정이 일어나면 즉시 비운다.

import { getAuthedDataClient, getAuthedUserId } from '../baas/supabaseTransport'
import type {
  ApprovalKind,
  ApprovalRequest,
  ApprovalStatus,
  ApprovedInstructor,
  CreateApprovalRequestInput,
  PilotTrack,
} from './types'

const TABLE = 'approval_requests'

function requireClient() {
  const client = getAuthedDataClient()
  const userId = getAuthedUserId()
  if (!client || !userId) throw new Error('로그인이 필요합니다.')
  return { client, userId }
}

/** 테이블이 아직 없을 때(schema12 미실행) 사용자에게 보여줄 메시지로 바꾼다 */
function translateError(message: string): string {
  if (/approval_requests/.test(message) && /does not exist|relation|schema cache/i.test(message)) {
    return '서명·승인 테이블이 아직 서버에 없습니다(schema12 SQL 실행 필요).'
  }
  if (/decide_approval_request|cancel_approval_request/.test(message) && /function|schema cache/i.test(message)) {
    return '판정 기능이 아직 서버에 없습니다(schema12 SQL 실행 필요).'
  }
  return message
}

export interface ListApprovalParams {
  kind?: ApprovalKind | ApprovalKind[]
  status?: ApprovalStatus | ApprovalStatus[]
  /** 요청자 본인 / 서명 대상 교관(inbox) / 관리자 전체(admin) */
  scope: 'mine' | 'inbox' | 'admin'
  subjectId?: string
  track?: PilotTrack
  limit?: number
}

export async function listApprovalRequests(params: ListApprovalParams): Promise<ApprovalRequest[]> {
  const { client, userId } = requireClient()
  let q = client.from(TABLE).select('*').order('created_at', { ascending: false }).limit(params.limit ?? 200)
  if (params.scope === 'mine') q = q.eq('requester_id', userId)
  else if (params.scope === 'inbox') q = q.eq('target_id', userId)
  // admin: RLS(is_awos_admin)가 범위를 정한다
  if (params.kind) q = Array.isArray(params.kind) ? q.in('kind', params.kind) : q.eq('kind', params.kind)
  if (params.status) q = Array.isArray(params.status) ? q.in('status', params.status) : q.eq('status', params.status)
  if (params.subjectId) q = q.eq('subject_id', params.subjectId)
  if (params.track) q = q.eq('track', params.track)
  const { data, error } = await q
  if (error) throw new Error(translateError(error.message))
  return (data ?? []) as ApprovalRequest[]
}

export async function fetchApprovalRequest(id: string): Promise<ApprovalRequest | null> {
  const { client } = requireClient()
  const { data, error } = await client.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(translateError(error.message))
  return (data as ApprovalRequest | null) ?? null
}

export async function createApprovalRequest(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
  const { client, userId } = requireClient()
  const row = {
    kind: input.kind,
    requester_id: userId,
    requester_name: input.requesterName,
    requester_email: input.requesterEmail ?? null,
    target_id: input.targetId ?? null,
    track: input.track ?? null,
    subject_id: input.subjectId ?? null,
    affiliation: input.affiliation ?? null,
    title: input.title,
    summary: input.summary ?? null,
    payload: input.payload ?? {},
    attachment_path: input.attachmentPath ?? null,
    status: 'pending' as const,
  }
  const { data, error } = await client.from(TABLE).insert(row).select('*').single()
  if (error) {
    // 대기중 중복(부분 유니크 인덱스)은 사용자 언어로
    if (/one_pending_idx|duplicate key/i.test(error.message)) {
      throw new Error('이미 대기중인 요청이 있습니다. 처리될 때까지 기다려 주세요.')
    }
    throw new Error(translateError(error.message))
  }
  invalidateApprovalCaches()
  return data as ApprovalRequest
}

export async function decideApprovalRequest(
  id: string,
  decision: 'approved' | 'rejected',
  options: { note?: string; signaturePath?: string } = {},
): Promise<ApprovalRequest> {
  const { client } = requireClient()
  const { data, error } = await client.rpc('decide_approval_request', {
    p_id: id,
    p_decision: decision,
    p_note: options.note ?? null,
    p_signature_path: options.signaturePath ?? null,
  })
  if (error) throw new Error(translateError(error.message))
  invalidateApprovalCaches()
  return data as ApprovalRequest
}

export async function cancelApprovalRequest(id: string): Promise<void> {
  const { client } = requireClient()
  const { error } = await client.rpc('cancel_approval_request', { p_id: id })
  if (error) throw new Error(translateError(error.message))
  invalidateApprovalCaches()
}

// ---------------------------------------------------------------------------
// 승인된 교관 집합 (짧은 캐시)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 2 * 60 * 1000
let instructorsCache: { at: number; promise: Promise<ApprovedInstructor[]> } | null = null

async function fetchApprovedInstructorsOnce(): Promise<ApprovedInstructor[]> {
  const client = getAuthedDataClient()
  if (!client) return []
  const { data, error } = await client
    .from(TABLE)
    .select('requester_id, requester_name, requester_email, track, affiliation, decided_at')
    .eq('kind', 'instructor')
    .eq('status', 'approved')
    .limit(500)
  if (error) return []
  return ((data ?? []) as Array<{
    requester_id: string
    requester_name: string
    requester_email: string | null
    track: PilotTrack
    affiliation: string | null
    decided_at: string | null
  }>).map((r) => ({
    userId: r.requester_id,
    name: r.requester_name,
    email: r.requester_email,
    track: r.track,
    affiliation: r.affiliation,
    approvedAt: r.decided_at,
  }))
}

/** 모든 구분의 승인 교관 목록(2분 캐시) */
export function fetchApprovedInstructors(): Promise<ApprovedInstructor[]> {
  const now = Date.now()
  if (instructorsCache && now - instructorsCache.at < CACHE_TTL_MS) return instructorsCache.promise
  const promise = fetchApprovedInstructorsOnce()
  instructorsCache = { at: now, promise }
  return promise
}

/** 승인 교관 uuid 집합 — 서명 판정(fail-closed)용. 구분을 주면 그 구분만. */
export async function fetchApprovedInstructorIdSet(track?: PilotTrack): Promise<ReadonlySet<string>> {
  const list = await fetchApprovedInstructors()
  return new Set(list.filter((i) => !track || i.track === track).map((i) => i.userId))
}

export function invalidateApprovalCaches(): void {
  instructorsCache = null
}
