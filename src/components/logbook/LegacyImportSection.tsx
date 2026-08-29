import { FileCheck2, FileSpreadsheet, Info } from 'lucide-react'
import React, { useState } from 'react'

import { LegacyExcelImport } from './LegacyExcelImport'
import { FlightExperienceCertificateForm } from './FlightExperienceCertificateForm'
import type { LogbookEntryInput } from '../../types/logbook'

interface LegacyImportSectionProps {
  onAddEntries: (inputs: LogbookEntryInput[]) => void
}

type ImportTab = 'excel' | 'certificate'

const TABS: { key: ImportTab; label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[] = [
  { key: 'excel', label: '엑셀로 가져오기', icon: FileSpreadsheet },
  { key: 'certificate', label: '비행경력증명서로 가져오기', icon: FileCheck2 },
]

/**
 * 기존 종이 로그북(탈론 로그 등) 기록을 이 앱으로 옮겨오는 섹션입니다. 개인 엑셀 파일이 있으면
 * "엑셀로 가져오기"를, 엑셀 파일이 없으면 발급받은 비행경력증명서 사진과 항목별 누적 시간을 직접
 * 입력하는 "비행경력증명서로 가져오기"를 이용할 수 있습니다.
 * "비행경력증명서로 가져오기"는 기관(학교) 계정의 승인/반려 워크플로우와 연동되어 있습니다.
 */
export function LegacyImportSection({ onAddEntries }: LegacyImportSectionProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('excel')

  return (
    <div data-mbaas-oid="w8i2xew">
      <div data-mbaas-oid="ykf6lyp" className="mb-6 flex items-start gap-3 rounded-control border border-amber-400/40 bg-amber-400/10 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p data-mbaas-oid="4o37c8l" className="text-xs text-amber-300">
          "엑셀로 가져오기"로 저장한 기록은 일반 비행기록과 동일하게 로컬과 서버에 동기화되지만, 기관(학교)의
          별도 검토·승인 절차는 거치지 않습니다. 기관의 확인이 필요한 경우 "비행경력증명서로 가져오기"를
          이용해 증명서 사진을 첨부해 주세요. 이 항목은 기관 계정 대시보드로 전달되어 담당자가 직접
          승인 또는 반려할 수 있습니다.
        </p>
      </div>

      <div data-mbaas-oid="gvg7nio" role="tablist" aria-label="종이 로그북 가져오기 방법 선택" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <button
              data-mbaas-oid="hc2zbac" key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-state={isActive ? 'active' : 'idle'}
              onClick={() => setActiveTab(key)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition-colors
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                ${isActive ? 'border-sky bg-sky/10 text-[#00D4FF]' : 'border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]'}`}
            >
              <Icon className="h-4 w-4" aria-hidden={true} />
              {label}
            </button>
          )
        })}
      </div>

      <div data-mbaas-oid="qx2vtm7" className="rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
        {activeTab === 'excel' ? (
          <LegacyExcelImport onImportEntries={onAddEntries} />
        ) : (
          <FlightExperienceCertificateForm onSubmit={(input) => onAddEntries([input])} />
        )}
      </div>
    </div>
  )
}
