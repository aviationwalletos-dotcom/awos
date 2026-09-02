// 본인 전용 저장 테이블(user_logbook_entries / user_certificates) 접근 계층.
// 기존 게시판 동기화 훅들이 쓰던 "게시글 id" 자리에는 `tbl:{종류}:{앱 id}` 형태의
// 합성 id를 돌려주어, 상위 훅(useLogbookEntries/useCertificates)을 고치지 않고
// 저장 위치만 게시판 → 테이블로 바꾼다.

import { getAuthedDataClient, getAuthedUserId } from './supabaseTransport'

export type PrivateTable = 'user_logbook_entries' | 'user_certificates'

const KIND_BY_TABLE: Record<PrivateTable, string> = {
  user_logbook_entries: 'logbook',
  user_certificates: 'cert',
}
const TABLE_BY_KIND: Record<string, PrivateTable> = {
  logbook: 'user_logbook_entries',
  cert: 'user_certificates',
}

export function buildPrivatePostId(table: PrivateTable, appId: string): string {
  return `tbl:${KIND_BY_TABLE[table]}:${appId}`
}

export function parsePrivatePostId(postId: string): { table: PrivateTable; appId: string } | null {
  if (!postId.startsWith('tbl:')) return null
  const [, kind, ...rest] = postId.split(':')
  const table = TABLE_BY_KIND[kind]
  const appId = rest.join(':')
  if (!table || !appId) return null
  return { table, appId }
}

function requireClient() {
  const client = getAuthedDataClient()
  const userId = getAuthedUserId()
  if (!client || !userId) throw new Error('로그인이 필요합니다.')
  return { client, userId }
}

export async function upsertPrivateRecord(table: PrivateTable, appId: string, contentJson: string): Promise<void> {
  const { client, userId } = requireClient()
  let data: unknown
  try {
    data = JSON.parse(contentJson)
  } catch {
    throw new Error('저장할 데이터 형식이 올바르지 않습니다.')
  }
  const { error } = await client
    .from(table)
    .upsert({ user_id: userId, app_id: appId, data }, { onConflict: 'user_id,app_id' })
  if (error) throw new Error(error.message)
}

export async function deletePrivateRecord(table: PrivateTable, appId: string): Promise<void> {
  const { client, userId } = requireClient()
  const { error } = await client.from(table).delete().eq('user_id', userId).eq('app_id', appId)
  if (error) throw new Error(error.message)
}

export interface PrivateRecordRow {
  app_id: string
  data: unknown
}

export async function listMyPrivateRecords(table: PrivateTable): Promise<PrivateRecordRow[]> {
  const { client, userId } = requireClient()
  const { data, error } = await client
    .from(table)
    .select('app_id,data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(2000)
  if (error) throw new Error(error.message)
  return (data ?? []) as PrivateRecordRow[]
}

export async function fetchMyPrivateRecord(table: PrivateTable, appId: string): Promise<PrivateRecordRow | null> {
  const { client, userId } = requireClient()
  const { data, error } = await client
    .from(table)
    .select('app_id,data')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .limit(1)
  if (error) throw new Error(error.message)
  return ((data ?? [])[0] as PrivateRecordRow | undefined) ?? null
}
