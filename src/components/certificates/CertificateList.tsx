import React from 'react'
import { OctagonAlert, Shield, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react'

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
  const hoverBorderClass = accentHoverBorderClass ?? 'hover:border-sky'
  if (certificates.length === 0) {
    return (
      <div data-mbaas-oid="9j885qt" className="rounded-card border border-dashed border-white/15 bg-panel p-cardpad text-center text-sm text-slate-400">
        등록된 자격증이 없습니다. 위 등록 폼으로 첫 자격증을 추가해 보세요.
      </div>
    )
  }

  return (
    <ul data-mbaas-oid="as8g46c" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {sortedCertificates.map((cert) => {
        const status = getCertificateStatus(cert.expiryDate)
        const remaining = cert.expiryDate ? daysUntil(cert.expiryDate) : null
        const Icon = STATUS_ICON[status]
        const wallet = CATEGORY_WALLET_STYLE[cert.category] ?? CATEGORY_WALLET_STYLE['기타 자격']
        return (
          <li data-mbaas-oid="y1jh8j4" key={cert.id}>
            <button
              data-mbaas-oid="f519jek" type="button"
              onClick={() => onSelect(cert)}
              className={`w-full overflow-hidden rounded-card border border-white/10 bg-panel text-left transition-all duration-200
                ${hoverBorderClass} hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky`}
            >
              {/* 월렛 카드 헤더 — 실물 자격증처럼 카테고리별 색 밴드로 종류를 즉시 구분한다 */}
              <div className={`bg-gradient-to-br ${wallet.gradient} px-5 pb-4 pt-4`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono-data text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    {cert.category}
                  </span>
                  <span data-mbaas-oid="1jmrsue" className={`inline-flex shrink-0 items-center gap-1 rounded-control px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[status]}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {CERTIFICATE_STATUS_LABEL[status]}
                  </span>
                </div>
                <h3 data-mbaas-oid="5w1lvoh" className="mt-2 font-display text-lg font-extrabold tracking-tight text-white">
                  {cert.name}
                {cert.approvalStatus === 'approved' && (
                  <span data-mbaas-oid="apvbdg1" className="ml-2 rounded bg-go/15 px-1.5 py-0.5 text-[10px] font-semibold text-go">인증됨</span>
                )}
                {cert.approvalStatus === 'pending' && (
                  <span data-mbaas-oid="apvbdg2" className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">승인 대기</span>
                )}
                {cert.category === '무선통신사' && isCommEducationDue(cert.issuedDate) && cert.approvalStatus !== 'approved' && (
                  <span data-mbaas-oid="commbdg" className="ml-2 rounded bg-orange-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">교육 확인 필요</span>
                )}
                {cert.approvalStatus === 'rejected' && (
                  <span data-mbaas-oid="apvbdg3" className="ml-2 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">반려됨</span>
                )}
                </h3>
                <p data-mbaas-oid="swve2gh" className="mt-1 text-xs text-white/60">{cert.issuer}</p>
              </div>

              <div data-mbaas-oid="o4n89gc" className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                <span data-mbaas-oid="kbrjwb9" className="font-mono-data tabular-nums text-slate-400">
                  {cert.expiryDate ? `만료일 ${cert.expiryDate}` : `발급일 ${cert.issuedDate}`}
                </span>
                <span data-mbaas-oid="wu1emyu" className="font-mono-data tabular-nums text-xs font-semibold text-ink">
                  {remaining === null ? '만료 없음' : remaining >= 0 ? `D-${remaining}` : `만료 ${Math.abs(remaining)}일 경과`}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
