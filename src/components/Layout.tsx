import { CalendarPlus, Clock } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useCurrentDriver, useCurrentOrg } from '../hooks/useCurrent'
import { useData } from '../hooks/useData'
import { HOME_FOR } from '../logic/homeFor'
import { dataService } from '../services'
import { resetDemoData } from '../services/mockService'
import type { UserRole } from '../types'
import { AccountMenu } from './AccountMenu'
import { ConfirmButton } from './ConfirmButton'
import { IncomingRequests } from './IncomingRequests'
import { Logo } from './Logo'
import { RideAcceptedNotice } from './RideAcceptedNotice'
import { RideCancelledNotice } from './RideCancelledNotice'
import { dangerButton, primaryButton, ROLE_TONE, type Tone } from './ui'

type NavLinkItem = { to: string; label: string }

const ACTIVE_NAV: Record<Tone, { soft: string; solid: string }> = {
  brand: { soft: 'bg-brand-50 text-brand-700', solid: 'bg-brand-600 text-white' },
  violet: { soft: 'bg-violet-50 text-violet-700', solid: 'bg-violet-600 text-white' },
  coral: { soft: 'bg-coral-50 text-coral-700', solid: 'bg-coral-600 text-white' },
  teal: { soft: 'bg-teal-50 text-teal-700', solid: 'bg-teal-600 text-white' },
  amber: { soft: 'bg-amber-50 text-amber-800', solid: 'bg-amber-600 text-white' },
}

type NavItem = NavLinkItem & { badge?: number }

const PROVIDER_NAV: NavItem[] = [
  { to: '/org/drivers', label: 'Our drivers' },
  { to: '/org/bookings', label: 'Bookings' },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Approvals' },
  { to: '/admin/accounts', label: 'Accounts' },
]

// Main links for whoever is signed in. Partners only see Bookings once they have drivers of their own.
function useNavLinks(role: UserRole | undefined): NavItem[] {
  const { currentUser } = useApp()
  const driver = useCurrentDriver()
  const orgId = role === 'PARTNER' ? currentUser?.orgId : undefined
  const ownDrivers = useData(() => (orgId ? dataService.listDrivers(orgId) : Promise.resolve([])), orgId) ?? []
  const offers = useData(
    () => (role === 'DRIVER' && driver?.status === 'APPROVED' ? dataService.listMyOffers(driver.id) : Promise.resolve([])),
    driver?.id,
  )

  switch (role) {
    case 'PARTNER':
      return [
        { to: '/partner', label: 'Rides' },
        { to: '/partner/destinations', label: 'Destinations' },
        { to: '/partner/drivers', label: 'Our drivers' },
        ...(ownDrivers.length > 0 ? [{ to: '/partner/bookings', label: 'Bookings' }] : []),
      ]
    case 'DRIVER':
      return [
        { to: '/driver', label: 'Rides', badge: offers?.length },
        { to: '/driver/settings', label: 'Settings' },
      ]
    case 'ORG_ADMIN':
      return PROVIDER_NAV
    case 'PLATFORM_ADMIN':
      return ADMIN_NAV
    default:
      return []
  }
}

function Badge({ count, active }: { count?: number; active: boolean }) {
  if (!count) return null
  return (
    <span
      className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
        active ? 'bg-white text-teal-700' : 'bg-teal-600 text-white'
      }`}
    >
      {count}
      <span className="sr-only"> new {count === 1 ? 'request' : 'requests'}</span>
    </span>
  )
}

// The signed-in app: header with navigation and account menu.
export function Layout() {
  const { currentUser, refresh } = useApp()
  const org = useCurrentOrg()
  const driver = useCurrentDriver()
  const { pathname } = useLocation()
  const role = currentUser?.role
  const links = useNavLinks(role)

  const activeNav = ACTIVE_NAV[role ? ROLE_TONE[role] : 'brand']

  const pending = (role === 'DRIVER' ? driver?.status : org?.status) === 'PENDING'
  // Booking is what partners come for, so it's one tap away on every page
  const showRequest = role === 'PARTNER' && pathname !== '/partner/request'

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="h-1 bg-spectrum" aria-hidden />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo size="sm" to={role ? HOME_FOR[role] : '/'} />
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
                {({ isActive }) => (
                  <>
                    {l.label}
                    <Badge count={l.badge} active={isActive} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {/* The shared button class sets inline-flex, so a wrapper hides it on phones (they get the bottom button) */}
            {showRequest && (
              <span className="hidden sm:block">
                <Link to="/partner/request" className={`${primaryButton} min-h-10 px-4 text-sm`}>
                  <CalendarPlus className="h-4 w-4" aria-hidden />
                  Request a ride
                </Link>
              </span>
            )}
            <AccountMenu />
          </div>
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
              {({ isActive }) => (
                <>
                  {l.label}
                  <Badge count={l.badge} active={isActive} />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      {pending && (
        <div className="no-print border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <p className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 text-sm font-medium text-amber-900 sm:px-6">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            Your account is waiting for approval from the CareRide team.
            {role !== 'DRIVER' && ' You can set things up in the meantime.'}
          </p>
        </div>
      )}

      <main className={`mx-auto max-w-5xl px-4 py-8 sm:px-6 ${showRequest ? 'pb-24 sm:pb-8' : ''}`}>
        <Outlet />
      </main>

      {/* On phones, booking stays in thumb reach at the bottom of every partner page */}
      {showRequest && (
        <Link
          to="/partner/request"
          className={`${primaryButton} no-print fixed bottom-4 left-1/2 z-30 -translate-x-1/2 shadow-xl sm:hidden`}
        >
          <CalendarPlus className="h-5 w-5" aria-hidden />
          Request a ride
        </Link>
      )}

      {/* Pop-ups: cancelled rides for drivers, accepted rides for the partner who booked, requests for providers */}
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
