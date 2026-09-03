import React, { useMemo } from 'react'
import { CircleAlert, CircleCheck, CircleDashed, GraduationCap, HeartPulse, Info, Moon, Radar, Sun, TriangleAlert } from 'lucide-react'

import type { LogbookEntry } from '../../types/logbook'
import type { Certificate, CertificateStatus } from '../../types/certificate'
import { CERTIFICATE_STATUS_LABEL } from '../../types/certificate'
import type { AccountResponse } from '../../lib/baas/types'
import { useCurrencyOverrides } from '../../hooks/useCurrencyOverrides'
import { usePilotTracks } from '../../hooks/usePilotTracks'
import { OPERATION_TYPE_DESCRIPTION, OPERATION_TYPE_LABEL } from '../../lib/tracks'
import type { OperationType } from '../../lib/tracks'
import { computeFlightReadiness, parseEntryDate } from '../../lib/flightReadiness'

// ── 날짜 유틸 ────────────────────────────────────────────────────────────
// 날짜 계산 로직은 다른 화면(히어로 비행 적합성 패널)과 판정 기준을 공유하기 위해
// `src/lib/flightReadiness.ts`로 이동했습니다. 여기서는 표시용 포맷팅만 담당합니다.

function formatDate(dateStr: string): string {
  const d = parseEntryDate(dateStr)
  if (!d) return dateStr
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ── 배지 ─────────────────────────────────────────────────────────────────

type BadgeTone = 'met' | 'unmet' | 'exempt'

function StatusBadge({ tone, label }: { tone: BadgeTone; label: string }) {
  const toneClass =
    tone === 'met' ? 'bg-go/10 text-go' : tone === 'exempt' ? 'bg-sky/10 text-[#00D4FF]' : 'bg-rose-500/100/15 text-rose-300'
  const Icon = tone === 'met' ? CircleCheck : tone === 'exempt' ? CircleDashed : CircleAlert
  return (
    <span
      data-mbaas-oid="curbdg1"
      className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-bold ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

// ── 항공신체검사 상태 배지 ─────────────────────────────────────────────────

const MEDICAL_STATUS_BADGE: Record<CertificateStatus, string> = {
  valid: 'bg-go/10 text-go',
  warning: 'bg-amber-400/15 text-amber-300',
  urgent: 'bg-rose-500/100/15 text-rose-300',
  expired: 'bg-white/10 text-slate-400',
  no_expiry: 'bg-sky/15 text-sky-700',
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────

interface CurrencyDashboardProps {
  entries: LogbookEntry[]
  account?: AccountResponse | null
  certificates?: Certificate[]
  /** 승인된 교관 계정일 때만 "조종교육 비행경험(교관 커런시)" 섹션을 노출합니다. */
  isApprovedInstructor?: boolean
}

export function CurrencyDashboard({ entries, account, certificates = [], isApprovedInstructor = false }: CurrencyDashboardProps) {
  // v1.1 — 운항형태는 계정정보와 같은 값을 공유한다. 여기서 바꾸면 계정정보에도 반영된다.
  const { operationType, setOperationType } = usePilotTracks(account)
  const {
    instrumentCheckDate,
    setInstrumentCheckDate,
    clearInstrumentCheckDate,
    instructorFirstCertDate,
    setInstructorFirstCertDate,
    clearInstructorFirstCertDate,
    instructorRecoveryChecked,
    setInstructorRecoveryChecked,
  } = useCurrencyOverrides(account)

  const { medical, recency, ifr, instructor } = useMemo(
    () =>
      computeFlightReadiness(entries, certificates, {
        instrumentCheckDate,
        instructorFirstCertDate,
        instructorRecoveryChecked,
        operationType,
      }),
    [entries, certificates, instrumentCheckDate, instructorFirstCertDate, instructorRecoveryChecked, operationType],
  )

  return (
    <div data-mbaas-oid="gro88ly">
      {/* 0. 항공신체검사 커런시 — 가장 상단에 배치 */}
      <section data-mbaas-oid="bt88ygo">
        <h3 data-mbaas-oid="12xh8u5" className="font-display text-lg font-extrabold text-ink">
          항공신체검사 커런시
        </h3>

        <div data-mbaas-oid="567p0dz" className="mt-2 rounded-control border border-sky/20 bg-sky/5 p-3 text-xs text-slate-400">
          <p data-mbaas-oid="kmaccqq">
            <strong data-mbaas-oid="apiniji">제1종(운송용/사업용 조종사, 부조종사)</strong>: 만 60세 미만 12개월, 만 60세
            이상 6개월 유효(단독운항 항공운송사업 종사자는 만 40세 이상부터 6개월이 적용될 수 있습니다).
          </p>
          <p data-mbaas-oid="0nrztfv" className="mt-1.5">
            <strong data-mbaas-oid="kh6wxzz">제2종(자가용 조종사, 조종연습생)</strong>: 만 40세 미만 60개월(5년), 만
            40세 이상 50세 미만 24개월(2년), 만 50세 이상 12개월(1년) 유효.
          </p>
          <p data-mbaas-oid="x2ksxmx" className="mt-1.5">
            <strong data-mbaas-oid="bqxzomy">월말 만료 원칙</strong>: 계산된 유효기간 종료일이 그 달의 말일이 아니면, 그
            달의 말일까지 유효한 것으로 인정됩니다(예: 5년 유효로 계산된 만료일이 2031-07-11이면 실제로는
            2031-07-31까지 유효).
          </p>
        </div>

        {medical.class1Missing && (
          <div
 data-mbaas-oid="z475eq5" className="mt-4 flex items-start gap-2 rounded-control border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-300"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
            <p data-mbaas-oid="b1om23a">
              (조종사/교관 대상) 이 서비스는 비행교육원 교관/사업용 조종사를 위한 것으로, <strong data-mbaas-oid="o7ux80j">제1종 항공신체검사증명을
              반드시 유효하게 유지</strong>해야 합니다. 현재 유효한 제1종 항공신체검사증명이 등록되어 있지 않거나 만료된
              상태입니다.
            </p>
          </div>
        )}

        <div data-mbaas-oid="ot39cro" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-mbaas-oid="81k10k3" className="rounded-card border border-white/10 bg-panel p-cardpad">
            <div data-mbaas-oid="txe8hk2" className="flex items-center justify-between gap-2">
              <div data-mbaas-oid="peb1lhs" className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-rose-500" aria-hidden="true" />
                <h4 data-mbaas-oid="medc1h4" className="font-display text-base font-bold text-ink">제1종 항공신체검사증명</h4>
              </div>
              {medical.class1 && medical.class1Status ? (
                <span data-mbaas-oid="a6sgrf9" className={`inline-flex shrink-0 items-center rounded-control px-2.5 py-1 text-xs font-bold ${MEDICAL_STATUS_BADGE[medical.class1Status]}`}>
                  {CERTIFICATE_STATUS_LABEL[medical.class1Status]}
                </span>
              ) : (
                <span data-mbaas-oid="yw9nsgc" className="inline-flex shrink-0 items-center rounded-control bg-white/[0.07] px-2.5 py-1 text-xs font-bold text-slate-400">
                  미등록
                </span>
              )}
            </div>
            {medical.class1 ? (
              <p data-mbaas-oid="qilx1ur" className="mt-3 text-sm text-slate-400">
                발급일 {formatDate(medical.class1.issuedDate)}
                {medical.class1.expiryDate && ` · 만료일 ${formatDate(medical.class1.expiryDate)}`}
              </p>
            ) : (
              <p data-mbaas-oid="07rqavs" className="mt-3 text-sm text-slate-400">
                자격증 관리 탭에서 제1종 항공신체검사증명을 등록해 주세요.
              </p>
            )}
          </div>

          <div data-mbaas-oid="4qklkql" className="rounded-card border border-white/10 bg-panel p-cardpad">
            <div data-mbaas-oid="q97jffo" className="flex items-center justify-between gap-2">
              <div data-mbaas-oid="ovgsozi" className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-sky-500" aria-hidden="true" />
                <h4 data-mbaas-oid="medc2h4" className="font-display text-base font-bold text-ink">제2종 항공신체검사증명</h4>
              </div>
              {medical.class2 && medical.class2Status ? (
                <span data-mbaas-oid="qpkhawc" className={`inline-flex shrink-0 items-center rounded-control px-2.5 py-1 text-xs font-bold ${MEDICAL_STATUS_BADGE[medical.class2Status]}`}>
                  {CERTIFICATE_STATUS_LABEL[medical.class2Status]}
                </span>
              ) : (
                <span data-mbaas-oid="lhw23hd" className="inline-flex shrink-0 items-center rounded-control bg-white/[0.07] px-2.5 py-1 text-xs font-bold text-slate-400">
                  미등록
                </span>
              )}
            </div>
            {medical.class2 ? (
              <p data-mbaas-oid="phichdi" className="mt-3 text-sm text-slate-400">
                발급일 {formatDate(medical.class2.issuedDate)}
                {medical.class2.expiryDate && ` · 만료일 ${formatDate(medical.class2.expiryDate)}`}
              </p>
            ) : (
              <p data-mbaas-oid="bdzwnai" className="mt-3 text-sm text-slate-400">
                자격증 관리 탭에서 제2종 항공신체검사증명을 등록해 주세요.
              </p>
            )}
          </div>
        </div>

        <div data-mbaas-oid="7lgyszu" className="mt-4 rounded-card border border-white/10 bg-panel p-cardpad">
          <div data-mbaas-oid="593ozs9" className="flex items-center justify-between gap-2">
            <div data-mbaas-oid="q7fcr3v" className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-violet-500" aria-hidden="true" />
              <h4 data-mbaas-oid="medc3h4" className="font-display text-base font-bold text-ink">
                제3종 항공신체검사증명(관제사 등 비조종 직무)
              </h4>
            </div>
            {medical.class3 && medical.class3Status ? (
              <span data-mbaas-oid="99lh3ic" className={`inline-flex shrink-0 items-center rounded-control px-2.5 py-1 text-xs font-bold ${MEDICAL_STATUS_BADGE[medical.class3Status]}`}>
                {CERTIFICATE_STATUS_LABEL[medical.class3Status]}
              </span>
            ) : (
              <span data-mbaas-oid="t6mds4j" className="inline-flex shrink-0 items-center rounded-control bg-white/[0.07] px-2.5 py-1 text-xs font-bold text-slate-400">
                미등록
              </span>
            )}
          </div>
          {medical.class3 ? (
            <p data-mbaas-oid="rzqfgdx" className="mt-3 text-sm text-slate-400">
              발급일 {formatDate(medical.class3.issuedDate)}
              {medical.class3.expiryDate && ` · 만료일 ${formatDate(medical.class3.expiryDate)}`}
            </p>
          ) : (
            <p data-mbaas-oid="89o3kk2" className="mt-3 text-sm text-slate-400">
              관제사 등 조종 자격이 필요 없는 직무는 자격증 관리 탭에서 제3종 항공신체검사증명을 등록해 주세요(항공안전법
              제40조).
            </p>
          )}
        </div>

        <p data-mbaas-oid="xa7w2bw" className="mt-4 text-xs text-slate-400">
          항공신체검사증명은 "자격증 관리" 탭에서 등록/수정할 수 있습니다.
        </p>
      </section>

      <div data-mbaas-oid="8xitjoy" className="mt-10 flex items-start gap-2 rounded-control border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p data-mbaas-oid="302bp56">
          이 화면은 <strong data-mbaas-oid="mu4r836">항공안전법상 조종사 최근 비행경험 규정</strong>을 참고해 자동 계산한 참고용
          정보이며, 실제 법적 판단은 소속 기관/관련 규정을 통해 확인해야 합니다.
        </p>
      </div>

      {entries.length === 0 ? (
        <div data-mbaas-oid="r3biul7" className="mt-6 rounded-card border border-dashed border-white/15 bg-panel p-cardpad text-center text-sm text-slate-400">
          비행 기록이 없어 최근 비행경험/계기비행 경험/조종교육 비행경험 커런시를 계산할 수 없습니다. 비행기록 관리 탭에서
          이착륙 횟수·계기접근·비행교관 시간을 포함한 기록을 추가해 보세요.
        </div>
      ) : (
        <div data-mbaas-oid="curwrap" className="mt-6 flex flex-col gap-10">
          {/* 1. 최근 비행경험(일반 및 야간) */}
          <section data-mbaas-oid="6vkjm7q">
            <h3 data-mbaas-oid="wz7y9h3" className="font-display text-lg font-extrabold text-ink">
              최근 비행경험(일반 및 야간 비행)
            </h3>
            <div data-mbaas-oid="optoggle" role="radiogroup" aria-label="운항형태 선택" className="mt-3 flex flex-wrap gap-2">
              {(['general', 'commercial'] as OperationType[]).map((o) => {
                const active = operationType === o
                return (
                  <button
                    data-mbaas-oid="optogbtn"
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setOperationType(o)}
                    className={`flex min-h-[40px] flex-col items-start rounded-control border px-3 py-1.5 text-left transition-colors ${
                      active ? 'border-sky bg-sky/10 text-[#00D4FF]' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <span className="text-xs font-semibold">{OPERATION_TYPE_LABEL[o]}</span>
                    <span className="text-[10px] text-slate-500">{OPERATION_TYPE_DESCRIPTION[o]}</span>
                  </button>
                )
              })}
            </div>
            <div data-mbaas-oid="4f1ymr8" className="mt-2 rounded-control border border-sky/20 bg-sky/5 p-3 text-xs text-slate-400">
              최근 {recency.windowDays}일 이내 이·착륙 합계가 3회 이상이어야 하며, 그 중 야간 이·착륙이 1회 이상 포함되어야 야간비행이
              가능합니다. 모의비행장치를 이용한 이착륙 경험도 인정됩니다.
            </div>
            <p data-mbaas-oid="xpxybbu" className="mt-4 text-sm text-slate-400">
              최근 {recency.windowDays}일 이내 비행 기록 <span data-mbaas-oid="vto2od8" className="font-mono-data tabular-nums font-semibold text-ink">{recency.recentCount}</span>건 기준
            </p>
            <div data-mbaas-oid="3unzjmp" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div data-mbaas-oid="jlquqoz" className="rounded-card border border-white/10 bg-panel p-cardpad">
                <div data-mbaas-oid="lxue2ca" className="flex items-center justify-between gap-2">
                  <div data-mbaas-oid="dbgcf1d" className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    <h4 data-mbaas-oid="2bdl6om" className="font-display text-base font-bold text-ink">기본 이·착륙 요건</h4>
                  </div>
                  <StatusBadge tone={recency.baseMet ? 'met' : 'unmet'} label={recency.baseMet ? '기준 충족' : '기준 미달'} />
                </div>
                <p data-mbaas-oid="a5s6jue" className="mt-4 font-mono-data text-3xl font-extrabold tabular-nums text-ink">
                  {recency.landingCount}<span data-mbaas-oid="rfg4guc" className="ml-1 text-base font-medium text-slate-400">/ 3회</span>
                </p>
                <p data-mbaas-oid="bbj1bpl" className="mt-1 text-sm text-slate-400">최근 {recency.windowDays}일 누적 이·착륙 횟수(주간+야간)</p>
              </div>

              <div data-mbaas-oid="sye5t68" className="rounded-card border border-white/10 bg-panel p-cardpad">
                <div data-mbaas-oid="tr47mbn" className="flex items-center justify-between gap-2">
                  <div data-mbaas-oid="hafjs54" className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                    <h4 data-mbaas-oid="tlxrv1j" className="font-display text-base font-bold text-ink">야간 비행 요건</h4>
                  </div>
                  <StatusBadge tone={recency.nightMet ? 'met' : 'unmet'} label={recency.nightMet ? '기준 충족' : '기준 미달'} />
                </div>
                <p data-mbaas-oid="ze46nhh" className="mt-4 font-mono-data text-3xl font-extrabold tabular-nums text-ink">
                  {recency.nightLandingCount}<span data-mbaas-oid="a8hmh97" className="ml-1 text-base font-medium text-slate-400">/ 1회 이상</span>
                </p>
                <p data-mbaas-oid="1p4bf7l" className="mt-1 text-sm text-slate-400">
                  {recency.baseMet
                    ? `최근 ${recency.windowDays}일 누적 야간 이·착륙 횟수`
                    : '기본 이·착륙 요건 미충족 시 야간 비행 요건도 함께 미충족으로 표시됩니다'}
                </p>
              </div>
            </div>
          </section>

          {/* 2. 계기비행 경험(IFR) */}
          <section data-mbaas-oid="pd70wax">
            <h3 data-mbaas-oid="cgsz7xd" className="font-display text-lg font-extrabold text-ink">
              계기비행의 경험(IFR Currency)
            </h3>
            <div data-mbaas-oid="w0j7sfn" className="mt-2 rounded-control border border-sky/20 bg-sky/5 p-3 text-xs text-slate-400">
              최근 6개월 이내 계기접근 6회 이상 및 실제·모의계기 비행시간 합계 6시간 이상을 모두 충족해야 합니다.
              국토교통부장관이 인정한 자로부터 계기비행심사를 이수한 경우 이수일로부터 6개월간 유지된 것으로 봅니다.
              모의비행장치를 이용한 계기비행 경험도 인정됩니다.
            </div>
            <p data-mbaas-oid="9agjv6f" className="mt-4 text-sm text-slate-400">
              최근 6개월 이내 비행 기록 <span data-mbaas-oid="bvee4ux" className="font-mono-data tabular-nums font-semibold text-ink">{ifr.recentCount}</span>건 기준
            </p>

            <div data-mbaas-oid="ks0tcoi" className="mt-4 rounded-card border border-white/10 bg-panel p-cardpad">
              <div data-mbaas-oid="b2giksq" className="flex items-center justify-between gap-2">
                <div data-mbaas-oid="voyqtkb" className="flex items-center gap-2">
                  <Radar className="h-5 w-5 text-sky-600" aria-hidden="true" />
                  <h4 data-mbaas-oid="lmurce8" className="font-display text-base font-bold text-ink">계기비행 유지 요건</h4>
                </div>
                <StatusBadge tone={ifr.met ? 'met' : 'unmet'} label={ifr.met ? '기준 충족' : '기준 미달'} />
              </div>

              <div data-mbaas-oid="w1l8oco" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div data-mbaas-oid="lk574vs">
                  <p data-mbaas-oid="gl4lj2z" className="font-mono-data text-2xl font-extrabold tabular-nums text-ink">
                    {ifr.approachCount}<span data-mbaas-oid="clhpraa" className="ml-1 text-sm font-medium text-slate-400">/ 6회</span>
                  </p>
                  <p data-mbaas-oid="v06f6i8" className="mt-1 text-sm text-slate-400">누적 계기접근 횟수</p>
                </div>
                <div data-mbaas-oid="5ei5zp0">
                  <p data-mbaas-oid="39yvegt" className="font-mono-data text-2xl font-extrabold tabular-nums text-ink">
                    {ifr.instrumentHours.toFixed(1)}<span data-mbaas-oid="12j53sa" className="ml-1 text-sm font-medium text-slate-400">/ 6시간</span>
                  </p>
                  <p data-mbaas-oid="y3gaa9g" className="mt-1 text-sm text-slate-400">실제+모의계기 비행시간 합계</p>
                </div>
              </div>

              {ifr.checkDateValid && (
                <p data-mbaas-oid="g8j9kie" className="mt-3 rounded-control bg-go/10 px-3 py-2 text-xs font-medium text-go">
                  계기비행심사 이수일({formatDate(instrumentCheckDate as string)}) 기준 6개월 이내로, 계기비행심사로 유지 중입니다.
                </p>
              )}

              <div data-mbaas-oid="7qmm2q1" className="mt-5 border-t border-white/[0.08] pt-4">
                <label data-mbaas-oid="6l5qn2a" htmlFor="instrument-check-date" className="text-xs font-semibold text-slate-400">
                  계기비행심사 이수일(선택 입력)
                </label>
                <div data-mbaas-oid="10xfijw" className="mt-2 flex flex-wrap items-center gap-2">
                  <input
 data-mbaas-oid="gmmu91i" id="instrument-check-date"
                    type="date"
                    value={instrumentCheckDate ?? ''}
                    onChange={(e) => {
                      if (e.target.value) setInstrumentCheckDate(e.target.value)
                    }}
                    className="min-h-[44px] rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  />
                  {instrumentCheckDate && (
                    <button
 data-mbaas-oid="5p8i189" type="button"
                      onClick={clearInstrumentCheckDate}
                      className="inline-flex min-h-[44px] items-center rounded-control border border-white/10 bg-panel px-3 py-2 text-xs font-semibold text-slate-400
                        hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    >
                      지우기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. 조종교육 비행경험(교관) — 승인된 교관 계정에게만 노출 */}
          {isApprovedInstructor && (
          <section data-mbaas-oid="qv0ondt">
            <h3 data-mbaas-oid="72adiix" className="font-display text-lg font-extrabold text-ink">
              조종교육 비행경험(교관 커런시)
            </h3>
            <div data-mbaas-oid="djr0gnx" className="mt-2 rounded-control border border-sky/20 bg-sky/5 p-3 text-xs text-slate-400">
              최근 1년 이내 비행교관으로서의 비행시간 합계가 10시간 이상이어야 합니다. 조종교육증명을 최초로 취득한 날부터
              1년까지는 이 요건을 적용받지 않으며, 자격을 갖춘 자와 동승하여 야간 이·착륙 1회 이상을 포함한 10시간 이상
              비행 시에도 요건 충족으로 인정됩니다.
            </div>
            <p data-mbaas-oid="yld6fsw" className="mt-4 text-sm text-slate-400">
              최근 1년 이내 비행 기록 <span data-mbaas-oid="dn6z02m" className="font-mono-data tabular-nums font-semibold text-ink">{instructor.recentCount}</span>건 기준
            </p>

            <div data-mbaas-oid="s47h0gs" className="mt-4 rounded-card border border-white/10 bg-panel p-cardpad">
              <div data-mbaas-oid="vdrmb9b" className="flex items-center justify-between gap-2">
                <div data-mbaas-oid="u4lmk7p" className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-violet-600" aria-hidden="true" />
                  <h4 data-mbaas-oid="6fcbjtm" className="font-display text-base font-bold text-ink">교관 커런시 요건</h4>
                </div>
                {instructor.isNewInstructorGrace ? (
                  <StatusBadge tone="exempt" label="신임 교관 유예기간(요건 미적용)" />
                ) : (
                  <StatusBadge tone={instructor.met ? 'met' : 'unmet'} label={instructor.met ? '기준 충족' : '기준 미달'} />
                )}
              </div>

              <p data-mbaas-oid="ie7nezn" className="mt-4 font-mono-data text-3xl font-extrabold tabular-nums text-ink">
                {instructor.instructorHours.toFixed(1)}<span data-mbaas-oid="osuf5rq" className="ml-1 text-base font-medium text-slate-400">/ 10시간</span>
              </p>
              <p data-mbaas-oid="6gjpqfs" className="mt-1 text-sm text-slate-400">최근 1년 누적 비행교관 탑승 시간</p>

              {instructor.isNewInstructorGrace && (
                <p data-mbaas-oid="012nkp6" className="mt-3 rounded-control bg-sky/10 px-3 py-2 text-xs font-medium text-[#00D4FF]">
                  조종교육증명 최초 취득일({formatDate(instructorFirstCertDate as string)}) 기준 1년 이내로, 신임 교관
                  유예기간이 적용되어 이 요건이 적용되지 않습니다.
                </p>
              )}

              {!instructor.isNewInstructorGrace && instructorRecoveryChecked && (
                <p data-mbaas-oid="3u6ahy2" className="mt-3 rounded-control bg-go/10 px-3 py-2 text-xs font-medium text-go">
                  동승 비행 회복 조건 충족으로 자기 신고되었습니다. 본인이 조건 충족을 확인한 자기 신고 항목입니다.
                </p>
              )}

              <div data-mbaas-oid="zkkhsfh" className="mt-5 border-t border-white/[0.08] pt-4">
                <label data-mbaas-oid="kgoo318" htmlFor="instructor-first-cert-date" className="text-xs font-semibold text-slate-400">
                  조종교육증명 최초 취득일(선택 입력)
                </label>
                <div data-mbaas-oid="120hhf2" className="mt-2 flex flex-wrap items-center gap-2">
                  <input
 data-mbaas-oid="enfmix2" id="instructor-first-cert-date"
                    type="date"
                    value={instructorFirstCertDate ?? ''}
                    onChange={(e) => {
                      if (e.target.value) setInstructorFirstCertDate(e.target.value)
                    }}
                    className="min-h-[44px] rounded-control border border-white/10 bg-panel px-3 py-2 text-sm text-ink
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  />
                  {instructorFirstCertDate && (
                    <button
 data-mbaas-oid="o9dlt2z" type="button"
                      onClick={clearInstructorFirstCertDate}
                      className="inline-flex min-h-[44px] items-center rounded-control border border-white/10 bg-panel px-3 py-2 text-xs font-semibold text-slate-400
                        hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    >
                      지우기
                    </button>
                  )}
                </div>

                <label data-mbaas-oid="bv2o9e1" className="mt-4 flex min-h-[44px] items-start gap-2 text-sm text-slate-400">
                  <input
 data-mbaas-oid="6n5p7mj" type="checkbox"
                    checked={instructorRecoveryChecked}
                    onChange={(e) => setInstructorRecoveryChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/15 text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  />
                  <span data-mbaas-oid="03i94i9">
                    자격을 갖춘 자와 동승해 야간 이·착륙 1회 이상을 포함한 10시간 이상 비행으로 회복 조건을 충족했습니다
                  </span>
                </label>
                <p data-mbaas-oid="80c2e1t" className="mt-2 text-xs text-slate-400">
                  동승자의 자격 보유 여부는 로그북 데이터로 자동 판별할 수 없어 본인 확인에 따른 자기 신고 항목입니다.
                  
                </p>
              </div>
            </div>
          </section>
          )}
        </div>
      )}
    </div>
  )
}
