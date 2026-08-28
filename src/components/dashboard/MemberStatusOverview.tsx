import React, { useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Gauge, Info, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { KpiCard } from './KpiCard'
import { useAuth } from '../../contexts/AuthContext'
import { useStatusSharePosts } from '../../hooks/baas/useStatusSharePosts'
import { useOrganizationAffiliationOverride } from '../../hooks/useOrganizationAffiliationOverride'
import {
  normalizeAffiliation,
  parseAffiliationFromStatusShareTitle,
  parseNearestExpiryFromContent,
  parseOverallGoFromContent,
  parseStatusShareTitle,
  parseUpdatedAtFromContent,
} from '../../lib/statusShare'
import type { BoardPostListItem } from '../../lib/baas/boardTypes'

interface MemberStatus {
  post: BoardPostListItem
  name: string
  userId: string
  affiliation: string | null
  overallGo: boolean | null
  nearestExpiry: { name: string; expiryDate: string; daysUntil: number } | null
  updatedAtLabel: string
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('ko-KR')
  } catch {
    return value
  }
}

function buildMemberStatus(post: BoardPostListItem): MemberStatus {
  const parsedTitle = parseStatusShareTitle(post.title)
  const affiliation = parseAffiliationFromStatusShareTitle(post.title)
  const overallGo = parseOverallGoFromContent(post.content)
  const nearestExpiry = parseNearestExpiryFromContent(post.content)
  const updatedAtRaw = parseUpdatedAtFromContent(post.content)

  return {
    post,
    name: parsedTitle?.name ?? post.author_name,
    userId: parsedTitle?.userId ?? '',
    affiliation,
    overallGo,
    nearestExpiry,
    updatedAtLabel: updatedAtRaw ?? formatDateTime(post.created_at),
  }
}

/** NO-GO를 최상단에, 그다음 만료 임박(D-day 작은 순)으로 정렬한다. GO/NO-GO 판정 불가(null)는 중간에 배치한다. */
function statusRank(member: MemberStatus): number {
  if (member.overallGo === false) return 0
  if (member.overallGo === null) return 1
  return 2
}

function sortMembers(members: MemberStatus[]): MemberStatus[] {
  return [...members].sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b)
    if (rankDiff !== 0) return rankDiff
    const aDays = a.nearestExpiry?.daysUntil ?? Number.POSITIVE_INFINITY
    const bDays = b.nearestExpiry?.daysUntil ?? Number.POSITIVE_INFINITY
    return aDays - bDays
  })
}

function MemberRow({ member }: { member: MemberStatus }) {
  return (
    <li data-mbaas-oid="xhw93ji" className="rounded-control border border-white/10 bg-white/[0.04] p-4">
      <div data-mbaas-oid="k1a5jke" className="flex flex-wrap items-start justify-between gap-3">
        <div data-mbaas-oid="0rwixks" className="min-w-0">
          <p data-mbaas-oid="uambxlg" className="text-sm font-semibold text-white">
            {member.name}
          </p>
          <p data-mbaas-oid="i16l8ia" className="mt-0.5 font-mono-data text-xs tabular-nums text-slate-400">
            {member.userId || '이메일 미확인'}
          </p>
          <span
            data-mbaas-oid="agptp9a" className={`mt-2 inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold
              ${member.affiliation ? 'border-sky/30 bg-sky/10 text-sky' : 'border-white/15 text-slate-500'}`}
          >
            <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span data-mbaas-oid="vzxkhro">{member.affiliation || '소속 미기재'}</span>
          </span>
        </div>

        {member.overallGo === true ? (
          <StatusBadge tone="success" surface="dark" bordered icon={CheckCircle2} label="GO" />
        ) : member.overallGo === false ? (
          <StatusBadge tone="danger" surface="dark" bordered icon={AlertTriangle} label="NO-GO" />
        ) : (
          <StatusBadge tone="neutral" surface="dark" bordered label="상태 확인 불가" />
        )}
      </div>

      <div data-mbaas-oid="ks6qbqj" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {member.nearestExpiry ? (
          <p data-mbaas-oid="sv8gbku">
            임박 자격: {member.nearestExpiry.name} · {member.nearestExpiry.expiryDate} (D
            {member.nearestExpiry.daysUntil >= 0 ? `-${member.nearestExpiry.daysUntil}` : `+${Math.abs(member.nearestExpiry.daysUntil)}`})
          </p>
        ) : (
          <p data-mbaas-oid="40d4hgg">임박 자격 정보 없음</p>
        )}
        <p data-mbaas-oid="93twe99" className="font-mono-data tabular-nums">
          공유: {member.updatedAtLabel}
        </p>
      </div>
    </li>
  )
}

