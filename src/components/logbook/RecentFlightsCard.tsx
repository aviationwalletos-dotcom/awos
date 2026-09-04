// 로그북 첫 화면(경량항공기 구분)의 오른쪽 칸 — 최근 비행 3건 요약.
import type { LogbookEntry } from '../../types/logbook'

export function RecentFlightsCard({ entries }: { entries: LogbookEntry[] }) {
  const recent = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)).slice(0, 3)
  const last = recent[0]
  const days = last ? Math.floor((Date.now() - new Date(`${last.date}T00:00:00`).getTime()) / 86400000) : null
  return (
    <div data-mbaas-oid="recentfl" className="flex h-full flex-col rounded-card border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky">최근 비행</p>
      <p className="mt-0.5 text-sm text-slate-400">{days === null ? '기록이 없어요' : days === 0 ? '오늘 비행' : `마지막 비행 ${days}일 전`}</p>
      {recent.length > 0 && (
        <ul className="mt-3 space-y-2">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-control border border-white/10 bg-navy px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-ink">{e.date} · {e.aircraftType}</span>
              <span className="shrink-0 font-mono-data text-xs text-slate-300">{e.departure}→{e.arrival} · {e.blockTime.toFixed(1)}h</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
