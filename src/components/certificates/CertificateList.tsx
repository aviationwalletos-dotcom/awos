import React, { useState } from 'react'
import { ChevronDown, ChevronUp, OctagonAlert, Shield, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react'

import { isCommEducationDue } from '../../data/certificateOptions'
import { CERTIFICATE_STATUS_LABEL, daysUntil, getCertificateStatus } from '../../types/certificate'
import type { Certificate, CertificateStatus } from '../../types/certificate'

const STATUS_BADGE: Record<CertificateStatus, string> = {
  valid: 'bg-go/10 text-go',
  warning: 'bg-amber-400/15 text-amber-300',
  urgent: 'bg-rose-500/100/15 text-rose-300',
  expired: 'bg-white/10 text-slate-400',
  no_expiry: 'bg-sky/15 text-sky-700',
}

// 실물 자격증 카드처럼 카테고리별 색 밴드(월렛 스타일). 채도를 낮춘 그라디언트로
// '장식'이 아니라 '분류 식별' 기능을 하게 한다.
const CATEGORY_WALLET_STYLE: Record<string, { gradient: string }> = {
  '조종사 자격증명': { gradient: 'from-sky-600/60 via-sky-700/35 to-panel' },
  '한정': { gradient: 'from-indigo-600/55 via-indigo-700/30 to-panel' },
  '조종교육증명': { gradient: 'from-violet-600/55 via-violet-700/30 to-panel' },
  '항공신체검사': { gradient: 'from-emerald-600/55 via-emerald-700/30 to-panel' },
  '법정교육': { gradient: 'from-amber-500/50 via-amber-700/25 to-panel' },
  '기타 자격': { gradient: 'from-slate-500/45 via-slate-700/25 to-panel' },
}

const STATUS_ICON: Record<CertificateStatus, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  valid: ShieldCheck,
  warning: TriangleAlert,
  urgent: OctagonAlert,
  expired: ShieldX,
  no_expiry: Shield,
}

interface CertificateListProps {
  certificates: Certificate[]
  onSelect: (certificate: Certificate) => void
  /** 로그인한 사용자의 역할 강조색(hover 테두리)에 사용할 Tailwind 클래스. 미지정 시 기본 sky 색상 사용 */
  accentHoverBorderClass?: string
}

export function CertificateList({ certificates, onSelect, accentHoverBorderClass }: CertificateListProps) {
  const sortedCertificates = [...certificates].sort((a, b) => {
    // 만료일 있는 유효 자격(임박순) → 만료 개념 없는 자격 → 만료된 자격 순으로 정렬
    const rank = (c: Certificate) => {
      const status = getCertificateStatus(c.expiryDate)
      if (status === 'expired') return 2
      if (status === 'no_expiry') return 1
      return 0
    }
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    const da = a.expiryDate ?? '9999-12-31'
    const db = b.expiryDate ?? '9999-12-31'
    if (da !== db) return da < db ? -1 : 1
    return b.updatedAt - a.updatedAt
  })
  void accentHoverBorderClass // 목록이 한 줄 행으로 바뀌어 카테고리 강조색은 왼쪽 띠로만 쓴다
  if (certificates.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-white/15 bg-panel p-cardpad text-center text-sm text-slate-400">
        등록된 자격증이 없어요. 위 등록 폼으로 첫 자격증을 추가해 보세요.
      </div>
    )
  }

  // 목록이 길면 아래 "자격증 등록"이 묻힌다 → 기본 3개만 보이고 나머지는 펼쳐보기
  const COLLAPSED_COUNT = 3
  const [isExpanded, setIsExpanded] = useState(false)
  const hiddenCount = Math.max(0, sortedCertificates.length - COLLAPSED_COUNT)
  const visibleCertificates = isExpanded || hiddenCount === 0 ? sortedCertificates : sortedCertificates.slice(0, COLLAPSED_COUNT)

  return (
    <>
    <ul className="divide-y divide-white/[0.08] overflow-hidden rounded-card border border-white/10 bg-panel">
      {visibleCertificates.map((cert) => {
        const status = getCertificateStatus(cert.expiryDate)
        const remaining = cert.expiryDate ? daysUntil(cert.expiryDate) : null
        const Icon = STATUS_ICON[status]
        const wallet = CATEGORY_WALLET_STYLE[cert.category] ?? CATEGORY_WALLET_STYLE['기타 자격']
        return (
          <li key={cert.id}>
            <button type="button"
              onClick={() => onSelect(cert)}
              data-testid="cert-item"
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky sm:px-4"
            >
              <span className={`h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${wallet.gradient}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="truncate text-sm font-bold text-ink">{cert.name}</span>
                  {cert.approvalStatus === 'approved' && (
                    <span className="rounded bg-go/15 px-1.5 py-0.5 text-[10px] font-semibold text-go">인증됨</span>
                  )}
                  {cert.approvalStatus === 'pending' && (
                    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">승인 대기</span>
                  )}
                  {cert.approvalStatus === 'rejected' && (
                    <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">반려됨</span>
                  )}
                  {cert.category === '무선통신사' && isCommEducationDue(cert.issuedDate) && cert.approvalStatus !== 'approved' && (
                    <span className="rounded bg-orange-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">교육 확인 필요</span>
                  )}
                </span>
                <span className="sr-only">
                  {cert.category} · {cert.issuer} · {cert.expiryDate ? `만료 ${cert.expiryDate}` : `발급 ${cert.issuedDate}`}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[status]}`}>
                  <Icon className="h-3 w-3" aria-hidden />
                  {CERTIFICATE_STATUS_LABEL[status]}
                </span>
                <span className="font-mono-data text-[11px] font-semibold tabular-nums text-slate-300">
                  {remaining === null ? '' : remaining >= 0 ? `D-${remaining}` : `만료 ${Math.abs(remaining)}일 경과`}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
    {hiddenCount > 0 && (
      <button type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        data-testid="cert-list-toggle"
        className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-control border border-white/10 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
            접기
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            {hiddenCount}개 더 보기
          </>
        )}
      </button>
    )}
    </>
  )
}
