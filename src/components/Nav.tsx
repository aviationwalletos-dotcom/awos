import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, UserCircle2 } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'

export function Nav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { account, isAuthenticated, isLoading, logout, isLoggingOut, userType } = useAuth()
  // 기관(관리자) 계정은 로그북 대신 대시보드가 홈이다
  const isOrg = isAuthenticated && userType === 'organization'
  const homePath = isOrg ? '/dashboard' : '/logbook'
  const homeLabel = isOrg ? 'DASHBOARD' : 'AWOS'

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="주 메뉴">
        <a href="#hero" className="font-display text-lg font-extrabold tracking-tight text-white">
          Aviation Wallet <span className="text-sky">OS</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          <li>
            <Link to={homePath}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              {homeLabel}
            </Link>
          </li>
          <li>
            <Link to="/inquiry"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
            >
              문의
            </Link>
          </li>
          <li>
          </li>
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          {!isLoading && isAuthenticated ? (
            <>
              <Link to="/account"
                className="inline-flex items-center gap-1.5 rounded-control border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{account?.name ?? '내 계정'}</span>
              </Link>
              <button type="button"
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
            <Link to="/login"
              className="rounded-control border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              로그인
            </Link>
          )}
        </div>

        <button type="button"
          className="flex h-11 w-11 items-center justify-center rounded-control text-white md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-6">
            <span className={`absolute left-0 top-0 h-0.5 w-6 bg-panel transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`}
            />
            <span className={`absolute left-0 top-[7px] h-0.5 w-6 bg-panel transition-opacity ${open ? 'opacity-0' : ''}`} />
            <span className={`absolute left-0 top-[14px] h-0.5 w-6 bg-panel transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
            />
          </span>
        </button>
      </nav>

      {open && (
        <ul className="flex flex-col gap-1 border-t border-white/10 px-6 py-4 md:hidden">
          {!isLoading && isAuthenticated ? (
            <>
              <li>
                <Link to="/account"
                  onClick={() => setOpen(false)}
                  className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  <span>{account?.name ?? '내 계정'}</span>님 · 계정정보
                </Link>
              </li>
              <li>
                <button type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="block w-full rounded-control px-2 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                로그인
              </Link>
            </li>
          )}
          <li>
            <Link to={homePath}
              onClick={() => setOpen(false)}
              className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              {isOrg ? '관리자 · DASHBOARD' : '개인 사용자 · AWOS'}
            </Link>
          </li>
          <li>
            <Link to="/inquiry"
              onClick={() => setOpen(false)}
              className="block rounded-control px-2 py-3 text-sm font-medium text-slate-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
            >
              문의하기
            </Link>
          </li>
          <li>
          </li>
          <li className="pt-2">
            <a href="#contact"
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
