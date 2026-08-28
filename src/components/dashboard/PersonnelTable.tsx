import React from 'react'
import { Building2, Eye, EyeOff, Users } from 'lucide-react'

import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import {
  type ParsedNearestExpiry,
  parseAffiliationFromStatusShareTitle,
  parseNearestExpiryFromContent,
  parseOverallGoFromContent,
  parseRoleLabelFromContent,
  parseStatusShareTitle,
  parseTotalHoursFromContent,
} from '../../lib/statusShare'
import type { BoardPostListItem } from '../../lib/baas/boardTypes'

/** "상태공유" 게시글에서 역할을 파싱하지 못한 경우 표시하는 안전한 기본값. */
export const UNKNOWN_ROLE_LABEL = '미확인'

/** 기관 대시보드 "구성원 현황" 탭에서 사용하는 인력 1행. "상태공유" 게시판 게시글 하나를 가공한 결과다. */
export interface PersonnelRow {
  id: string
  name: string
  userId: string
  roleLabel: string
  affiliation: string | null
  totalHours: number | null
  overallGo: boolean | null
  nearestExpiry: ParsedNearestExpiry | null
  /** 기관 관리자가 이 화면에서만 숨김 처리했는지 여부(실제 게시글 삭제 아님). 기본값 false로 취급. */
  isDismissed?: boolean
}

/**
 * "상태공유" 게시글 하나를 구성원 현황 표 한 행으로 변환한다. 신규 필드(직무/누적 비행시간)
 * 도입 이전에 공유된 게시글 등 파싱에 실패하는 값은 안전한 기본값으로 대체한다.
 */
export function buildPersonnelRow(post: BoardPostListItem): PersonnelRow {
  const parsedTitle = parseStatusShareTitle(post.title)
  return {
    id: post.id,
    name: parsedTitle?.name ?? post.author_name,
    userId: parsedTitle?.userId ?? '',
    roleLabel: parseRoleLabelFromContent(post.content) ?? UNKNOWN_ROLE_LABEL,
    affiliation: parseAffiliationFromStatusShareTitle(post.title),
    totalHours: parseTotalHoursFromContent(post.content),
    overallGo: parseOverallGoFromContent(post.content),
    nearestExpiry: parseNearestExpiryFromContent(post.content),
  }
}

interface PersonnelTableProps {
  personnel: PersonnelRow[]
  /**
   * 필터 적용 전 전체 인력 수. 0이면 "아직 아무도 공유하지 않음" 안내를,
   * 0보다 크면(즉, 필터 때문에 목록이 비었으면) 필터 변경 안내를 보여준다.
   * 전달하지 않으면 항상 필터 변경 안내를 보여준다(기존 동작 유지).
   */
  totalCount?: number
  /** 행의 "목록에서 제외" 버튼 클릭 시 호출(게시글 id 전달). 전달하지 않으면 버튼을 숨긴다. */
  onDismiss?: (postId: string) => void
  /** 숨김 처리된 행의 "숨김 해제" 버튼 클릭 시 호출(게시글 id 전달). */
  onRestore?: (postId: string) => void
}

