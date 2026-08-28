import React from 'react'
import { OctagonAlert, Shield, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react'

import { CERTIFICATE_STATUS_LABEL, daysUntil, getCertificateStatus } from '../../types/certificate'
import type { Certificate, CertificateStatus } from '../../types/certificate'

const STATUS_BADGE: Record<CertificateStatus, string> = {
  valid: 'bg-go/10 text-go',
  warning: 'bg-amber-100 text-amber-700',
  urgent: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-200 text-slate-600',
  no_expiry: 'bg-sky-100 text-sky-700',
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
  const hoverBorderClass = accentHoverBorderClass ?? 'hover:border-sky'
  if (certificates.length === 0) {
    return (
      <div data-mbaas-oid="9j885qt" className="rounded-card border border-dashed border-slate-300 bg-white p-cardpad text-center text-sm text-slate-500">
        등록된 자격증이 없습니다. 위 등록 폼으로 첫 자격증을 추가해 보세요.
      </div>
    )
  }

  return (
    <ul data-mbaas-oid="as8g46c" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {certificates.map((cert) => {
        const status = getCertificateStatus(cert.expiryDate)
        const remaining = cert.expiryDate ? daysUntil(cert.expiryDate) : null
        const Icon = STATUS_ICON[status]
        return (
          <li data-mbaas-oid="y1jh8j4" key={cert.id}>
            <button
              data-mbaas-oid="f519jek" type="button"
              onClick={() => onSelect(cert)}
              className={`w-full rounded-card border border-slate-200 bg-white p-5 text-left transition-all duration-200
                ${hoverBorderClass} hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky`}
            >
              <div data-mbaas-oid="wm0wt71" className="flex items-start justify-between gap-2">
                <div data-mbaas-oid="2se4v2n">
                  <span data-mbaas-oid="tcv615v" className="text-xs font-medium uppercase tracking-wide text-slate-400">{cert.category}</span>
                  <h3 data-mbaas-oid="5w1lvoh" className="mt-0.5 font-display text-base font-bold text-ink">{cert.name}</h3>
                </div>
                <span data-mbaas-oid="1jmrsue" className={`inline-flex shrink-0 items-center gap-1 rounded-control px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[status]}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {CERTIFICATE_STATUS_LABEL[status]}
                </span>
              </div>

              <p data-mbaas-oid="swve2gh" className="mt-3 text-sm text-slate-600">{cert.issuer}</p>

              <div data-mbaas-oid="o4n89gc" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span data-mbaas-oid="kbrjwb9" className="font-mono-data tabular-nums text-slate-500">
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
