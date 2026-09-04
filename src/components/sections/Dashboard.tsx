import React from 'react'
import { ArrowRight, FileCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Reveal } from '../Reveal'
import { Button } from '../Button'
import { DASHBOARD_ROWS } from '../../data/content'

export function Dashboard() {
  return (
    <section id="dashboard" className="relative overflow-hidden bg-navy-dark py-[clamp(80px,10vw,160px)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(0,212,255,0.12),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky">기관 대시보드 미리보기</p>
          <h2 className="mt-3 max-w-2xl font-display font-extrabold"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            Red/Green 신호로 결격 인원을 즉시 식별
          </h2>
        </Reveal>

        <Reveal className="mt-12">
          <div className="rounded-card border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-bold">인력 자격 상태 모니터링</h3>
              <span className="inline-flex items-center gap-2 rounded-control border border-go/30 bg-go/10 px-3 py-1.5 text-xs font-bold text-go">
                <span className="pulse-live h-2 w-2 rounded-full bg-go" aria-hidden="true" />
                LIVE
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                    <th scope="col" className="py-3 pr-4 font-medium">인력</th>
                    <th scope="col" className="py-3 pr-4 font-medium">역할</th>
                    <th scope="col" className="py-3 pr-4 font-medium">자격 항목</th>
                    <th scope="col" className="py-3 pr-4 font-medium">만료일</th>
                    <th scope="col" className="py-3 pr-4 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {DASHBOARD_ROWS.map((row) => (
                    <tr key={row.name} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium">{row.name}</td>
                      <td className="py-3 pr-4 text-slate-300">{row.role}</td>
                      <td className="py-3 pr-4 text-slate-300">{row.credential}</td>
                      <td className="py-3 pr-4 font-mono-data tabular-nums text-slate-300">{row.expiry}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-bold ${
                            row.status === 'GO' ? 'bg-go/15 text-go' : 'bg-rose-500/100/15 text-rose-400'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${row.status === 'GO' ? 'bg-go' : 'bg-rose-500/100'}`}
                          />
                          {row.status === 'GO' ? 'GO' : '결격 위험'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="outline" tone="neutral" size="sm" className="border-white/25 text-white hover:bg-white/10">
                <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                감사 리포트 자동 생성
              </Button>
              <Link to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-control bg-sky px-4 py-2 text-sm font-semibold text-navy shadow-[0_0_24px_rgba(0,212,255,0.35)]
                  transition-all duration-200 hover:bg-sky/90 active:scale-[0.98]
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                기관 대시보드 전체 보기
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
