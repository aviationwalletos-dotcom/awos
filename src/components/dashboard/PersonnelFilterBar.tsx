import React from 'react'

export type StatusFilter = 'all' | 'GO' | 'RISK'

interface PersonnelFilterBarProps {
  role: string
  status: StatusFilter
  /** 필터 목록에 노출할 역할 라벨(예: 조종사/정비사/관제사/운항관리사/드론조종사 + 실제 데이터에 나타난 그 외 라벨). */
  roleOptions: string[]
  onRoleChange: (v: string) => void
  onStatusChange: (v: StatusFilter) => void
  /** 사용자의 소속 기관(설정되어 있을 때만 "전체 보기" 체크박스를 노출). */
  myAffiliation?: string
  showAllAffiliations?: boolean
  onShowAllAffiliationsChange?: (v: boolean) => void
  /** "목록에서 제외" 처리한 회원도 함께 보여줄지 여부. 전달하지 않으면 토글을 숨긴다. */
  showDismissed?: boolean
  onShowDismissedChange?: (v: boolean) => void
}

const selectClass =
  'min-h-[44px] rounded-control border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-200 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

export function PersonnelFilterBar({
  role,
  status,
  roleOptions,
  onRoleChange,
  onStatusChange,
  myAffiliation,
  showAllAffiliations,
  onShowAllAffiliationsChange,
  showDismissed,
  onShowDismissedChange,
}: PersonnelFilterBarProps) {
  return (
    <div data-mbaas-oid="305ogrk" className="flex flex-wrap items-center gap-3">
      <label data-mbaas-oid="fdusybe" className="flex items-center gap-2 text-xs text-slate-400">
        역할
        <select
          data-mbaas-oid="93ywsht" className={selectClass}
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
        >
          <option data-mbaas-oid="quz3nnb" value="all">전체</option>
          {roleOptions.map((label) => (
            <option data-mbaas-oid="ibn9wxi" key={label} value={label}>{label}</option>
          ))}
        </select>
      </label>

      <label data-mbaas-oid="hlas3q3" className="flex items-center gap-2 text-xs text-slate-400">
        상태
        <select
          data-mbaas-oid="lihfi0r" className={selectClass}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        >
          <option data-mbaas-oid="pu1mldt" value="all">전체</option>
          <option data-mbaas-oid="zzijx3l" value="GO">정상(GO)</option>
          <option data-mbaas-oid="e2t1cl8" value="RISK">만료 임박</option>
        </select>
      </label>

      <div data-mbaas-oid="ny12jkf" className="ml-auto flex flex-wrap items-center gap-3">
        {myAffiliation && onShowAllAffiliationsChange ? (
          <label data-mbaas-oid="c0e25p5" className="flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200">
            <input
              data-mbaas-oid="v5uy1cq" type="checkbox"
              checked={Boolean(showAllAffiliations)}
              onChange={(e) => onShowAllAffiliationsChange(e.target.checked)}
              className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            />
            전체 보기 (소속 무관)
          </label>
        ) : null}

        {onShowDismissedChange ? (
          <label
            data-mbaas-oid="hgn3ka1" className="flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-control border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200"
            title="목록에서 제외 처리한 회원(예: 탈퇴 회원)도 함께 표시합니다."
          >
            <input
              data-mbaas-oid="0d9e1aw" type="checkbox"
              checked={Boolean(showDismissed)}
              onChange={(e) => onShowDismissedChange(e.target.checked)}
              className="h-4 w-4 accent-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            />
            숨긴 항목 보기
          </label>
        ) : null}
      </div>
    </div>
  )
}
