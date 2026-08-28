import React, { useMemo } from 'react'
import { Bot, ClipboardList, Plane, Radar, Radio, ShieldCheck } from 'lucide-react'

import type { RoleContent, RoleKey } from '../../data/content'
import { CERTIFICATE_STATUS_LABEL, daysUntil, getCertificateStatus } from '../../types/certificate'
import type { Certificate, CertificateStatus } from '../../types/certificate'

const ROLE_ICONS: Record<RoleKey, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  pilot: Plane,
  mechanic: ClipboardList,
  controller: Radar,
  ops: Radio,
  drone: Bot,
}

/** 다크 카드 배경 위에서도 대비가 확보되도록 조정한 상태 배지 스타일 (FlightReadinessPanel의 GO/NO-GO 칩 톤과 통일) */
const STATUS_BADGE: Record<CertificateStatus, string> = {
  valid: 'bg-go/15 text-go',
  warning: 'bg-amber-400/15 text-amber-300',
  urgent: 'bg-rose-500/15 text-rose-300',
  expired: 'bg-slate-400/15 text-slate-300',
  no_expiry: 'bg-sky/15 text-sky',
}

const MAX_VISIBLE = 6
const MAX_VISIBLE_COMPACT = 2

interface MyCertificateStatusCardProps {
  certificates: Certificate[]
  roleContent?: RoleContent
  /** true면 히어로 등 좁은 영역에 맞춰 만료 임박 1~2건만 보여주는 축약형으로 렌더링합니다. */
  compact?: boolean
}

/**
 * 홈(랜딩) "역할별 기능 쇼케이스"(Roles.tsx)와 같은 카드 시각 스타일을 재사용해,
 * 로그인한 사용자의 실제 자격증 데이터를 만료 임박 순으로 보여주는 AWOS 전용 컴포넌트.
 * 만료일이 없는 자격(조종사 자격증명/한정/조종교육증명)은 목록 맨 뒤에 배치한다.
 */
