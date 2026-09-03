import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  FileCheck2,
  FileDown,
  ListChecks,
  PlaneLanding,
  PlaneTakeoff,
  Printer,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { sumHours } from '../../lib/hours'
import type { LogbookEntry } from '../../types/logbook'

const PAGE_SIZE = 10

type DisplayBadge = 'X-C' | 'LCL' | 'NGT' | 'FTD'

const CATEGORY_BADGE: Record<DisplayBadge, string> = {
  NGT: 'bg-white/10 text-slate-200',
  'X-C': 'bg-sky/15 text-sky',
  LCL: 'bg-yellow-400/15 text-yellow-300',
  FTD: 'bg-orange-400/15 text-orange-300',
}

// 배지에 표시할 분류는 entry.flightCategory(단일 선택값, 엑셀 이관 기록은 기본값 '주간'으로
// 채워지는 경우가 많음)를 그대로 신뢰하지 않고, 지상훈련장비 시간 및 conditions의 실제 기록된
// 시간 값을 근거로 다시 계산합니다.
// 규칙:
// 1) 지상훈련장비 시간(groundTrainerTime)이 0보다 크면 다른 배지 없이 FTD만 표시합니다.
// 2) 그 외에는 크로스컨트리(X-C) 여부에 따라 X-C 또는 LCL을 기본 배지로 표시하고,
//    야간(NGT) 시간이 있으면 기본 배지 옆에 NGT 배지를 추가로 표시합니다.
function deriveBadges(entry: LogbookEntry): DisplayBadge[] {
  if ((entry.groundTrainerTime ?? 0) > 0) return ['FTD']

  const conditions = entry.conditions
  const baseBadge: DisplayBadge = (conditions?.crossCountry ?? 0) > 0 ? 'X-C' : 'LCL'
  const badges: DisplayBadge[] = [baseBadge]
  if ((conditions?.night ?? 0) > 0) badges.push('NGT')
  return badges
}

interface EntryListProps {
  entries: LogbookEntry[]
  /** 필터와 무관한 계정 전체 기록 수. "전체 삭제" 확인 문구/비활성화 판단에 사용합니다. */
  totalAccountEntryCount: number
  /** 서버에 아직 저장되지 않은(미동기화) 기록 수. 0보다 크면 경고 배지를 띄운다. */
  pendingSyncCount: number
  onSelect: (entry: LogbookEntry) => void
  onDeleteMany: (ids: string[]) => void
  onDeleteAll: () => void
  /** 계정 전체 비행기록을 CSV 파일로 내려받는다("내 데이터는 언제든 가져갈 수 있다" 백업 장치). */
  onExportCsv: () => void
  /** 계정 전체 비행기록을 인쇄용 문서로 연다(브라우저 인쇄에서 "PDF로 저장" 가능). */
  onPrint: () => void
  /** PDF 버튼 라벨(기본 'PDF 저장') */
  printLabel?: string
}

