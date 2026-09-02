// 구성원 현황 — 상태 공유 절차 없이 profiles 테이블을 직접 조회해 전 회원을 보여준다.
// 조회 권한: supabase/schema5-admin-directory.sql 의 정책(authorized_orgs 등록 계정만) 필요.

import { RefreshCw, Users } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { getAuthedDataClient } from '../../lib/baas/supabaseTransport'

interface MemberRow {
  id: string
  name: string
  user_type: 'individual' | 'organization'
  individual_role: string | null
  institution: string | null
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  pilot: '조종사',
  atc: '관제사',
  mechanic: '정비사',
  dispatcher: '운항관리사',
  drone_pilot: '드론 조종자',
}

export function MemberDirectoryPanel() {
  const [rows, setRows] = useState<MemberRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const client = getAuthedDataClient()
      if (!client) throw new Error('로그인이 필요합니다.')
      const { data, error: qError } = await client
        .from('profiles')
        .select('id,name,user_type,individual_role,institution,created_at')
        .order('created_at', { ascending: false })
      if (qError) throw new Error(qError.message)
      setRows((data ?? []) as MemberRow[])
    } catch (err) {
      const message = err instanceof Error ? err.message : '구성원 목록을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  if (isLoading) {
    return <p data-mbaas-oid="mdirld" className="text-sm text-slate-400">구성원 목록을 불러오는 중…</p>
  }

  if (error) {
    return (
      <div data-mbaas-oid="mdirer" className="rounded-card border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
        <p data-mbaas-oid="mdirer1">{error}</p>
        <p data-mbaas-oid="mdirer2" className="mt-2 text-xs text-slate-400">
          목록이 비어 보이면 Supabase에서 <code data-mbaas-oid="mdirer3">supabase/schema5-admin-directory.sql</code>을 실행했는지 확인하세요.
        </p>
        <div data-mbaas-oid="mdirer4" className="mt-3">
          <Button data-mbaas-oid="mdirer5" type="button" size="sm" variant="outline" tone="neutral" onClick={() => void fetchMembers()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const members = (rows ?? []).filter((r) => r.user_type === 'individual')

  if (members.length === 0) {
    return (
      <EmptyState
        data-mbaas-oid="mdirem" icon={Users}
        title="표시할 구성원이 없습니다"
        description="아직 가입한 회원이 없거나, 관리자 조회 권한(schema5 SQL)이 설정되지 않았습니다."
      />
    )
  }

  return (
    <div data-mbaas-oid="mdirwrap">
      <div data-mbaas-oid="mdirhead" className="flex items-center justify-between">
        <p data-mbaas-oid="mdircnt" className="text-sm text-slate-400">
          총 <span data-mbaas-oid="mdircnt2" className="font-mono-data font-semibold text-ink">{members.length}</span>명
        </p>
        <Button data-mbaas-oid="mdirrf" type="button" size="sm" variant="outline" tone="neutral" onClick={() => void fetchMembers()}>
          <RefreshCw data-mbaas-oid="mdirrfi" className="mr-1.5 h-3.5 w-3.5" aria-hidden={true} />
          새로고침
        </Button>
      </div>
      <div data-mbaas-oid="mdirtbl" className="mt-4 overflow-x-auto rounded-card border border-white/10">
        <table data-mbaas-oid="mdirt" className="w-full min-w-[560px] text-left text-sm">
          <thead data-mbaas-oid="mdirth" className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr data-mbaas-oid="mdirtr0">
              <th data-mbaas-oid="mdirh1" className="px-4 py-3">이름</th>
              <th data-mbaas-oid="mdirh2" className="px-4 py-3">역할</th>
              <th data-mbaas-oid="mdirh3" className="px-4 py-3">소속</th>
              <th data-mbaas-oid="mdirh4" className="px-4 py-3">가입일</th>
            </tr>
          </thead>
          <tbody data-mbaas-oid="mdirtb" className="divide-y divide-white/5">
            {members.map((m) => (
              <tr data-mbaas-oid="mdirtr" key={m.id} className="hover:bg-white/[0.03]">
                <td data-mbaas-oid="mdirc1" className="px-4 py-3 font-medium text-ink">{m.name}</td>
                <td data-mbaas-oid="mdirc2" className="px-4 py-3 text-slate-300">
                  {m.individual_role ? ROLE_LABEL[m.individual_role] ?? m.individual_role : '-'}
                </td>
                <td data-mbaas-oid="mdirc3" className="px-4 py-3 text-slate-300">{m.institution ?? '-'}</td>
                <td data-mbaas-oid="mdirc4" className="px-4 py-3 font-mono-data text-xs text-slate-400">
                  {new Date(m.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
