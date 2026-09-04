// 구성원 현황 v2 — profiles 직접 조회 + 각 회원의 비행기록·자격증 게시글을 읽어
// 총 비행시간 / 최근 비행 / 커런시(간이 GO)를 함께 표시한다.
// 목록이 비어 있으면 원인(권한 미적용 vs 세션 토큰)을 화면에서 직접 진단한다.

import { RefreshCw, Users } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { CERTIFICATE_BOARD_ID, LOGBOOK_BOARD_ID } from '../../lib/baas/config'
import { getAuthedDataClient, getAuthedUserId } from '../../lib/baas/supabaseTransport'
import { parseCertificateFromContent } from '../../lib/certificateSync'
import { computeFlightReadiness, isMedicalStatusValid } from '../../lib/flightReadiness'
import { sumHours } from '../../lib/hours'
import { parseLogbookEntryFromContent } from '../../lib/logbookSync'

import { daysUntil } from '../../types/certificate'
import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'

interface MemberRow {
  id: string
  name: string
  user_type: 'individual' | 'organization'
  individual_role: string | null
  institution: string | null
  created_at: string
}

interface MemberStats {
  totalHours: number
  lastFlight: string | null
  medicalValid: boolean
  recencyMet: boolean
  hasRecords: boolean
}

const ROLE_LABEL: Record<string, string> = {
  pilot: '조종사',
  atc: '관제사',
  mechanic: '정비사',
  dispatcher: '운항관리사',
  drone_pilot: '드론 조종자',
}

type EmptyReason = 'token' | 'policy' | 'not_admin' | null

