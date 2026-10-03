import { Clock } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useCurrentDriver, useCurrentOrg } from '../hooks/useCurrent'
import { resetDemoData } from '../services/mockService'
import type { UserRole } from '../types'
import { AccountMenu } from './AccountMenu'
import { ConfirmButton } from './ConfirmButton'
import { IncomingRequests } from './IncomingRequests'
import { Logo } from './Logo'
import { RideAcceptedNotice } from './RideAcceptedNotice'
import { RideCancelledNotice } from './RideCancelledNotice'
import { dangerButton, ROLE_TONE, type Tone } from './ui'

type NavLinkItem = { to: string; label: string }

const ACTIVE_NAV: Record<Tone, { soft: string; solid: string }> = {
  brand: { soft: 'bg-brand-50 text-brand-700', solid: 'bg-brand-600 text-white' },
  violet: { soft: 'bg-violet-50 text-violet-700', solid: 'bg-violet-600 text-white' },
  coral: { soft: 'bg-coral-50 text-coral-700', solid: 'bg-coral-600 text-white' },
  teal: { soft: 'bg-teal-50 text-teal-700', solid: 'bg-teal-600 text-white' },
  amber: { soft: 'bg-amber-50 text-amber-800', solid: 'bg-amber-600 text-white' },
}

const partnerOrgNav: NavLinkItem[] = [
  { to: '/org/rides', label: 'Rides' },
  { to: '/org/houses', label: 'Houses' },
  { to: '/org/destinations', label: 'Destinations' },
  { to: '/org/drivers', label: 'Our drivers' },
  { to: '/org/bookings', label: 'Bookings' },
]

const providerNav: NavLinkItem[] = [
  { to: '/org/drivers', label: 'Our drivers' },
  { to: '/org/bookings', label: 'Bookings' },
]

const navFor: Record<Exclude<UserRole, 'ORG_ADMIN'>, NavLinkItem[]> = {
  PLATFORM_ADMIN: [
    { to: '/admin', label: 'Approvals' },
    { to: '/admin/accounts', label: 'Accounts' },
  ],
  HOUSE: [
    { to: '/house', label: 'Rides' },
    { to: '/house/request', label: 'Request a ride' },
  ],
  DRIVER: [
    { to: '/driver', label: 'Requests' },
    { to: '/driver/my-rides', label: 'My rides' },
    { to: '/driver/settings', label: 'Settings' },
  ],
}

// The signed-in app: header with navigation and account menu.
export function Layout() {
  const { currentUser, refresh } = useApp()
  const org = useCurrentOrg()
  const driver = useCurrentDriver()
  const role = currentUser?.role
  const links =
    role === 'ORG_ADMIN' ? (org?.type === 'TRANSPORT_PROVIDER' ? providerNav : partnerOrgNav) : role ? navFor[role] : []

  const activeNav = ACTIVE_NAV[role ? ROLE_TONE[role] : 'brand']

  const pending =
    (role === 'ORG_ADMIN' && org?.status === 'PENDING') || (role === 'DRIVER' && driver?.status === 'PENDING')

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="h-1 bg-spectrum" aria-hidden />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo size="sm" to="/" />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? activeNav.soft : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <AccountMenu />
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 pb-3 sm:px-6 lg:hidden" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? activeNav.solid : 'bg-slate-100 text-slate-700'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {pending && (
        <div className="no-print border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <p className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 text-sm font-medium text-amber-900 sm:px-6">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            Your account is waiting for approval from the CareRide team.
            {role === 'ORG_ADMIN' && ' You can set things up in the meantime.'}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {/* Pop-ups: new and cancelled requests for drivers, accepted rides for whoever booked them */}
      <div className="no-print fixed inset-x-4 bottom-4 z-40 flex max-h-[80vh] flex-col gap-3 overflow-y-auto sm:left-auto sm:right-6 sm:w-96">
        <RideCancelledNotice />
        <IncomingRequests />
        <RideAcceptedNotice />
      </div>

      <footer className="no-print mx-auto max-w-5xl px-4 pb-10 text-sm text-slate-500 sm:px-6">
        Demo data only. CareRide is an independent platform.{' '}
        {/* Used before every demo, so it stays visible, but asks first: it wipes everything. */}
        <ConfirmButton
          className="inline-flex min-h-12 items-center font-semibold underline-offset-2 hover:underline"
          title="Reset all demo data?"
          body="Every ride, account and change goes back to the starting demo."
          confirmLabel="Yes, reset everything"
          confirmClassName={dangerButton}
          onConfirm={() => {
            resetDemoData()
            refresh()
          }}
        >
          Reset demo data
        </ConfirmButton>
      </footer>
    </div>
  )
}
