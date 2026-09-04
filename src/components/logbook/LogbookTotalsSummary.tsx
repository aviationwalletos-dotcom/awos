import { Collapsible } from '../Collapsible'
import React from 'react'
import { Gauge, PlaneTakeoff } from 'lucide-react'

import { EmptyState } from '../EmptyState'
import { sumHours } from '../../lib/hours'

import type { LogbookEntry } from '../../types/logbook'
import { vehicleKindLabel } from '../../lib/tracks'
import type { PilotTrack } from '../../lib/tracks'

interface LogbookTotalsSummaryProps {
  entries: LogbookEntry[]
  accountId?: string | null
  /** v1.1 — 자격 구분. 초경량은 로그기록지(임무별 기장/훈련/교관·비행횟수·기체 종류) 기준으로 표시 */
  track?: PilotTrack
}

function fmt(n: number): string {
  return n.toFixed(1)
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div data-mbaas-oid="s8tzm14">
      <dt data-mbaas-oid="cc52gy2" className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd data-mbaas-oid="eemr6uc" className="mt-0.5 font-mono-data tabular-nums text-base font-semibold text-ink">{fmt(value)}</dd>
    </div>
  )
}

function isUnconfirmedCertificate(entry: LogbookEntry): boolean {
  return entry.origin === 'flight_experience_certificate' && entry.certificateApprovalStatus !== 'confirmed'
}

function isPendingCertificate(entry: LogbookEntry): boolean {
  return entry.origin === 'flight_experience_certificate' && entry.certificateApprovalStatus !== 'confirmed' && entry.certificateApprovalStatus !== 'rejected'
}

function isRejectedCertificate(entry: LogbookEntry): boolean {
  return entry.origin === 'flight_experience_certificate' && entry.certificateApprovalStatus === 'rejected'
}

