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
            항공 종사자와 기관을 위한 자격 리스크 방어 인프라입니다. 개인 자격 월렛과 기관 관제 대시보드를 통해
            자격 공백을 사전에 차단합니다.
          </p>
        </div>

        <div data-mbaas-oid="qza71ni" className="flex flex-col gap-2 text-xs sm:items-end">
          <p data-mbaas-oid="qo3f5eb">문의: contact@aviationwalletos.example</p>
          <nav data-mbaas-oid="ehtb4fs" aria-label="푸터 링크" className="flex gap-4">
            <a data-mbaas-oid="qwgdrlh" href="#hero" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              맨 위로
            </a>
            <a data-mbaas-oid="ke3drbr" href="#pricing" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              가격 안내
            </a>
            <a data-mbaas-oid="0bdly8g" href="#contact" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              도입 문의
            </a>
            <Link data-mbaas-oid="lgbnav6" to="/logbook" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              디지털 로그북
            </Link>
            <Link data-mbaas-oid="orgnav6" to="/dashboard" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              기관 대시보드
            </Link>
            <Link data-mbaas-oid="d710cn0" to="/fleet" className="hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded">
              Flight Radar
            </Link>
          </nav>
          <p data-mbaas-oid="2b5qdl8" className="mt-2 text-slate-400">© 2026 Aviation Wallet OS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
