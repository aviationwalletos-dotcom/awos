import { FileSpreadsheet, FileText, PlaneTakeoff } from 'lucide-react'
import React from 'react'

// 가입 직후 빈 로그북을 만난 사용자를 위한 시작 안내.
//
// 빈 표는 "그래서 뭘 해야 하지?"라는 이탈 지점이다. 사용자의 실제 상황은 셋 중 하나이므로
// (기존 엑셀 로그북 보유 / 비행경력증명서만 보유 / 완전 처음), 그 세 갈래를 큰 카드로 제시해
// 다음 행동을 명확하게 만든다.

interface LogbookOnboardingProps {
  onStartExcel: () => void
  onStartCertificate: () => void
  onStartNew: () => void
}

const CARD_CLASS =
  'group w-full rounded-card border border-white/10 bg-panel p-6 text-left transition-all hover:border-sky/40 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky'

export function LogbookOnboarding({ onStartExcel, onStartCertificate, onStartNew }: LogbookOnboardingProps) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.03] p-cardpad">
      <h3 className="font-display text-xl font-extrabold text-ink">로그북을 시작해 볼까요?</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        지금 상황에 맞는 방법을 고르세요. 어떤 방법으로 시작해도 이후에 나머지를 병행할 수 있어요.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <button type="button" className={CARD_CLASS} onClick={onStartExcel}>
          <FileSpreadsheet className="h-6 w-6 text-sky" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-bold text-ink">엑셀 로그북 가져오기</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            기존에 엑셀 파일로 관리했다면 — 업로드하면 컬럼을 자동으로 매핑해 일괄 등록해요.
          </p>
        </button>

        <button type="button" className={CARD_CLASS} onClick={onStartCertificate}>
          <FileText className="h-6 w-6 text-sky" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-bold text-ink">비행경력증명서로 시작</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            엑셀 파일은 없고 증명서만 있다면 — 항목별 누적 시간을 입력해 이관해요.
          </p>
        </button>

        <button type="button" className={CARD_CLASS} onClick={onStartNew}>
          <PlaneTakeoff className="h-6 w-6 text-sky" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-bold text-ink">첫 비행 기록하기</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            오늘부터 새로 시작한다면 — 날짜·구간·기종·시간만으로 30초면 기록돼요.
          </p>
        </button>
      </div>
    </div>
  )
}
