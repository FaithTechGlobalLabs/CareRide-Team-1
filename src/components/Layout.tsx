import { AlertTriangle, CalendarPlus, Clock, RefreshCw } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useCurrentDriver, useCurrentOrg } from '../hooks/useCurrent'
import { useData } from '../hooks/useData'
import { HOME_FOR } from '../logic/homeFor'
import { dataService, isDemoBackend } from '../services'
import { resetDemoData } from '../services/mockService'
import type { UserRole } from '../types'
import { AccountMenu } from './AccountMenu'
import { ConfirmButton } from './ConfirmButton'
import { IncomingRequests } from './IncomingRequests'
import { Logo } from './Logo'
import { RideAcceptedNotice } from './RideAcceptedNotice'
import { RideCancelledNotice } from './RideCancelledNotice'
import { dangerButton, primaryButton, ROLE_TONE, secondaryButton, type Tone } from './ui'

type NavLinkItem = { to: string; label: string }

const ACTIVE_NAV: Record<Tone, { soft: string; solid: string }> = {
  brand: { soft: 'bg-brand-50 text-brand-700', solid: 'bg-brand-600 text-white' },
  ink: { soft: 'bg-slate-100 text-ink', solid: 'bg-ink text-white' },
  coral: { soft: 'bg-coral-50 text-coral-700', solid: 'bg-coral-700 text-white' },
  teal: { soft: 'bg-teal-50 text-teal-700', solid: 'bg-teal-700 text-white' },
  amber: { soft: 'bg-sun-100 text-amber-900', solid: 'bg-sun-400 text-ink' },
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

// Main links for whoever is signed in.
function useNavLinks(role: UserRole | undefined): NavItem[] {
  const driver = useCurrentDriver()
  const offers = useData(
    () => (role === 'DRIVER' && driver?.status === 'APPROVED' ? dataService.listMyOffers(driver.id) : Promise.resolve([])),
    driver?.id,
  )

  switch (role) {
    case 'PARTNER':
      return [
        { to: '/partner', label: 'Rides' },
        { to: '/partner/destinations', label: 'Destinations' },
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
        active ? 'bg-white text-teal-700' : 'bg-teal-700 text-white'
      }`}
    >
      {count}
      <span className="sr-only"> new {count === 1 ? 'request' : 'requests'}</span>
    </span>
  )
}

// The signed-in app: header with navigation and account menu.
export function Layout() {
  const { currentUser, refresh, loadError } = useApp()
  const org = useCurrentOrg()
  const driver = useCurrentDriver()
  const { pathname } = useLocation()
  const role = currentUser?.role
  const links = useNavLinks(role)

  const activeNav = ACTIVE_NAV[role ? ROLE_TONE[role] : 'brand']

  const pending = (role === 'DRIVER' ? driver?.status : org?.status) === 'PENDING'
  // Booking is what partners come for, so it's one tap away on every page.
  // The dashboard already has its own button, so the floating one would cover the fare tile on a phone.
  const showRequest = role === 'PARTNER' && pathname !== '/partner/request'
  const showFloatingRequest = showRequest && pathname !== '/partner'

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white pt-[var(--safe-top)]">
        <div className="h-1 bg-brand-600" aria-hidden />
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
        <div className="no-print border-b border-amber-200 bg-sun-50">
          <p className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 text-sm font-medium text-amber-900 sm:px-6">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            Your account is waiting for approval from the CareRide team.
            {role !== 'DRIVER' && ' You can set things up in the meantime.'}
          </p>
        </div>
      )}

      <main className={`mx-auto max-w-5xl px-4 py-8 sm:px-6 ${showFloatingRequest ? 'pb-24 sm:pb-8' : ''}`}>
        {/* In the page, so a notice never covers the ride slip or the fare tile. */}
        <div className="no-print mb-6 flex flex-col gap-3 empty:mb-0 empty:hidden">
          <RideCancelledNotice />
          <IncomingRequests />
          <RideAcceptedNotice />
        </div>
        {loadError && (
          <div role="alert" className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>Some information didn't load.</strong> {loadError}
              </span>
            </p>
            <button type="button" className={`${secondaryButton} min-h-10 shrink-0 px-4 text-sm`} onClick={refresh}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Try again
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {/* On phones, booking stays in thumb reach. The dashboard already shows this button in the page. */}
      {showFloatingRequest && (
        <Link
          to="/partner/request"
          className={`${primaryButton} native-bottom-chrome no-print fixed bottom-[calc(1rem+var(--safe-bottom))] left-1/2 z-30 -translate-x-1/2 shadow-xl sm:hidden`}
        >
          <CalendarPlus className="h-5 w-5" aria-hidden />
          Request a ride
        </Link>
      )}

      <footer className="no-print mx-auto max-w-5xl px-4 pb-10 text-sm text-slate-500 sm:px-6">
        {isDemoBackend ? 'Demo data only. ' : ''}CareRide is an independent platform.{' '}
        {/* Used before every demo, so it stays visible, but asks first: it wipes everything. Local mock only. */}
        {isDemoBackend && (
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
        )}
      </footer>
    </div>
  )
}
