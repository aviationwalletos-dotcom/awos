import React from 'react'
import { Info, ShieldAlert } from 'lucide-react'

import type { RequirementItem } from '../../lib/roleCompliance'
import { RequirementCard } from './RequirementCard'

interface ComplianceSectionProps {
  title: string
  description?: string
  items: RequirementItem[]
}

/**
 * 직군별 법정 요건 안내/현황 섹션 공통 wrapper.
 * 측정 가능한 항목은 자동 계산된 충족/미충족을, 측정이 어려운 항목은 "참고" 배지로 보여줘요.
 */
export function ComplianceSection({ title, description, items }: ComplianceSectionProps) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <div>
          <h3 className="font-display text-lg font-extrabold text-ink">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-4 flex items-start gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-300"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        이 화면은 참고자료를 근거로 한 자동 계산이며, 실제 법적 기준은 관련 법령 원문과 소속 기관 규정을 통해 반드시
        재확인해야 해요.
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <RequirementCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  )
}
