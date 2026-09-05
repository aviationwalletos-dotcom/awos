import React from 'react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-navy-dark py-10 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-bold text-white">
            Aviation Wallet <span className="text-sky">OS</span>
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed">
            조종사를 위한 디지털 로그북이에요. 국내 비행경력증명서 서식으로 기록하고,
            자격 유효기간과 커런시를 함께 관리해요.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-xs sm:items-end">
          <p>문의: awos.help@gmail.com</p>
          <nav aria-label="푸터 링크" className="flex gap-4">
            <a href="#features" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              기능 명세
            </a>
            <Link to="/logbook" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              디지털 로그북
            </Link>
          </nav>
          <p className="mt-2 text-slate-400">© 2026 Aviation Wallet OS. All rights reserved.</p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        <a href="/inquiry" className="hover:text-slate-300">문의하기</a>
        <span className="mx-2">·</span>
        <a href="/terms.html" className="hover:text-slate-300">이용약관</a>
        <span className="mx-2">·</span>
        <a href="/privacy.html" className="hover:text-slate-300">개인정보처리방침</a>
      </p>
    </footer>
  )
}
