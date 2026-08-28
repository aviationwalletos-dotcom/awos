import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../Button'
import { Reveal } from '../Reveal'

// 랜딩 마무리 CTA.
// 기관 대시보드·도입 문의 섹션을 걷어낸 뒤의 닫는 문단 — 조종사 한 사람의 다음 행동
// (가입) 하나만 남긴다. LogTen/ForeFlight식 단일 목적 랜딩의 마무리 방식.

export function FinalCta() {
  const navigate = useNavigate()

  return (
    <section className="bg-navy-dark py-[clamp(64px,8vw,120px)]">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2
            className="font-display font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.6rem, 1.3rem + 1.5vw, 2.25rem)', letterSpacing: '-0.02em' }}
          >
            오늘 비행부터 기록해 보세요
          </h2>
          <p className="mt-4 text-slate-400">
            가입 후 30초면 첫 기록이 저장됩니다. 기존 엑셀 로그북이 있다면 그대로 가져올 수 있습니다.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => navigate('/signup')}>
              시작하기
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-500">개인 사용자 무료 · 데이터는 언제든 CSV로 내보낼 수 있습니다</p>
        </Reveal>
      </div>
    </section>
  )
}