export function MemberDirectoryPanel() {
  const [rows, setRows] = useState<MemberRow[]>([])
  const [stats, setStats] = useState<Record<string, MemberStats>>({})
  const [memberCerts, setMemberCerts] = useState<Record<string, Certificate[]>>({})
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reasonFor, setReasonFor] = useState<MemberRow | null>(null)
  const [statsNote, setStatsNote] = useState<string | null>(null)
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setEmptyReason(null)
    try {
      const client = getAuthedDataClient()
      if (!client) throw new Error('로그인 정보가 없습니다. 로그아웃 후 다시 로그인해 주세요.')

      const { data, error: qError } = await client
        .from('profiles')
        .select('id,name,user_type,individual_role,institution,created_at')
        .order('created_at', { ascending: false })
      if (qError) throw new Error(qError.message)
      const all = (data ?? []) as MemberRow[]
      setRows(all)

      const individuals = all.filter((r) => r.user_type === 'individual')
      if (individuals.length === 0) {
        if (all.length === 0) {
          // 자기 자신(profiles_select_own)조차 안 보이면 토큰이 인증으로 실리지 않은 것
          setEmptyReason('token')
        } else {
          // 자기 계정만 보임 → 이 계정이 관리자 명단(authorized_orgs)에 있는지 대조해 원인을 가른다
          const uid = getAuthedUserId()
          const { data: admins } = await client.from('authorized_orgs').select('user_id')
          const adminIds = new Set((admins ?? []).map((a) => String((a as { user_id: unknown }).user_id)))
          setEmptyReason(uid && adminIds.size > 0 && !adminIds.has(uid) ? 'not_admin' : 'policy')
        }
        setStats({})
        return
      }

      // 회원별 기록·자격증 집계 (게시판 원본을 직접 읽음 — 실패해도 목록은 유지)
      try {
        const [logbookRes, certRes, tableLogRes, tableCertRes] = await Promise.all([
          client.from('board_posts').select('author_id,content').eq('board_id', LOGBOOK_BOARD_ID).not('is_hidden', 'is', true).limit(1000),
          client.from('board_posts').select('author_id,content').eq('board_id', CERTIFICATE_BOARD_ID).not('is_hidden', 'is', true).limit(1000),
          client.from('user_logbook_entries').select('user_id,data').limit(5000),
          client.from('user_certificates').select('user_id,data').limit(5000),
        ])
        if (logbookRes.error) throw new Error(logbookRes.error.message)
        if (certRes.error) throw new Error(certRes.error.message)
        const tablesMissing = Boolean(tableLogRes.error || tableCertRes.error)

        const entriesByUser = new Map<string, Map<string, LogbookEntry>>()
        const certsByUser = new Map<string, Certificate[]>()
        const certIdsByUser = new Map<string, Set<string>>()

        // 1순위: 본인 전용 테이블(schema6) — 새 저장 방식의 원본
        if (!tablesMissing) {
          for (const row of tableLogRes.data ?? []) {
            const author = (row as { user_id: string | null }).user_id
            const entry = (row as { data: unknown }).data as LogbookEntry | null
            if (!author || !entry || typeof entry !== 'object' || !entry.id || !entry.date) continue
            if (!entriesByUser.has(author)) entriesByUser.set(author, new Map())
            entriesByUser.get(author)!.set(entry.id, entry)
          }
          for (const row of tableCertRes.data ?? []) {
            const author = (row as { user_id: string | null }).user_id
            const cert = (row as { data: unknown }).data as Certificate | null
            if (!author || !cert || typeof cert !== 'object' || !cert.id) continue
            if (!certsByUser.has(author)) certsByUser.set(author, [])
            if (!certIdsByUser.has(author)) certIdsByUser.set(author, new Set())
            certsByUser.get(author)!.push(cert)
            certIdsByUser.get(author)!.add(cert.id)
          }
        }

        // 2순위: 아직 이전되지 않은 게시판 기록으로 빈 곳을 보충
        for (const post of logbookRes.data ?? []) {
          const entry = parseLogbookEntryFromContent((post as { content: string | null }).content)
          const author = (post as { author_id: string | null }).author_id
          if (!entry || !author) continue
          if (!entriesByUser.has(author)) entriesByUser.set(author, new Map())
          if (entriesByUser.get(author)!.has(entry.id)) continue
          entriesByUser.get(author)!.set(entry.id, entry)
        }
        for (const post of certRes.data ?? []) {
          const cert = parseCertificateFromContent((post as { content: string | null }).content)
          const author = (post as { author_id: string | null }).author_id
          if (!cert || !author) continue
          if (certIdsByUser.get(author)?.has(cert.id)) continue
          if (!certsByUser.has(author)) certsByUser.set(author, [])
          certsByUser.get(author)!.push(cert)
        }
        if (tablesMissing) {
          setStatsNote('본인 전용 테이블(schema6)이 아직 없어 게시판 기준으로 집계했어요.')
        }

        const nextStats: Record<string, MemberStats> = {}
        for (const member of individuals) {
          const entries = [...(entriesByUser.get(member.id)?.values() ?? [])]
          const certificates = certsByUser.get(member.id) ?? []
          const totalHours = sumHours(entries.map((e) => e.blockTime))
          const lastFlight = entries.reduce<string | null>(
            (latest, e) => (!latest || e.date > latest ? e.date : latest),
            null,
          )
          const readiness = computeFlightReadiness(entries, certificates)
          const medicalValid =
            isMedicalStatusValid(readiness.medical.class1Status) || isMedicalStatusValid(readiness.medical.class2Status)
          nextStats[member.id] = {
            totalHours,
            lastFlight,
            medicalValid,
            recencyMet: readiness.recency.baseMet,
            hasRecords: entries.length > 0 || certificates.length > 0,
          }
        }
        setStats(nextStats)
        setMemberCerts(Object.fromEntries([...certsByUser.entries()]))
        try {
          const { data: emailRows } = await client.rpc('admin_member_emails')
          if (Array.isArray(emailRows)) {
            setEmails(Object.fromEntries(emailRows.map((r: { id: string; email: string }) => [r.id, r.email])))
          }
        } catch {
          // schema8 미실행 시 이메일 없이 진행
        }
        if (!tablesMissing) setStatsNote(null)
      } catch (aggErr) {
        setStats({})
        setStatsNote(aggErr instanceof Error ? aggErr.message : '기록 집계에 실패해 기본 정보만 표시합니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '구성원 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  if (isLoading) {
    return <p className="text-sm text-slate-400">구성원 현황을 불러오는 중…</p>
  }

  if (error) {
    return (
      <div className="rounded-card border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
        <p>{error}</p>
        <div className="mt-3">
          <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => void fetchMembers()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const members = rows.filter((r) => r.user_type === 'individual')

  if (members.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState icon={Users}
          title="표시할 구성원이 없습니다"
          description={
            emptyReason === 'not_admin'
              ? '진단 결과: 지금 로그인한 계정이 관리자 명단(authorized_orgs)에 없습니다 — 관리자 계정(AWOS 관리자)으로 로그인했는지 확인하거나, 이 계정을 명단에 추가해 주세요.'
              : emptyReason === 'policy'
                ? '진단 결과: 현재 관리자 본인 계정만 조회됩니다 — 관리자 조회 권한(schema5 SQL)이 아직 적용되지 않았습니다.'
                : '진단 결과: 본인 계정조차 조회되지 않습니다 — 로그인 세션 문제일 수 있으니 로그아웃 후 다시 로그인해 주세요.'
          }
        />
        {emptyReason === 'policy' && (
          <div className="rounded-card border border-amber-400/30 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-200">
            Supabase → SQL Editor에서 아래를 실행한 뒤 이 화면의 새로고침을 누르세요:
            <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-3 font-mono-data text-[11px] text-amber-100">{`create policy "profiles_select_authorized_admin" on public.profiles
  for select to authenticated
  using (exists (select 1 from public.authorized_orgs a
                 where a.user_id = auth.uid()));`}</pre>
          </div>
        )}
        <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => void fetchMembers()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden={true} />
          새로고침
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          총 <span className="font-mono-data font-semibold text-ink">{members.length}</span>명
          {statsNote && <span className="ml-2 text-xs text-amber-300">({statsNote})</span>}
        </p>
        <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => void fetchMembers()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden={true} />
          새로고침
        </Button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-card border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">역할</th>
              <th className="px-4 py-3">소속</th>
              <th className="px-4 py-3 text-right">총 비행시간</th>
              <th className="px-4 py-3">최근 비행</th>
              <th className="px-4 py-3">커런시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.map((m) => {
              const st = stats[m.id]
              return (
                <React.Fragment key={m.id}>
                <tr onClick={() => setExpandedId((prev) => (prev === m.id ? null : m.id))}
                  className="cursor-pointer hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    <span className="mr-1.5 inline-block text-[10px] text-slate-500">{expandedId === m.id ? '▼' : '▶'}</span>
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {m.individual_role ? ROLE_LABEL[m.individual_role] ?? m.individual_role : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{m.institution ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-mono-data tabular-nums text-ink">
                    {st ? `${st.totalHours.toFixed(1)}h` : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono-data text-xs text-slate-300">
                    {st?.lastFlight ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {!st || !st.hasRecords ? (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-400">기록 없음</span>
                    ) : st.medicalValid && st.recencyMet ? (
                      <span className="rounded bg-go/15 px-2 py-0.5 text-[11px] font-semibold text-go">GO</span>
                    ) : (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setReasonFor(m) }}
                        className="rounded bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 underline decoration-dotted underline-offset-2 hover:bg-amber-400/25"
                      >
                        확인 필요
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === m.id && (
                  <tr className="bg-white/[0.02]">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <p className="text-slate-300">
                          <span className="text-xs uppercase tracking-wide text-slate-500">계정 이메일 </span><br />
                          <span className="font-medium text-ink">{emails[m.id] ?? '(schema8 SQL 실행 시 표시)'}</span>
                        </p>
                        <p className="text-slate-300">
                          <span className="text-xs uppercase tracking-wide text-slate-500">가입일 </span><br />
                          <span className="font-mono-data text-ink">{String(m.created_at).slice(0, 10)}</span>
                        </p>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">보유 자격증 ({(memberCerts[m.id] ?? []).length}건)</p>
                        {(memberCerts[m.id] ?? []).length === 0 ? (
                          <p className="mt-1.5 text-sm text-slate-400">등록된 자격증이 없습니다.</p>
                        ) : (
                          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {(memberCerts[m.id] ?? []).map((cert) => {
                              const remain = cert.expiryDate ? daysUntil(cert.expiryDate) : null
                              return (
                                <li key={cert.id} className="flex items-center justify-between gap-2 rounded-control border border-white/10 bg-navy px-3 py-2 text-sm">
                                  <span className="min-w-0 truncate text-ink">
                                    <span className="mr-1.5 text-[10px] font-semibold text-slate-500">{cert.category}</span>
                                    {cert.name}
                                  </span>
                                  <span className={`shrink-0 font-mono-data text-xs font-bold ${
                                      remain === null ? 'text-slate-400' : remain < 0 ? 'text-rose-300' : remain <= 30 ? 'text-amber-300' : 'text-go'
                                    }`}
                                  >
                                    {remain === null ? '만료 없음' : remain < 0 ? `만료됨` : `D-${remain}`}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {reasonFor && (() => {
        const st = stats[reasonFor.id]
        const reasons = [
          !st?.medicalValid ? { title: '항공신체검사 미유효', detail: '유효한 항공신체검사증명이 등록되어 있지 않거나 만료되었습니다. 신체검사 갱신 후 자격증 탭에 등록해야 합니다.' } : null,
          !st?.recencyMet ? { title: '최근비행 기준 미달', detail: '최근 90일 내 이착륙 3회 이상 등 최근비행 요건을 충족하지 못했습니다. 기록이 누락됐다면 로그북에 추가하세요.' } : null,
        ].filter((r): r is { title: string; detail: string } => r !== null)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setReasonFor(null)}>
            <div className="w-full max-w-md rounded-card border border-white/10 bg-navy p-6" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">확인 필요 사유</p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-ink">{reasonFor.name}</h3>
              <ul className="mt-4 space-y-3">
                {reasons.map((r) => (
                  <li key={r.title} className="rounded-control border border-amber-400/25 bg-amber-400/5 p-3">
                    <p className="text-sm font-semibold text-amber-200">{r.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{r.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-slate-500">참고 판정(v0.9)이며 법령 기준 확정 후 갱신됩니다.</p>
              <div className="mt-4 text-right">
                <Button type="button" size="sm" variant="outline" tone="neutral" onClick={() => setReasonFor(null)}>닫기</Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
