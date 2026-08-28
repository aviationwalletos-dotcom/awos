import React, { useState } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'

import { Reveal } from '../Reveal'
import { Button } from '../Button'
import { ORG_TYPES } from '../../data/content'

type FormState = 'idle' | 'error' | 'success'

interface FieldErrors {
  orgName?: string
  contactName?: string
  email?: string
  phone?: string
  consent?: string
}

export function Contact() {
  const [status, setStatus] = useState<FormState>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nextErrors: FieldErrors = {}

    if (!String(form.get('orgName') || '').trim()) nextErrors.orgName = '기관명을 입력해 주세요.'
    if (!String(form.get('contactName') || '').trim()) nextErrors.contactName = '담당자명을 입력해 주세요.'
    const email = String(form.get('email') || '').trim()
    if (!email) nextErrors.email = '이메일을 입력해 주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = '이메일 형식을 확인해 주세요.'
    if (!form.get('consent')) nextErrors.consent = '개인정보 수집 동의가 필요합니다.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setStatus('error')
      return
    }

    // NOTE: 실제 제출/백엔드 연동은 이번 UI 구현 범위 밖입니다. docs/TODO.md 참고.
    setErrors({})
    setStatus('success')
  }

  function handleReset() {
    setStatus('idle')
    setErrors({})
  }

  return (
    <section data-mbaas-oid="cbc9qeq" id="contact" className="bg-navy py-[clamp(80px,10vw,160px)] text-white">
      <div data-mbaas-oid="wzq255w" className="mx-auto max-w-3xl px-6">
        <Reveal>
          <p data-mbaas-oid="ci98qoh" className="text-sm font-semibold uppercase tracking-wide text-sky">도입 문의</p>
          <h2
            data-mbaas-oid="isiejxg" className="mt-3 font-display font-extrabold"
            style={{ fontSize: 'clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            지금 파일럿 도입을 문의하세요
          </h2>
          <p data-mbaas-oid="i3edy93" className="mt-4 text-slate-300">
            제출 후 담당자가 영업일 기준 2일 이내에 연락드립니다.
          </p>
        </Reveal>

        {status === 'success' ? (
          <Reveal className="mt-10">
            <div data-mbaas-oid="5eztozg" className="flex flex-col items-center gap-4 rounded-card border border-go/30 bg-go/10 p-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-go" aria-hidden="true" />
              <div data-mbaas-oid="hxi1a8v">
                <h3 data-mbaas-oid="5560cci" className="text-lg font-bold text-white">문의가 접수되었습니다</h3>
                <p data-mbaas-oid="105erei" className="mt-2 text-sm text-slate-300">
                  영업일 기준 2일 이내에 담당자가 이메일 또는 전화로 연락드릴 예정입니다.
                </p>
              </div>
              <Button data-mbaas-oid="4eandph" variant="outline" tone="neutral" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                다시 작성하기
              </Button>
            </div>
          </Reveal>
        ) : (
          <Reveal className="mt-10">
            <form data-mbaas-oid="drgxdc5" noValidate onSubmit={handleSubmit} className="space-y-5">
              {status === 'error' && (
                <div data-mbaas-oid="nz49wbw" role="alert" className="rounded-control border border-rose-500/40 bg-rose-500/100/10 px-4 py-3 text-sm text-rose-200">
                  입력하신 내용을 다시 확인해 주세요. 문제가 반복되면 잠시 후 다시 시도해 주세요.
                </div>
              )}

              <div data-mbaas-oid="plz6pd0">
                <label data-mbaas-oid="r2kr30v" htmlFor="orgName" className="mb-1.5 block text-sm font-medium text-slate-200">
                  기관명
                </label>
                <input
                  data-mbaas-oid="1xhqkdz" id="orgName"
                  name="orgName"
                  type="text"
                  className="w-full rounded-control border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  placeholder="예: 한국항공훈련원"
                  aria-invalid={Boolean(errors.orgName)}
                  aria-describedby={errors.orgName ? 'orgName-error' : undefined}
                />
                {errors.orgName && (
                  <p data-mbaas-oid="bon5z9a" id="orgName-error" className="mt-1.5 text-xs text-rose-300">
                    {errors.orgName}
                  </p>
                )}
              </div>

              <div data-mbaas-oid="ogmhhan">
                <label data-mbaas-oid="01p6ud9" htmlFor="contactName" className="mb-1.5 block text-sm font-medium text-slate-200">
                  담당자명
                </label>
                <input
                  data-mbaas-oid="csj6g96" id="contactName"
                  name="contactName"
                  type="text"
                  className="w-full rounded-control border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  placeholder="예: 홍길동"
                  aria-invalid={Boolean(errors.contactName)}
                  aria-describedby={errors.contactName ? 'contactName-error' : undefined}
                />
                {errors.contactName && (
                  <p data-mbaas-oid="9zix9fe" id="contactName-error" className="mt-1.5 text-xs text-rose-300">
                    {errors.contactName}
                  </p>
                )}
              </div>

              <div data-mbaas-oid="kfdydat" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div data-mbaas-oid="nq6by4k">
                  <label data-mbaas-oid="dd5eq1u" htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
                    이메일
                  </label>
                  <input
                    data-mbaas-oid="pf3ldsl" id="email"
                    name="email"
                    type="email"
                    className="w-full rounded-control border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    placeholder="name@company.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p data-mbaas-oid="69i8yzr" id="email-error" className="mt-1.5 text-xs text-rose-300">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div data-mbaas-oid="ojtwuzt">
                  <label data-mbaas-oid="bw4h4t6" htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-200">
                    전화번호 (선택)
                  </label>
                  <input
                    data-mbaas-oid="wccciz8" id="phone"
                    name="phone"
                    type="tel"
                    className="w-full rounded-control border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              <div data-mbaas-oid="67p52wb">
                <label data-mbaas-oid="rez8gtq" htmlFor="orgType" className="mb-1.5 block text-sm font-medium text-slate-200">
                  기관 유형
                </label>
                <select
                  data-mbaas-oid="dqlya7m" id="orgType"
                  name="orgType"
                  defaultValue={ORG_TYPES[0]}
                  className="w-full rounded-control border border-white/15 bg-white/5 px-4 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  {ORG_TYPES.map((t) => (
                    <option data-mbaas-oid="ghs96s0" key={t} value={t} className="bg-navy">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div data-mbaas-oid="hwqef2r">
                <label data-mbaas-oid="njnv6bw" htmlFor="content" className="mb-1.5 block text-sm font-medium text-slate-200">
                  문의 내용 (선택)
                </label>
                <textarea
                  data-mbaas-oid="u4jlk9h" id="content"
                  name="content"
                  rows={4}
                  className="w-full rounded-control border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  placeholder="현재 자격 관리 방식과 궁금하신 점을 남겨 주세요."
                />
              </div>

              <div data-mbaas-oid="4pkrew1">
                <label data-mbaas-oid="uxjxjiw" className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    data-mbaas-oid="priiw7a" type="checkbox"
                    name="consent"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/30 bg-white/5 text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? 'consent-error' : undefined}
                  />
                  <span data-mbaas-oid="k5d15do">개인정보 수집 및 이용에 동의합니다. (필수)</span>
                </label>
                {errors.consent && (
                  <p data-mbaas-oid="lym7hfy" id="consent-error" className="mt-1.5 text-xs text-rose-300">
                    {errors.consent}
                  </p>
                )}
              </div>

              <Button data-mbaas-oid="0xi44xd" type="submit" size="lg" className="w-full sm:w-auto">
                문의 제출하기
              </Button>
            </form>
          </Reveal>
        )}
      </div>
    </section>
  )
}