export function MyCertificateStatusCard({ certificates, roleContent, compact = false }: MyCertificateStatusCardProps) {
  const Icon = roleContent ? ROLE_ICONS[roleContent.key] : ShieldCheck
  const colorClass = roleContent?.colorClass ?? 'text-sky'
  const bgClass = roleContent?.bgClass ?? 'bg-sky/10'

  const sorted = useMemo(() => {
    return [...certificates].sort((a, b) => {
      const aRemaining = a.expiryDate ? daysUntil(a.expiryDate) : Number.POSITIVE_INFINITY
      const bRemaining = b.expiryDate ? daysUntil(b.expiryDate) : Number.POSITIVE_INFINITY
      return aRemaining - bRemaining
    })
  }, [certificates])

  const visible = sorted.slice(0, compact ? MAX_VISIBLE_COMPACT : MAX_VISIBLE)
  const hiddenCount = sorted.length - visible.length

  if (compact) {
    return (
      <div
        data-mbaas-oid="ms8d0lv" className="rounded-card border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
      >
        <div data-mbaas-oid="s0cp464" className="flex items-start gap-3">
          <span data-mbaas-oid="mj04ehl" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-card ${bgClass} ${colorClass}`}>
            <Icon className="h-5 w-5" aria-hidden={true} />
          </span>
          <div data-mbaas-oid="xgu1ivg" className="min-w-0 flex-1">
            <p data-mbaas-oid="xczv64y" className={`text-xs font-semibold uppercase tracking-wide ${colorClass}`}>
              내 자격 현황
            </p>
            <p data-mbaas-oid="d2gdtsk" className="mt-1 truncate text-sm text-slate-400">
              {roleContent
                ? `${roleContent.name} 자격 요약`
                : '등록된 자격 항목을 만료 임박 순으로 보여드립니다.'}
            </p>

            {sorted.length === 0 ? (
              <p data-mbaas-oid="oqup49l" className="mt-2 text-xs text-slate-500">
                등록된 자격증이 없습니다. 자격증 관리 탭에서 첫 자격증을 등록해 보세요.
              </p>
            ) : (
              <>
                <ul data-mbaas-oid="vaqhh2w" className="mt-2 space-y-1.5">
                  {visible.map((cert) => {
                    const status = getCertificateStatus(cert.expiryDate)
                    return (
                      <li data-mbaas-oid="mcscrow" key={cert.id} className="flex items-center justify-between gap-2 text-xs">
                        <span data-mbaas-oid="si1wiwy" className="truncate font-medium text-white">
                          {cert.name}
                        </span>
                        <span
                          data-mbaas-oid="jmu9d39" className={`shrink-0 rounded-control px-2 py-0.5 font-bold ${STATUS_BADGE[status]}`}
                        >
                          {CERTIFICATE_STATUS_LABEL[status]}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p data-mbaas-oid="iusoj54" className="mt-2 text-[11px] text-slate-500">
                  자격증 관리 탭에서 전체보기{hiddenCount > 0 ? ` (${hiddenCount}건 더 있음)` : ''}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
 data-mbaas-oid="ms8d0lv" className="rounded-card border border-white/10 bg-white/[0.04] p-cardpad backdrop-blur"
    >
      <div data-mbaas-oid="s0cp464" className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <span data-mbaas-oid="mj04ehl" className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-card ${bgClass} ${colorClass}`}>
          <Icon className="h-8 w-8" aria-hidden={true} />
        </span>
        <div data-mbaas-oid="xgu1ivg" className="flex-1">
          <p data-mbaas-oid="xczv64y" className={`text-xs font-semibold uppercase tracking-wide ${colorClass}`}>
            내 자격 현황
          </p>
          <h3 data-mbaas-oid="ji5ffd4" className="mt-1 text-xl font-bold text-white">
            {roleContent ? `${roleContent.name} 자격 요약` : '등록된 자격 요약'}
          </h3>
          <p data-mbaas-oid="d2gdtsk" className="mt-2 text-sm text-slate-400">
            {roleContent
              ? roleContent.summary
              : '자격증 관리 탭에서 등록한 면허·항공신체검사·법정교육 등 자격 항목을 만료 임박 순으로 보여드립니다.'}
          </p>

          {sorted.length === 0 ? (
            <div
 data-mbaas-oid="w0i5sii" className="mt-6 flex flex-col items-center gap-2 rounded-control border border-dashed border-white/15 bg-white/[0.02] py-8 text-center"
            >
              <ShieldCheck className="h-6 w-6 text-slate-500" aria-hidden="true" />
              <p data-mbaas-oid="oqup49l" className="max-w-xs text-sm text-slate-400">
                등록된 자격증이 없습니다. 자격증 관리 탭에서 첫 자격증을 등록해 보세요.
              </p>
            </div>
          ) : (
            <>
              <ul data-mbaas-oid="vaqhh2w" className="mt-6 divide-y divide-white/10">
                {visible.map((cert) => {
                  const status = getCertificateStatus(cert.expiryDate)
                  return (
                    <li data-mbaas-oid="mcscrow" key={cert.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <span data-mbaas-oid="si1wiwy" className="text-sm font-medium text-white">
                        {cert.name}
                      </span>
                      <div data-mbaas-oid="02s3who" className="flex items-center gap-3">
                        <span data-mbaas-oid="stthnne" className="font-mono-data tabular-nums text-sm text-slate-400">
                          {cert.expiryDate ?? '만료 없음'}
                        </span>
                        <span
 data-mbaas-oid="jmu9d39" className={`rounded-control px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[status]}`}
                        >
                          {CERTIFICATE_STATUS_LABEL[status]}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {hiddenCount > 0 && (
                <p data-mbaas-oid="iusoj54" className="mt-4 text-xs text-slate-500">
                  이 외 {hiddenCount}건이 더 있습니다. 자격증 관리 탭에서 전체보기.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
