import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, UserCircle2 } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'

export function Nav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { account, isAuthenticated, isLoading, logout, isLoggingOut } = useAuth()

  async function handleLogout() {
    try {
      await logout()
      setOpen(false)
      navigate('/')
    } catch {
      // 오류는 useLogout 훅의 error 상태로 관리되며, 상단 알림은 필요 시 추가할 수 있다.
    }
  }

  return (
    <header data-mbaas-oid="ip4kj4d" className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur">
      <nav data-mbaas-oid="j7hhir9" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="주 메뉴">
        <a data-mbaas-oid="bz40x8z" href="#hero" className="font-display text-lg font-extrabold tracking-tight text-white">
          Aviation Wallet <span data-mbaas-oid="t4qs50o" className="text-sky">OS</span>
        </a>

        <ul data-mbaas-oid="ov7zpl6" className="hidden items-center gap-8 md:flex">
          <li data-mbaas-oid="lgbnav1">
            <Link
              data-mbaas-oid="lgbnav2" to="/logbook"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              AWOS
            </Link>
          </li>
          <li data-mbaas-oid="orgnav1">
            <Link
              data-mbaas-oid="inqnav1" to="/inquiry"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              문의
            </Link>
          </li>
          <li data-mbaas-oid="mf6257y">
          </li>
        </ul>

        <div data-mbaas-dynamic="true" data-mbaas-oid="keqphgq" className="hidden items-center gap-2 md:flex">
          {!isLoading && isAuthenticated ? (
            <>
              <Link
                data-mbaas-oid="jx5qtx8" to="/account"
                className="inline-flex items-center gap-1.5 rounded-control border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                <span data-mbaas-oid="k3zl1h5" data-mbaas-dynamic="true">{account?.name ?? '내 계정'}</span>
              </Link>
              <button
                data-mbaas-oid="4efyjjm" type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 rounded-control border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </button>
            </>
          ) : (
            <Link
              data-mbaas-oid="lgbnav3" to="/login"
              className="rounded-control border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              로그인
            </Link>
          )}
        </div>

        <button
          data-mbaas-oid="xrm5p86" type="button"
          className="flex h-11 w-11 items-center justify-center rounded-control text-white md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span data-mbaas-oid="r80y0w8" className="relative block h-4 w-6">
            <span
              data-mbaas-oid="33ukuap" className={`absolute left-0 top-0 h-0.5 w-6 bg-panel transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`}
            />
            <span data-mbaas-oid="g9gv4ne" className={`absolute left-0 top-[7px] h-0.5 w-6 bg-panel transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span
              data-mbaas-oid="5f596tx" className={`absolute left-0 top-[14px] h-0.5 w-6 bg-panel transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
            />
          </span>
        </button>
      </nav>

      {open && (
        <ul data-mbaas-oid="7lfawi7" className="flex flex-col gap-1 border-t border-white/10 px-6 py-4 md:hidden">
          {!isLoading && isAuthenticated ? (
            <>
              <li data-mbaas-oid="gbxszmw">
                <Link
                  data-mbaas-oid="h6t0aeu" to="/account"
                  onClick={() => setOpen(false)}
                  className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  <span data-mbaas-oid="rttsqkz" data-mbaas-dynamic="true">{account?.name ?? '내 계정'}</span>님 · 계정정보
                </Link>
              </li>
              <li data-mbaas-oid="p0b2nmi">
                <button
                  data-mbaas-oid="i4tkm5r" type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="block w-full rounded-control px-2 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </li>
            </>
          ) : (
            <li data-mbaas-oid="9nd3d0x">
              <Link
                data-mbaas-oid="3u06wpx" to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                로그인
              </Link>
            </li>
          )}
          <li data-mbaas-oid="lgbnav4">
            <Link
              data-mbaas-oid="lgbnav5" to="/logbook"
              onClick={() => setOpen(false)}
              className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              개인 사용자 · AWOS
            </Link>
          </li>
          <li data-mbaas-oid="orgnav4">
            <Link
              data-mbaas-oid="inqnav2" to="/inquiry"
              onClick={() => setOpen(false)}
              className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              문의하기
            </Link>
          </li>
          <li data-mbaas-oid="0f28wex">
          </li>
          <li data-mbaas-oid="im9tx7b" className="pt-2">
            <a
              data-mbaas-oid="5tbsoxs" href="#contact"
              onClick={() => setOpen(false)}
              className="block rounded-control bg-sky px-4 py-3 text-center text-sm font-semibold text-navy"
            >
              도입 문의하기
            </a>
          </li>
        </ul>
      )}
    </header>
  )
}
