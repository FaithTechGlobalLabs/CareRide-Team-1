import { Link, NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { resetDemoData } from '../services/mockService'
import type { UserRole } from '../types'
import { RoleSwitcher } from './RoleSwitcher'

const navFor: Record<UserRole, { to: string; label: string }[]> = {
  PLATFORM_ADMIN: [{ to: '/admin', label: 'Approvals' }],
  ORG_ADMIN: [
    { to: '/org/facilities', label: 'Facilities' },
    { to: '/org/destinations', label: 'Destinations' },
  ],
  STAFF: [
    { to: '/staff', label: 'Dashboard' },
    { to: '/staff/request', label: 'Request a ride' },
  ],
  DRIVER: [
    { to: '/driver', label: 'Requests' },
    { to: '/driver/my-rides', label: 'My rides' },
  ],
}

export function Layout() {
  const { currentUser, refresh } = useApp()
  const links = currentUser ? navFor[currentUser.role] : []

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-xl font-bold text-blue-800">
            CareRide
          </Link>
          <RoleSwitcher />
        </div>
        <nav className="mx-auto flex max-w-4xl gap-4 overflow-x-auto px-4 pb-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `whitespace-nowrap font-semibold ${isActive ? 'text-blue-800 underline' : 'text-slate-600'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="no-print mx-auto max-w-4xl px-4 pb-8 text-sm text-slate-500">
        Demo data only. CareRide is an independent platform, not affiliated with any organization shown.{' '}
        <button
          type="button"
          className="underline"
          onClick={() => {
            resetDemoData()
            refresh()
          }}
        >
          Reset demo data
        </button>
      </footer>
    </div>
  )
}