export function MemberStatusOverview() {
  const { account } = useAuth()
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account)
  const myAffiliation = affiliationOverride ?? account?.data?.organization_affiliation ?? undefined

  const { data, isLoading, error, refetch } = useStatusSharePosts({ limit: 100 })
  const [showAllAffiliations, setShowAllAffiliations] = useState(false)

  const items = data?.items ?? []
  const isScopedToMyAffiliation = Boolean(myAffiliation) && !showAllAffiliations

  const members = useMemo(() => {
    const normalizedMyAffiliation = normalizeAffiliation(myAffiliation)
    const scoped = isScopedToMyAffiliation
      ? items.filter(
          (item) => normalizeAffiliation(parseAffiliationFromStatusShareTitle(item.title)) === normalizedMyAffiliation,
        )
      : items
    return sortMembers(scoped.map(buildMemberStatus))
  }, [items, isScopedToMyAffiliation, myAffiliation])

  const goCount = members.filter((m) => m.overallGo === true).length
  const noGoCount = members.filter((m) => m.overallGo === false).length

  return (
    <div data-mbaas-oid="5h7gy7x" className="rounded-card border border-slate-200 bg-navy p-6">
      <div data-mbaas-oid="2zgtwue" className="flex flex-wrap items-center justify-between gap-3">
        <div data-mbaas-oid="7jizgpa">
          <h3 data-mbaas-oid="i28yj8n" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <Gauge className="h-4 w-4 text-sky" aria-hidden="true" />
            소속 회원 GO/NO-GO 현황
          </h3>
          <p data-mbaas-oid="ugnaogx" className="mt-1 text-xs text-slate-400">
            회원이 AWOS에서 "내 상태를 소속 기관에 공유" 버튼을 눌러 남긴 최신 스냅샷입니다. 실시간으로 자동 갱신되지
            않으니, 최신 정보를 원하면 회원에게 다시 공유를 요청하세요.
          </p>
        </div>

        {myAffiliation ? (
          <label
            data-mbaas-oid="53lddnj"
            className="flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300"
          >
            <input
              data-mbaas-oid="qfm041z" type="checkbox"
              checked={showAllAffiliations}
              onChange={(e) => setShowAllAffiliations(e.target.checked)}
              className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            />
            전체 보기 (소속 무관)
          </label>
        ) : null}
      </div>

      {!myAffiliation && (
        <div data-mbaas-oid="6c2nzzt" className="mt-4 flex items-start gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p data-mbaas-oid="9uxi0od" className="text-xs font-medium text-amber-300">
            계정정보에서 소속 기관을 먼저 설정해주세요. 소속 기관이 없으면 전체 회원 상태가 표시됩니다.{' '}
            <Link
              data-mbaas-oid="tt9pj90" to="/account"
              className="font-semibold underline underline-offset-2 hover:text-amber-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              계정정보로 이동
            </Link>
          </p>
        </div>
      )}

      <div data-mbaas-oid="zyhnm4z" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="공유된 회원" value={`${members.length}명`} hint="상태를 공유한 소속 회원 수" icon={Users} />
        <KpiCard label="정상(GO)" value={`${goCount}명`} hint="모든 기본 요건을 충족한 회원" tone="go" icon={ShieldCheck} />
        <KpiCard label="NO-GO" value={`${noGoCount}명`} hint="요건 미충족으로 확인이 필요한 회원" tone="risk" icon={AlertTriangle} />
      </div>

      {isLoading ? (
        <p data-mbaas-oid="j5tbl25" className="mt-6 text-sm text-slate-400">회원 상태를 불러오는 중입니다...</p>
      ) : error ? (
        <div data-mbaas-oid="yyjm939" role="alert" className="mt-6 rounded-control border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p data-mbaas-oid="h66so38" className="text-xs font-medium text-rose-300">{error}</p>
          <Button data-mbaas-oid="aymbdar" type="button" variant="outline" tone="neutral" size="sm" className="mt-3 border-white/25 text-white hover:bg-white/10" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          className="mt-6"
          surface="dark"
          icon={Users}
          title={items.length === 0 ? '아직 상태를 공유한 소속 회원이 없습니다' : '해당 소속의 공유된 회원 상태가 없습니다'}
          description={
            items.length === 0
              ? '회원이 로그북 탭에서 상태를 공유하면 이 목록에 나타납니다.'
              : '"전체 보기"로 다른 소속 회원도 확인할 수 있습니다.'
          }
        />
      ) : (
        <ul data-mbaas-oid="msov17b" className="mt-6 space-y-3">
          {members.map((member) => (
            <MemberRow key={member.post.id} member={member} />
          ))}
        </ul>
      )}
    </div>
  )
}
