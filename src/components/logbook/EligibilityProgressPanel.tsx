// 경량·초경량 응시경력 진척도 패널 — 원문(별표 4 제2호 · 세칙 별표 1·2·3) 값으로 계산.
import { useMemo } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

import { buildLsaProgress, buildUasProgress, buildUltralightMannedProgress } from '../../lib/eligibility/lightProgress'
import type { ProgressCard } from '../../lib/eligibility/lightProgress'
import type { PilotTrack } from '../../lib/tracks'
import type { Certificate } from '../../types/certificate'
import type { LogbookEntry } from '../../types/logbook'
import type { Vehicle } from '../../types/vehicle'
import { Collapsible } from '../Collapsible'

interface Props {
  track: PilotTrack
  entries: LogbookEntry[]
  certificates: Certificate[]
  vehicles?: Vehicle[]
  /** 독립 섹션으로 쓸 때는 접지 않고 바로 펼쳐 보인다 */
  defaultOpen?: boolean
  /** 접힘 헤더 제목(기본 '응시경력 진척도') */
  title?: string
}

function Bar({ current, required }: { current: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-go' : 'bg-sky'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function Card({ card }: { card: ProgressCard }) {
  const anyPathMet = card.paths.some((p) => p.items.length > 0 && p.items.every((i) => i.met))
  return (
    <div data-mbaas-oid="eligcard" className="rounded-card border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-ink">{card.title}</h4>
          <p className="mt-0.5 font-mono-data text-[10px] tracking-wider text-slate-500">[REF] {card.legalRef}</p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold ${anyPathMet ? 'bg-go/15 text-go' : 'bg-white/10 text-slate-300'}`}>
          {anyPathMet ? (card.referenceOnly ? '기록상 충족' : '요건 충족') : '진행 중'}
        </span>
      </div>
      <div className={`mt-3 grid gap-3 ${card.paths.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {card.paths.map((p) => (
          <div key={p.id} className="rounded-control border border-white/10 bg-navy p-3">
            <p className="text-xs font-semibold text-slate-300">{p.label}</p>
            {p.items.map((it) => (
              <div key={it.id} className="mt-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    {it.met ? <CheckCircle2 className="h-3.5 w-3.5 text-go" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />}
                    {it.label}
                  </span>
                  <span className="font-mono-data tabular-nums text-slate-300">
                    {it.current.toFixed(1)} / {it.required}
                    {it.unit}
                  </span>
                </div>
                <Bar current={it.current} required={it.required} />
                {it.note && <p className="mt-1 text-[10px] text-slate-500">{it.note}</p>}
              </div>
            ))}
            {p.manual && p.manual.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
                {p.manual.map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {card.notice && <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{card.notice}</p>}
    </div>
  )
}

export function EligibilityProgressPanel({ track, entries, certificates, vehicles = [], defaultOpen = false, title = '응시경력 진척도' }: Props) {
  const cards = useMemo(() => {
    if (track === 'lsa') return buildLsaProgress(entries, certificates)
    if (track === 'ultralight') {
      const byId = Object.fromEntries(vehicles.map((v) => [v.id, v.classLabel]))
      return [...buildUltralightMannedProgress(entries, certificates), ...buildUasProgress(entries, certificates, byId)]
    }
    return []
  }, [track, entries, certificates, vehicles])
  const hasUas = cards.some((c) => c.referenceOnly)
  if (cards.length === 0) {
    return (
      <Collapsible id="elig-progress" className="mt-4" title={title} summary={<span className="text-slate-400">기록 없음</span>}>
        <p className="rounded-card border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
          아직 이 구분의 비행기록이 없어요. 기록이 생기면 해당 종류의 응시경력 요건이 여기 나타나요.
        </p>
      </Collapsible>
    )
  }
  if (defaultOpen) {
    return (
      <div>
        {hasUas && (
          <p data-mbaas-oid="uasnotice" className="mb-3 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
            무인비행장치 응시경력은 <span className="font-semibold">교육기관(전문·사설)의 지도조종자가 확인하고 대표가 증명한 비행경력증명서</span>만 인정돼요.
            지정 훈련용 기체 또는 사용사업 신고 기체로 비행하고, 출결관리시스템으로 확인된 시간이어야 합니다(운영세칙 제9조·제10조·별표 2 비고). 아래는 앱 기록으로 센 참고 진척도예요.
          </p>
        )}
        <div className="space-y-3">
          {cards.map((c) => (
            <Card key={c.id} card={c} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <Collapsible
      id="elig-progress"
      className="mt-4"
      title={title}
      summary={<span className="text-slate-400">{track === 'lsa' ? '별표 4 제2호' : '운영세칙 별표 1·2·3'}</span>}
    >
      {hasUas && (
        <p data-mbaas-oid="uasnotice" className="mb-3 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
          무인비행장치 응시경력은 <span className="font-semibold">교육기관(전문·사설)의 지도조종자가 확인하고 대표가 증명한 비행경력증명서</span>만 인정돼요.
          지정 훈련용 기체 또는 사용사업 신고 기체로 비행하고, 출결관리시스템으로 확인된 시간이어야 합니다(운영세칙 제9조·제10조·별표 2 비고).
          아래는 앱 기록으로 센 참고 진척도예요.
        </p>
      )}
      <div className="space-y-3">
        {cards.map((c) => (
          <Card key={c.id} card={c} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">참고 판정이며, 최종 응시자격은 공단(TS)이 심사합니다.</p>
    </Collapsible>
  )
}
