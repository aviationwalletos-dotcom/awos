// AiReadPanel — "사진에서 읽어오기(AI)" 버튼 + 결과 안내.
// 사진을 고르면 버튼이 활성화되고, 누르면 AI 가 읽은 값을 부모가 폼에 채운다. 사용자는 확인·수정 후 저장한다.
// (지훈 피드백: "AI 에게 일을 시키고 사람은 확인만")

import { Loader2, ScanText } from 'lucide-react'
import React, { useState } from 'react'

import { type ReadDocumentKind, type ReadDocumentResult, readDocumentWithAi } from '../lib/ai/readDocument'

interface AiReadPanelProps {
  kind: ReadDocumentKind
  file: File | null
  /** 여러 장이면 같이 읽는다(앞·뒷면). 없으면 file 하나 */
  files?: File[]
  /** 읽은 값을 폼에 채우고, 채운 항목의 한글 이름 목록을 돌려준다 */
  onApply: (result: ReadDocumentResult) => string[]
  className?: string
}

const CONFIDENCE_LABEL = { high: '읽기 상태 좋음', medium: '일부 확인 필요', low: '잘 안 읽힘 — 꼭 확인하세요' } as const

// 사진이 해외 AI 서버로 가는 것은 개인정보 국외 이전이라 동의를 받아야 해요(개인정보보호법 제28조의8).
// 기기당 한 번 받고 기억해요. 동의 전에는 버튼이 눌리지 않아요.
const CONSENT_KEY = 'awos_ai_transfer_consent'
function readConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

export function AiReadPanel({ kind, file, files, onApply, className = '' }: AiReadPanelProps) {
  const inputFiles = files && files.length > 0 ? files : file ? [file] : []
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ filled: string[]; notes: string[]; confidence: ReadDocumentResult['confidence']; quota?: ReadDocumentResult['quota'] } | null>(null)
  const [consented, setConsented] = useState(readConsent)

  function handleConsent(checked: boolean) {
    setConsented(checked)
    try {
      if (checked) window.localStorage.setItem(CONSENT_KEY, '1')
      else window.localStorage.removeItem(CONSENT_KEY)
    } catch {
      // 저장 못 해도 이번 화면에서는 동의 상태로 진행해요
    }
  }

  async function handleRead() {
    if (!file || !consented) return
    setIsReading(true)
    setError(null)
    setSummary(null)
    try {
      const result = await readDocumentWithAi(kind, inputFiles)
      const filled = onApply(result)
      setSummary({ filled, notes: result.notes, confidence: result.confidence, quota: result.quota })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 읽기에 실패했어요.')
    } finally {
      setIsReading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleRead()}
        disabled={!file || !consented || isReading}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-sky/40 bg-sky/10 px-4 text-sm font-semibold text-sky hover:bg-sky/15
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:cursor-not-allowed disabled:opacity-50"
        title={file ? '사진·PDF 를 AI 가 읽어 칸을 채워요. 채운 값은 꼭 확인하세요.' : '먼저 사진이나 PDF 를 골라 주세요'}
      >
        {isReading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanText className="h-4 w-4" aria-hidden="true" />}
        {isReading ? '읽는 중… (10~20초)' : '사진에서 읽어오기 (AI)'}
      </button>
      {!consented ? (
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-control border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-slate-300">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => handleConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#00D4FF]"
          />
          <span>
            사진·PDF 는 AI 가 읽기 위해 해외 서버(Anthropic, 미국)로 전송돼요. 읽는 데만 쓰이고 모델 학습에는 쓰이지 않아요.
            자격증에는 이름·생년월일·자격번호가 있어요. <span className="font-semibold text-ink">전송에 동의해요.</span>
          </span>
        </label>
      ) : (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {file
            ? `${inputFiles.length > 1 ? `${inputFiles.length}장을 함께 읽어요. ` : ''}사진·PDF 는 AI 읽기를 위해 해외 서버(Anthropic, 미국)로 전송돼요.`
            : '사진이나 PDF 를 고르면 AI 가 읽어 칸을 채워 줘요. 채운 값은 확인하고 고칠 수 있어요.'}
          {' '}
          <button type="button" onClick={() => handleConsent(false)} className="underline underline-offset-2 hover:text-slate-300">동의 철회</button>
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-300">{error}</p>}
      {summary && (
        <div role="status" className="mt-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100">
          <p className="font-semibold">
            AI 가 {summary.filled.length}개 칸을 채웠어요 · {CONFIDENCE_LABEL[summary.confidence]}
          </p>
          {summary.filled.length > 0 && <p className="mt-1 text-amber-200/90">{summary.filled.join(' · ')}</p>}
          {summary.notes.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-amber-200/90">
              {summary.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-[11px] text-amber-200/70">
            AI 가 읽은 값은 틀릴 수 있어요. 원본과 대조한 뒤 저장하세요. 문서에 없는 항목은 비워 둡니다(0으로 채우지 않아요).
            {summary.quota?.enforced && summary.quota.used !== null ? ` · 오늘 ${summary.quota.used}/${summary.quota.limit}회 사용` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
