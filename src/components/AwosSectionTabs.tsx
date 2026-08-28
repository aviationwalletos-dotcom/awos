import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, NotebookPen, Radar as RadarIcon } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'

interface SectionTabItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

const INDIVIDUAL_TABS: SectionTabItem[] = [
  { to: '/logbook', label: 'AWOS', icon: NotebookPen },
  { to: '/fleet', label: 'Flight Radar', icon: RadarIcon },
]

const ORGANIZATION_TABS: SectionTabItem[] = [
  { to: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { to: '/fleet', label: 'Flight Radar', icon: RadarIcon },
]

/**
 * AWOS ↔ Flight Radar(기관 계정은 DASHBOARD ↔ Flight Radar) 전환용 상단 서브탭.
 * 기관(organization) 계정은 AWOS에 접근할 수 없어 AWOS 탭이 노출되지 않습니다.
 */
export function AwosSectionTabs() {
  const location = useLocation()
  const { userType } = useAuth()

  const tabs = userType === 'organization' ? ORGANIZATION_TABS : INDIVIDUAL_TABS

  return (
    <nav data-mbaas-oid="3ivooej" aria-label="AWOS / Flight Radar 전환" className="sticky top-[65px] z-40 border-b border-white/10 bg-navy/95 backdrop-blur">
      <div data-mbaas-oid="x6x8vfj" className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          return (
            <Link
              data-mbaas-oid="8vd2b36" key={to} to={to}
              aria-current={isActive ? 'page' : undefined}
              data-state={isActive ? 'active' : 'idle'}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition-colors
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                ${isActive ? 'border-sky bg-sky/10 text-sky' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white'}`}
            >
              <Icon className="h-4 w-4" aria-hidden={true} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