export function LogbookTotalsSummary({ entries, track = 'aircraft' }: LogbookTotalsSummaryProps) {
  // 교관 전자서명으로 기록의 신뢰성을 검증하므로, 별도의 확인 상태 구분 없이 모든 비행 기록을 합산합니다.
  // 단, 비행경력증명서로 가져온 기록 중 아직 인증 대기중이거나 관리자가 반려한 것은 공식 합계에서
  // 제외하고, 각각 "미인증 비행경력증명서(참고용)"/"반려된 비행경력증명서" 소계로 구분해 표시합니다
  // (승인 완료되면 공식 합계에 포함됩니다).
  const officialEntries = entries.filter((e) => !isUnconfirmedCertificate(e))
  const pendingCertificateEntries = entries.filter(isPendingCertificate)
  const pendingCertificateBlockTime = sumHours(pendingCertificateEntries.map((e) => e.blockTime))
  const rejectedCertificateEntries = entries.filter(isRejectedCertificate)
  const rejectedCertificateBlockTime = sumHours(rejectedCertificateEntries.map((e) => e.blockTime))

  // 초경량(로그기록지 ⑥ 임무별) 집계
  const ul = {
    pic: sumHours(officialEntries.map((e) => e.pilotingTime?.pic)),
    training: sumHours(officialEntries.map((e) => e.pilotingTime?.training)),
    instructor: sumHours(officialEntries.map((e) => e.pilotingTime?.flightInstructor)),
    flights: officialEntries.reduce((s, e) => s + (e.flightCount ?? e.dayLandings ?? 0), 0),
    byKind: Object.entries(
      officialEntries.reduce<Record<string, number>>((acc, e) => {
        const k = e.vehicleKind ? (vehicleKindLabel(e.vehicleKind) ?? e.vehicleKind) : '종류 미기재'
        acc[k] = (acc[k] ?? 0) + Math.round(e.blockTime * 10)
        return acc
      }, {}),
    ).map(([k, ticks]) => [k, ticks / 10] as const),
  }

  // 공식 합계 — 모든 시간 필드는 0.1h 정수 틱 합산(sumHours)으로 계산해 부동소수점 누적 오차를 차단한다.
  const totals = {
    blockTime: sumHours(officialEntries.map((e) => e.blockTime)),
    singleEngineLand: sumHours(officialEntries.map((e) => e.categoryHours?.singleEngineLand)),
    multiEngineLand: sumHours(officialEntries.map((e) => e.categoryHours?.multiEngineLand)),
    rotorcraftHelicopter: sumHours(officialEntries.map((e) => e.categoryHours?.rotorcraftHelicopter)),
    otherCategoryHours: sumHours(officialEntries.map((e) => e.categoryHours?.otherHours)),
    dualReceived: sumHours(officialEntries.map((e) => e.pilotingTime?.dualReceived)),
    pic: sumHours(officialEntries.map((e) => e.pilotingTime?.pic)),
    solo: sumHours(officialEntries.map((e) => e.pilotingTime?.solo)),
    sic: sumHours(officialEntries.map((e) => e.pilotingTime?.sic)),
    flightInstructor: sumHours(officialEntries.map((e) => e.pilotingTime?.flightInstructor)),
    groundTrainerTime: sumHours(officialEntries.map((e) => e.groundTrainerTime)),
    day: sumHours(officialEntries.map((e) => e.conditions?.day)),
    night: sumHours(officialEntries.map((e) => e.conditions?.night)),
    crossCountry: sumHours(officialEntries.map((e) => e.conditions?.crossCountry)),
    actualInstrument: sumHours(officialEntries.map((e) => e.conditions?.actualInstrument)),
    simulatedInstrument: sumHours(officialEntries.map((e) => e.conditions?.simulatedInstrument)),
    instrumentApproaches: officialEntries.reduce((a, e) => a + (e.instrumentApproaches ?? 0), 0),
    dayLandings: officialEntries.reduce((a, e) => a + (e.dayLandings ?? 0), 0),
    nightLandings: officialEntries.reduce((a, e) => a + (e.nightLandings ?? 0), 0),
  }

  const isEmpty = entries.length === 0

  return (
    <div data-mbaas-oid="gwljfg6" className="rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
      <div data-mbaas-oid="nmvmas5" className="flex flex-wrap items-center gap-2 text-sky">
        <Gauge className="h-5 w-5" aria-hidden="true" />
        <span data-mbaas-oid="h5250ec" className="text-xs font-semibold uppercase tracking-wide">누적 총 비행시간 요약</span>
      </div>

      {isEmpty && (
        <EmptyState
          className="mt-4"
          icon={PlaneTakeoff}
          title="아직 등록된 비행 기록이 없습니다"
          description="아래에서 비행 기록을 추가해 보세요."
        />
      )}

      <div data-mbaas-oid="dr71nf2" className="mt-4">
        <div data-mbaas-oid="nllid6s" className="rounded-control border border-sky/30 bg-sky/10 p-4">
          <p data-mbaas-oid="bsd7lof" className="text-xs font-semibold uppercase tracking-wide text-[#00D4FF]">총 블록타임</p>
          <p data-mbaas-oid="vhbboxv" className="mt-1 font-mono-data text-3xl font-extrabold tabular-nums text-ink">{fmt(totals.blockTime)}<span data-mbaas-oid="x6nq362" className="ml-1 text-base font-semibold text-slate-400">시간</span></p>
        </div>
      </div>

      <Collapsible
        id="totals-detail"
        className="mt-4"
        title="상세 내역"
        summary={<span className="text-slate-400">{track === 'ultralight' ? '임무별·기체별 누적' : '범주·임무·조건별 누적'}</span>}
      >
      {track === 'ultralight' ? (
        <div data-mbaas-oid="ultot" className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">임무별 누적 (로그기록지 ⑥)</h3>
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCell label="기장" value={ul.pic} />
            <StatCell label="훈련" value={ul.training} />
            <StatCell label="교관" value={ul.instructor} />
            <StatCell label="소계" value={ul.pic + ul.training + ul.instructor} />
          </dl>
          <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">비행 횟수 · 기체 종류별 누적</h3>
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-400">비행(착륙) 횟수</dt>
              <dd className="mt-1 font-mono-data text-lg font-bold tabular-nums text-ink">{ul.flights}회</dd>
            </div>
            {ul.byKind.map(([k, v]) => (
              <StatCell key={k} label={k} value={v} />
            ))}
          </dl>
          <p className="mt-4 text-[11px] text-slate-500">초경량은 야간·계기·크로스컨트리 항목이 없어요. 응시·등록용 경력은 지도조종자 확인과 교육기관 증명으로 인정됩니다(운영세칙 제9조).</p>
        </div>
      ) : (
        <>
      <div data-mbaas-oid="v7u2bc0" className="mt-6">
        <h3 data-mbaas-oid="98sf1q1" className="text-xs font-bold uppercase tracking-wide text-slate-400">항공기 범주별 누적</h3>
        <dl data-mbaas-oid="lq0232k" className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <StatCell label="단발육상" value={totals.singleEngineLand} />
          <StatCell label="다발육상" value={totals.multiEngineLand} />
          <StatCell label="회전익" value={totals.rotorcraftHelicopter} />
          <StatCell label="기타" value={totals.otherCategoryHours} />
        </dl>
      </div>

      <div data-mbaas-oid="yeiauxr" className="mt-6">
        <h3 data-mbaas-oid="br6lfge" className="text-xs font-bold uppercase tracking-wide text-slate-400">비행 자격 시간별 누적</h3>
        <dl data-mbaas-oid="hs3pigc" className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <StatCell label="DUAL RECEIVED" value={totals.dualReceived} />
          <StatCell label="PILOT-IN-COMMAND (PIC)" value={totals.pic} />
          <StatCell label="SOLO (단독)" value={totals.solo} />
          <StatCell label="SECOND-IN-COMMAND (SIC)" value={totals.sic} />
          <StatCell label="AS FLIGHT INSTRUCTOR" value={totals.flightInstructor} />
        </dl>
      </div>

      <div data-mbaas-oid="i1trhz1" className="mt-6">
        <h3 data-mbaas-oid="j8uun9n" className="text-xs font-bold uppercase tracking-wide text-slate-400">비행 조건별 누적</h3>
        <dl data-mbaas-oid="jkro9eg" className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          <StatCell label="주간" value={totals.day} />
          <StatCell label="야간" value={totals.night} />
          <StatCell label="크로스컨트리" value={totals.crossCountry} />
          <StatCell label="실제계기" value={totals.actualInstrument} />
          <StatCell label="모의계기" value={totals.simulatedInstrument} />
        </dl>
      </div>

      <div data-mbaas-oid="1gc4g5x" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div data-mbaas-oid="xzqk5ob">
          <h3 data-mbaas-oid="flyd0mf" className="text-xs font-bold uppercase tracking-wide text-slate-400">지상훈련장비 누적</h3>
          <p data-mbaas-oid="vl9vq3h" className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-ink">{fmt(totals.groundTrainerTime)}시간</p>
        </div>
        <div data-mbaas-oid="hjnsrx5">
          <h3 data-mbaas-oid="phjyum1" className="text-xs font-bold uppercase tracking-wide text-slate-400">계기접근 / 주간·야간 이착륙 누적</h3>
          <p data-mbaas-oid="xe9lezg" className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-ink">
            {totals.instrumentApproaches}회 · {totals.dayLandings}회 / {totals.nightLandings}회
          </p>
        </div>
      </div>

      {pendingCertificateEntries.length > 0 && (
        <div data-mbaas-oid="w2jbz4k" className="mt-6 rounded-control border border-amber-400/40 bg-amber-400/10 p-4">
          <p data-mbaas-oid="bc8t0kp" className="text-xs font-semibold uppercase tracking-wide text-amber-300">미인증 비행경력증명서(참고용)</p>
          <p data-mbaas-oid="42veb5k" className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-ink">
            {fmt(pendingCertificateBlockTime)}시간
            <span data-mbaas-oid="3f8zhuf" className="ml-2 text-xs font-normal text-amber-300">
              ({pendingCertificateEntries.length}건, 위 공식 합계에는 포함되지 않음)
            </span>
          </p>
          <p data-mbaas-oid="cdqymea" className="mt-1 text-xs text-amber-300">
            관리자가 원본 증명서와 대조해 승인하면 공식 총 비행시간 합계에 자동으로 포함됩니다.
          </p>
        </div>
      )}

      {rejectedCertificateEntries.length > 0 && (
        <div data-mbaas-oid="w2jbz4l" className="mt-6 rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
          <p data-mbaas-oid="bc8t0kq" className="text-xs font-semibold uppercase tracking-wide text-rose-300">반려된 비행경력증명서</p>
          <p data-mbaas-oid="42veb5l" className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-ink">
            {fmt(rejectedCertificateBlockTime)}시간
            <span data-mbaas-oid="3f8zhug" className="ml-2 text-xs font-normal text-rose-300">
              ({rejectedCertificateEntries.length}건, 공식 합계에서 제외됨)
            </span>
          </p>
          <p data-mbaas-oid="cdqymeb" className="mt-1 text-xs text-rose-300">
            관리자가 반려한 기록입니다. 상세 화면에서 반려 사유를 확인해 주세요.
          </p>
        </div>
      )}
        </>
      )}
      </Collapsible>
    </div>
  )
}
