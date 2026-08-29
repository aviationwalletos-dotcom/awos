import React, { useState } from 'react'

import { Button } from '../Button'
import { FLIGHT_CATEGORIES } from '../../types/logbook'
import { roundToTenth } from '../../lib/hours'

import type { FlightCategory, LogbookEntryInput } from '../../types/logbook'

// 비행 직후 "30초 기록"을 위한 최소 입력 폼.
//
// 공식 양식 전체(범주별/자격별/조건별 시간)를 요구하는 상세 폼(EntryForm)은 훌륭하지만,
// 격납고 앞에서 폰으로 쓰기엔 무겁다. 습관은 마찰이 낮을 때 생기므로, 여기서는 로그북의
// 최소 필수 5개(날짜·출발·도착·기종·블록타임)만 받고 나머지는 나중에 상세 편집으로 보완한다.
//
// 멀티레그 배려: 저장에 성공하면 방금 도착지를 다음 출발지로 자동 이월한다
// (같은 날 여러 구간을 연달아 비행하는 훈련 패턴에 맞춤).

interface QuickEntryFormProps {
  onSubmit: (input: LogbookEntryInput) => void
}

function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── 자주 쓰는 값 칩(공항·기종) ─────────────────────────────────────────────────
// 훈련 비행은 같은 공항·같은 기종의 반복이다. 저장에 성공할 때마다 값을 학습해
// 입력칸 아래 칩으로 띄우고, 탭 한 번으로 채워지게 한다(수동 등록 불필요).
const FAVORITES_KEY = 'awos_quick_favorites_v1'

interface QuickFavorites {
  airports: string[]
  aircraft: string[]
}

function loadFavorites(): QuickFavorites {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<QuickFavorites>
      return { airports: parsed.airports ?? [], aircraft: parsed.aircraft ?? [] }
    }
  } catch {
    // 저장소 접근 실패(프라이빗 모드 등)는 무시 — 칩만 안 뜰 뿐 기능엔 지장 없다.
  }
  return { airports: [], aircraft: [] }
}

function remember(list: string[], value: string, max = 6): string[] {
  const v = value.trim()
  if (!v) return list
  return [v, ...list.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, max)
}

function saveFavorites(f: QuickFavorites): void {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(f))
  } catch {
    // 무시
  }
}

function FavoriteChips({ values, onPick }: { values: string[]; onPick: (v: string) => void }) {
  if (values.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 font-mono-data text-xs text-slate-300 transition-colors hover:border-sky/50 hover:text-sky"
        >
          {v}
        </button>
      ))}
    </div>
  )
}

const inputClass =
  'w-full rounded-control border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-sky focus:outline-none'

export function QuickEntryForm({ onSubmit }: QuickEntryFormProps) {
  const [date, setDate] = useState(todayIsoDate)
  const [departure, setDeparture] = useState('')
  const [arrival, setArrival] = useState('')
  const [aircraftType, setAircraftType] = useState('')
  const [aircraftIdentification, setAircraftIdentification] = useState('')
  const [blockTimeText, setBlockTimeText] = useState('')
  const [flightCategory, setFlightCategory] = useState<FlightCategory>('주간')
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [favorites, setFavorites] = useState<QuickFavorites>(loadFavorites)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const dep = departure.trim()
    const arr = arrival.trim()
    const type = aircraftType.trim()
    const blockTime = Number(blockTimeText)

    if (!date || !dep || !arr || !type) {
      setError('날짜·출발·도착·기종은 필수입니다.')
      return
    }
    if (!Number.isFinite(blockTime) || blockTime <= 0) {
      setError('블록타임을 0보다 큰 숫자로 입력해 주세요. (예: 1.2)')
      return
    }

    onSubmit({
      date,
      departure: dep,
      arrival: arr,
      aircraftType: type,
      aircraftIdentification: aircraftIdentification.trim() || undefined,
      blockTime: roundToTenth(blockTime), // 로그북 관례인 0.1시간 단위로 반올림
      flightCategory,
      origin: 'manual',
    })

    setError(null)
    // 자주 쓰는 값 학습(공항은 출발·도착 통합 목록, 기종은 별도)
    const nextFavorites: QuickFavorites = {
      airports: remember(remember(favorites.airports, dep), arr),
      aircraft: remember(favorites.aircraft, type),
    }
    setFavorites(nextFavorites)
    saveFavorites(nextFavorites)
    // 다음 구간 준비: 도착지 → 출발지 이월, 나머지 구간 값 초기화(날짜·기종·기체번호는 유지)
    setDeparture(arr)
    setArrival('')
    setBlockTimeText('')
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">날짜 *</span>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">비행 종류 *</span>
          <select className={inputClass} value={flightCategory} onChange={(e) => setFlightCategory(e.target.value as FlightCategory)}>
            {FLIGHT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">출발지 *</span>
          <input className={inputClass} value={departure} onChange={(e) => setDeparture(e.target.value)} placeholder="예: RKTL" required />
          <FavoriteChips values={favorites.airports} onPick={setDeparture} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">도착지 *</span>
          <input className={inputClass} value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="예: RKTH" required />
          <FavoriteChips values={favorites.airports} onPick={setArrival} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">기종 *</span>
          <input className={inputClass} value={aircraftType} onChange={(e) => setAircraftType(e.target.value)} placeholder="예: C172" required />
          <FavoriteChips values={favorites.aircraft} onPick={setAircraftType} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">등록번호 (선택)</span>
          <input
            className={inputClass}
            value={aircraftIdentification}
            onChange={(e) => setAircraftIdentification(e.target.value)}
            placeholder="예: HL1086"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">블록타임 (시간) *</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            className={inputClass}
            value={blockTimeText}
            onChange={(e) => setBlockTimeText(e.target.value)}
            placeholder="예: 1.2"
            required
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit">기록 저장</Button>
        {savedFlash && <span className="text-sm font-medium text-go">저장됨 ✓ 다음 구간의 출발지를 채워뒀어요</span>}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        상세 시간(PIC·야간·계기 등)은 저장 후 목록에서 기록을 눌러 언제든 보완할 수 있어요.
      </p>
    </form>
  )
}