export function PersonnelTable({ personnel, totalCount, onDismiss, onRestore }: PersonnelTableProps) {
  if (personnel.length === 0) {
    const noneSharedYet = totalCount === 0
    return (
      <EmptyState
        surface="dark"
        icon={Users}
        title={noneSharedYet ? '아직 상태를 공유한 소속 인력이 없습니다' : '조건에 맞는 인력이 없습니다'}
        description={
          noneSharedYet
            ? '개인 계정으로 로그인해 로그북 탭에서 "내 상태를 소속 기관에 공유" 버튼을 눌러야 이 목록에 나타납니다.'
            : '필터를 변경해 다른 인력을 확인해 보세요.'
        }
      />
    )
  }

  return (
    <div data-mbaas-oid="fjt81wy" className="overflow-x-auto rounded-card border border-white/15 bg-white/[0.07] shadow-lg backdrop-blur-xl">
      <table data-mbaas-oid="55jx5xl" className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead data-mbaas-oid="z8gv5gu">
          <tr data-mbaas-oid="lj7pmm2" className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
            <th data-mbaas-oid="cfje8ws" scope="col" className="py-3 pl-6 pr-4 font-medium">인력</th>
            <th data-mbaas-oid="15i301w" scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell">역할</th>
            <th data-mbaas-oid="jivjxk7" scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell">소속</th>
            <th data-mbaas-oid="ira7y1u" scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell">누적 비행시간</th>
            <th data-mbaas-oid="7fk40ye" scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell">최근 자격 만료</th>
            <th data-mbaas-oid="ofkg2mm" scope="col" className="py-3 pr-4 font-medium">상태</th>
            {(onDismiss || onRestore) && (
              <th data-mbaas-oid="dpk9xac" scope="col" className="py-3 pr-6 font-medium text-right">관리</th>
            )}
          </tr>
        </thead>
        <tbody data-mbaas-oid="bzahbtx">
          {personnel.map((p) => (
            <tr
              data-mbaas-oid="pbehfbc" key={p.id}
              className={`border-b border-white/5 last:border-b-0 ${p.isDismissed ? 'opacity-50' : ''}`}
            >
              <td data-mbaas-oid="jdk1pqy" className="py-3 pl-6 pr-4">
                <p data-mbaas-oid="vct9vx0" className="font-medium text-white">{p.name}</p>
                <p data-mbaas-oid="kr9n3b5" className="font-mono-data text-xs text-slate-500">{p.userId || '이메일 미확인'}</p>
              </td>
              <td data-mbaas-oid="r59k35h" className="hidden py-3 pr-4 text-slate-300 sm:table-cell">{p.roleLabel}</td>
              <td data-mbaas-oid="cebayhq" className="hidden py-3 pr-4 sm:table-cell">
                <span
                  data-mbaas-oid="vbgck8g" className={`inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold
                    ${p.affiliation ? 'border-sky/30 bg-sky/10 text-sky' : 'border-white/15 text-slate-500'}`}
                >
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {p.affiliation || '소속 미기재'}
                </span>
              </td>
              <td data-mbaas-oid="qlvo9wy" className="hidden py-3 pr-4 font-mono-data tabular-nums text-slate-300 sm:table-cell">
                {p.totalHours != null ? `${p.totalHours.toFixed(1)}h` : '-'}
              </td>
              <td data-mbaas-oid="9kzpygu" className="hidden py-3 pr-4 text-slate-300 sm:table-cell">
                {p.nearestExpiry ? (
                  <>
                    <span data-mbaas-oid="vb8fevl" className="block text-xs text-slate-400">{p.nearestExpiry.name}</span>
                    <span data-mbaas-oid="xii5k2z" className="font-mono-data tabular-nums">{p.nearestExpiry.expiryDate}</span>
                  </>
                ) : (
                  '-'
                )}
              </td>
              <td data-mbaas-oid="xl6hgsd" className="py-3 pr-4">
                {p.overallGo === true ? (
                  <StatusBadge tone="success" surface="dark" dot label="GO" className="bg-go/15" />
                ) : p.overallGo === false ? (
                  <StatusBadge tone="danger" surface="dark" dot label="NO-GO" className="bg-rose-500/15 text-rose-400" />
                ) : (
                  <StatusBadge tone="neutral" surface="dark" label="상태 확인 불가" />
                )}
              </td>
              {(onDismiss || onRestore) && (
                <td data-mbaas-oid="2cnz5kv" className="py-3 pr-6 text-right">
                  {p.isDismissed ? (
                    onRestore && (
                      <button
                        data-mbaas-oid="rstrbtn" type="button"
                        onClick={() => onRestore(p.id)}
                        title="이 목록에서 다시 표시합니다."
                        className="inline-flex items-center gap-1 rounded-control border border-white/15 px-2 py-1 text-xs font-semibold text-slate-300
                          hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        숨김 해제
                      </button>
                    )
                  ) : (
                    onDismiss && (
                      <button
                        data-mbaas-oid="cnjk7jr" type="button"
                        onClick={() => onDismiss(p.id)}
                        title="탈퇴했거나 더 이상 유효하지 않은 회원을 이 목록에서만 숨깁니다(실제 데이터는 삭제되지 않음)."
                        className="inline-flex items-center gap-1 rounded-control border border-white/15 px-2 py-1 text-xs font-semibold text-slate-400
                          hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                      >
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        목록에서 제외
                      </button>
                    )
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
