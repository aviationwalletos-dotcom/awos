import React from 'react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer data-mbaas-oid="ymkqwwe" className="bg-navy-dark py-10 text-slate-400">
      <div data-mbaas-oid="fr2xgl3" className="mx-auto flex max-w-7xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div data-mbaas-oid="ks4jx9r">
          <p data-mbaas-oid="7sotgjx" className="font-display text-base font-bold text-white">
            Aviation Wallet <span data-mbaas-oid="qp63jmo" className="text-sky">OS</span>
          </p>
          <p data-mbaas-oid="49dd067" className="mt-1 max-w-sm text-xs leading-relaxed">
            조종사를 위한 디지털 로그북입니다. 국내 비행경력증명서 서식으로 기록하고,
            자격 유효기간과 커런시를 함께 관리합니다.
          </p>
        </div>

        <div data-mbaas-oid="qza71ni" className="flex flex-col gap-2 text-xs sm:items-end">
          <p data-mbaas-oid="qo3f5eb">문의: contact@aviationwalletos.example</p>
          <nav data-mbaas-oid="ehtb4fs" aria-label="푸터 링크" className="flex gap-4">
            <a data-mbaas-oid="qwgdrlh" href="#features" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              기능 명세
            </a>
            <Link data-mbaas-oid="lgbnav6" to="/logbook" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              디지털 로그북
            </Link>
          </nav>
          <p data-mbaas-oid="2b5qdl8" className="mt-2 text-slate-400">© 2026 Aviation Wallet OS. All rights reserved.</p>
        </div>
      </div>
      <p data-mbaas-oid="ftlgl" className="mt-4 text-center text-xs text-slate-500">
        <a data-mbaas-oid="ftlgl1" href="/terms.html" className="hover:text-slate-300">이용약관</a>
        <span data-mbaas-oid="ftlgl2" className="mx-2">·</span>
        <a data-mbaas-oid="ftlgl3" href="/privacy.html" className="hover:text-slate-300">개인정보처리방침</a>
      </p>
    </footer>
  )
}
