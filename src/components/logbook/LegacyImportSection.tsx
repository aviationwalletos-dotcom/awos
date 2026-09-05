import { FileCheck2, FileSpreadsheet } from 'lucide-react'
import React, { useState } from 'react'

import { LegacyExcelImport } from './LegacyExcelImport'
import { FlightExperienceCertificateForm } from './FlightExperienceCertificateForm'
import type { LogbookEntryInput } from '../../types/logbook'
import { InfoTip } from '../InfoTip'

interface LegacyImportSectionProps {
  onAddEntries: (inputs: LogbookEntryInput[]) => void
}

type ImportTab = 'excel' | 'certificate'

const TABS: { key: ImportTab; label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[] = [
  { key: 'excel', label: '엑셀로 가져오기', icon: FileSpreadsheet },
  { key: 'certificate', label: '비행경력증명서로 가져오기', icon: FileCheck2 },
]

/**
 * 기존 종이 로그북(탈론 로그 등) 기록을 이 앱으로 옮겨오는 섹션이에요. 개인 엑셀 파일이 있으면
 * "엑셀로 가져오기"를, 엑셀 파일이 없으면 발급받은 비행경력증명서 사진과 항목별 누적 시간을 직접
 * 입력하는 "비행경력증명서로 가져오기"를 이용할 수 있어요.
 * "비행경력증명서로 가져오기"는 기관(학교) 계정의 승인/반려 워크플로우와 연동되어 있어요.
 */
export function LegacyImportSection({ onAddEntries }: LegacyImportSectionProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('excel')

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-300">
        가져오기 방법
        <InfoTip label="두 방법의 차이">
          <span className="font-semibold text-slate-100">엑셀로 가져오기</span>는 바로 기록에 들어가지만 기관(학교) 검토는 거치지 않아요.
          <br />
          <span className="font-semibold text-slate-100">비행경력증명서로 가져오기</span>는 증명서 사진을 첨부해 기관 담당자가 승인·반려해요. 공식 총 비행시간에 넣으려면 이쪽이에요.
        </InfoTip>
      </div>
      <div role="tablist" aria-label="종이 로그북 가져오기 방법 선택" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <button key={key}
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

      <div className="rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
        {activeTab === 'excel' ? (
          <LegacyExcelImport onImportEntries={onAddEntries} />
        ) : (
          <FlightExperienceCertificateForm onSubmit={(input) => onAddEntries([input])} />
        )}
      </div>
    </div>
  )
}