export function EntryList({
  entries,
  totalAccountEntryCount,
  pendingSyncCount,
  onSelect,
  onDeleteMany,
  onDeleteAll,
  onExportCsv,
  onPrint,
  printLabel = 'PDF 저장',
}: EntryListProps) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingDeleteSelected, setConfirmingDeleteSelected] = useState(false)
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false)

  // 클라이언트 사이드 페이지네이션 — 필터링된 entries를 PAGE_SIZE 단위로만 잘라 화면에 보여줍니다.
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))

  // 필터 변경이나 삭제로 목록이 줄어들어 현재 페이지가 범위를 벗어나면 마지막 유효 페이지로 보정합니다.
  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1))
    }
  }, [currentPage, totalPages])

  const pagedEntries = useMemo(
    () => entries.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [entries, currentPage],
  )

  // 필터 변경 등으로 목록에서 사라진 항목의 선택 상태는 정리합니다.
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => entries.some((e) => e.id === id)))
      return next.size === prev.size ? prev : next
    })
  }, [entries])

  function toggleSelectMode() {
    setSelectMode((prev) => !prev)
    setSelectedIds(new Set())
    setConfirmingDeleteSelected(false)
  }

  function toggleEntrySelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // "전체 선택"은 현재 페이지에 보이는 항목 기준으로 동작합니다. 다른 페이지에서 이미 선택된
  // 항목은 유지한 채 현재 페이지 항목만 추가/해제합니다.
  function toggleSelectAll() {
    const pageIds = pagedEntries.map((e) => e.id)
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function handleConfirmDeleteSelected() {
    onDeleteMany([...selectedIds])
    setSelectedIds(new Set())
    setConfirmingDeleteSelected(false)
    setSelectMode(false)
  }

  function handleConfirmDeleteAll() {
    onDeleteAll()
    setSelectedIds(new Set())
    setConfirmingDeleteSelected(false)
    setConfirmingDeleteAll(false)
    setSelectMode(false)
  }

  const totalHours = sumHours(entries.map((e) => e.blockTime))
  const allPageSelected = pagedEntries.length > 0 && pagedEntries.every((e) => selectedIds.has(e.id))

  return (
    <div data-mbaas-oid="lgblst2">
      <div data-mbaas-oid="h518hq7" className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div data-mbaas-oid="lgblstL" className="flex flex-wrap items-center gap-2.5">
          <p data-mbaas-oid="lgblst3" className="text-sm text-slate-400">
            총 <span data-mbaas-oid="lgblst4" className="font-mono-data tabular-nums font-semibold text-ink">{entries.length}</span>건 ·
            누적 블록타임 <span data-mbaas-oid="lgblst5" className="font-mono-data tabular-nums font-semibold text-ink">{totalHours.toFixed(1)}</span>시간
          </p>
          {pendingSyncCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300"
              title="네트워크 문제 등으로 서버에 아직 저장되지 않은 기록입니다. 이 기기(로컬)에는 안전하게 저장되어 있으며, 우측 상단 '서버와 다시 동기화' 버튼으로 재전송할 수 있어요."
            >
              <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              서버 미동기화 {pendingSyncCount}건
            </span>
          )}
        </div>

        <div data-mbaas-oid="6f17j5c" className="flex flex-wrap items-center gap-2">
          <Button
 data-mbaas-oid="9zrokrv" type="button"
            variant={selectMode ? 'solid' : 'outline'}
            tone="neutral"
            size="sm"
            onClick={toggleSelectMode}
          >
            {selectMode ? <X className="h-4 w-4" aria-hidden="true" /> : <ListChecks className="h-4 w-4" aria-hidden="true" />}
            {selectMode ? '선택 모드 종료' : '선택 모드'}
          </Button>
          <Button
            type="button"
            variant="outline"
            tone="brand"
            size="sm"
            disabled={totalAccountEntryCount === 0}
            onClick={onExportCsv}
            title="계정의 모든 비행기록을 CSV 파일로 저장합니다 (필터와 무관)"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            CSV 백업
          </Button>
          <Button
            type="button"
            variant="outline"
            tone="neutral"
            size="sm"
            disabled={totalAccountEntryCount === 0}
            onClick={onPrint}
            title="이 자격 구분의 비행기록 전체를 비행경력증명서 서식으로 만들어요. 대화상자에서 'PDF로 저장'을 고르면 파일이 됩니다."
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {printLabel}
          </Button>
          <Button
 data-mbaas-oid="hmmvzx5" type="button"
            variant="outline"
            tone="danger"
            size="sm"
            disabled={totalAccountEntryCount === 0}
            onClick={() => setConfirmingDeleteAll(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            전체 삭제
          </Button>
        </div>
      </div>

      {confirmingDeleteAll && (
        <div data-mbaas-oid="91qh6lh" role="alert" className="mb-4 rounded-control border border-rose-400/40 bg-rose-500/10 p-4">
          <p data-mbaas-oid="ubb5imv" className="text-sm font-medium text-rose-300">
            등록된 모든 비행 기록({totalAccountEntryCount}건)을 삭제하시겠습니까? 되돌릴 수 없습니다.
            <br data-mbaas-oid="ycfoig4" />
            이 작업은 현재 적용된 필터와 무관하게 이 계정의 모든 비행 기록을 삭제합니다. 필터링된 목록 중 일부만 지우려면 "선택 모드"의 선택 삭제 기능을 이용해 주세요.
          </p>
          <div data-mbaas-oid="vp6qib0" className="mt-3 flex gap-2">
            <Button data-mbaas-oid="0dhlju7" type="button" tone="danger" size="sm" onClick={handleConfirmDeleteAll}>
              삭제 확인
            </Button>
            <Button
 data-mbaas-oid="p14nptm" type="button"
              variant="outline"
              tone="neutral"
              size="sm"
              onClick={() => setConfirmingDeleteAll(false)}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {selectMode && entries.length > 0 && (
        <div data-mbaas-oid="cx46624" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-white/10 bg-surface p-3">
          <button
 data-mbaas-oid="zortjod" type="button"
            onClick={toggleSelectAll}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-ink
              hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            {allPageSelected ? <CheckSquare className="h-4 w-4 text-sky" aria-hidden="true" /> : <Square className="h-4 w-4 text-slate-400" aria-hidden="true" />}
            {allPageSelected ? '현재 페이지 전체 해제' : '현재 페이지 전체 선택'}
          </button>

          {confirmingDeleteSelected ? (
            <div data-mbaas-oid="0oyl8ld" role="alert" className="flex flex-wrap items-center gap-2">
              <span data-mbaas-oid="536998z" className="text-sm font-medium text-rose-300">
                선택한 {selectedIds.size}건을 삭제하시겠습니까? 되돌릴 수 없습니다.
              </span>
              <Button data-mbaas-oid="nax9ms6" type="button" tone="danger" size="sm" onClick={handleConfirmDeleteSelected}>
                삭제 확인
              </Button>
              <Button
 data-mbaas-oid="r9c1ete" type="button"
                variant="outline"
                tone="neutral"
                size="sm"
                onClick={() => setConfirmingDeleteSelected(false)}
              >
                취소
              </Button>
            </div>
          ) : (
            <Button
 data-mbaas-oid="whhk6i3" type="button"
              variant="outline"
              tone="danger"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setConfirmingDeleteSelected(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              선택한 {selectedIds.size}건 삭제
            </Button>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={PlaneTakeoff}
          title="조건에 맞는 비행 기록이 없습니다"
          description="위 입력 폼으로 첫 기록을 추가하거나 필터를 변경해 보세요."
        />
      ) : (
        <>
        <ul data-mbaas-oid="lgblst6" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pagedEntries.map((entry) => {
            const isSelected = selectedIds.has(entry.id)
            const badges = deriveBadges(entry)
            return (
              <li data-mbaas-oid="lgblst7" key={entry.id} className="relative">
                {selectMode && (
                  <span
 data-mbaas-oid="w3ditq1" aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded border border-white/15 bg-panel"
                  >
                    {isSelected && <CheckSquare className="h-4 w-4 text-sky" aria-hidden="true" />}
                  </span>
                )}
                <button
                  data-mbaas-oid="lgblst8" type="button"
                  role={selectMode ? 'checkbox' : undefined}
                  aria-checked={selectMode ? isSelected : undefined}
                  onClick={() => (selectMode ? toggleEntrySelected(entry.id) : onSelect(entry))}
                  className={`w-full rounded-card border bg-panel p-5 text-left transition-all duration-200
                    hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                    ${selectMode ? 'pl-12' : ''}
                    ${isSelected ? 'border-sky ring-1 ring-sky' : 'border-white/10 hover:border-sky'}`}
                >
                  <div data-mbaas-oid="lgblst9" className="flex items-center justify-between gap-2">
                    <span data-mbaas-oid="a9r2icw" className="font-mono-data tabular-nums text-sm font-semibold text-ink">{entry.date}</span>
                    <span data-mbaas-oid="qrvj1hd" className="flex items-center gap-1.5">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          data-mbaas-oid="630c1cu"
                          className={`rounded-control px-2.5 py-1 text-xs font-bold ${CATEGORY_BADGE[badge]}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </span>
                  </div>

                  <div data-mbaas-oid="0uwrum6" className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                    <PlaneTakeoff className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span data-mbaas-oid="9ldnzh0" className="font-mono-data">{entry.departure}</span>
                    <span data-mbaas-oid="dvdm2t4" aria-hidden="true">→</span>
                    <PlaneLanding className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span data-mbaas-oid="0o59f6m" className="font-mono-data">{entry.arrival}</span>
                  </div>

                  <div data-mbaas-oid="jnsa4mi" className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span data-mbaas-oid="7bk85y1" className="text-sm font-medium text-ink">
                      {entry.aircraftType}
                      {entry.aircraftIdentification && (
                        <span data-mbaas-oid="82py1p1" className="ml-1.5 font-mono-data text-xs font-normal text-slate-400">{entry.aircraftIdentification}</span>
                      )}
                    </span>
                  </div>

                  <p data-mbaas-oid="dk1wam7" className="mt-2 font-mono-data tabular-nums text-sm text-slate-400">
                    블록타임 {entry.blockTime.toFixed(1)}시간
                  </p>

                  <div data-mbaas-oid="97d5akg" className="mt-3 flex flex-wrap items-center gap-2">
                    {!entry.syncPostId && (
                      <span
                        data-mbaas-oid="synp3nd" className="inline-flex items-center gap-1 rounded-control bg-white/[0.07] px-2.5 py-1 text-xs font-bold text-slate-400"
                        title="아직 서버에 저장되지 않아 다른 기기에서 보이지 않을 수 있습니다. 잠시 후 자동으로 다시 시도합니다."
                      >
                        <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
                        서버 동기화 대기중
                      </span>
                    )}
                    {entry.instructorSignature && (
                      <StatusBadge tone="success" icon={ShieldCheck} label="교관 서명 완료" />
                    )}
                    {entry.origin === 'flight_experience_certificate' && (
                      <StatusBadge
                        tone={
                          entry.certificateApprovalStatus === 'confirmed'
                            ? 'success'
                            : entry.certificateApprovalStatus === 'rejected'
                            ? 'danger'
                            : 'pending'
                        }
                        icon={FileCheck2}
                        label={`비행경력증명서 · ${
                          entry.certificateApprovalStatus === 'confirmed'
                            ? '인증완료'
                            : entry.certificateApprovalStatus === 'rejected'
                            ? '반려됨'
                            : '인증 대기중'
                        }`}
                      />
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {totalPages > 1 && (
          <div data-mbaas-oid="lgbpgn1" className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <Button
              data-mbaas-oid="lgbpgn2" type="button" variant="outline" tone="neutral" size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              이전
            </Button>
            <p data-mbaas-oid="lgbpgn3" className="font-mono-data text-xs tabular-nums text-slate-400">
              {currentPage + 1} / 총 {totalPages}페이지
            </p>
            <Button
              data-mbaas-oid="lgbpgn4" type="button" variant="outline" tone="neutral" size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
            >
              다음
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
        </>
      )}
    </div>
  )
}
