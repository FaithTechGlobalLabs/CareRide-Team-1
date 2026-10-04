import { AlertTriangle, CalendarPlus, CarFront, History, RotateCcw, Search } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { acceptedMessage } from '../../logic/acceptedMessage'
import { formatTime } from '../../logic/formatTime'
import { ridePath } from '../../logic/homeFor'
import { actionReason, dayLabel } from '../../logic/rideInsights'
import { passengersLabel, riderLabel } from '../../logic/rideText'
import type { Ride } from '../../types'
import { STATUS_ICON, StatusBadge } from '../StatusBadge'
import { card, input, primaryButton, secondaryButton } from '../ui'

export interface DriverInfo {
  name?: string
  vehicle: string
}

interface Props {
  attention: Ride[]
  upcoming: Ride[]
  past: Ride[] // most recent first
  driverOf: (ride: Ride) => DriverInfo | undefined
  now: number
  tab?: RideTab // the parent can pick a tab, e.g. from a stat tile
  onTab: (tab: RideTab) => void
}

export type RideTab = 'attention' | 'upcoming' | 'past'
type Tab = RideTab

const PAST_PAGE = 8

// A partner's rides in three tabs. Opens on whatever needs a look first.
export function RideList({ attention, upcoming, past, driverOf, now, tab: picked, onTab: setPicked }: Props) {
  const [query, setQuery] = useState('')
  const [pastShown, setPastShown] = useState(PAST_PAGE)
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})

  const tabs: { id: Tab; label: string; count: number }[] = [
    ...(attention.length > 0 ? [{ id: 'attention' as Tab, label: 'Needs attention', count: attention.length }] : []),
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'past', label: 'Past', count: past.length },
  ]
  // Fall back if the picked tab disappears, e.g. the last ride needing attention got a driver
  const tab = picked && tabs.some((t) => t.id === picked) ? picked : tabs[0].id

  // Arrow keys move between tabs, like any tab list
  function onTabKey(e: KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length].id
    setPicked(next)
    tabRefs.current[next]?.focus()
  }

  const q = query.trim().toLowerCase()
  const pastMatches = q
    ? past.filter((r) => [r.destinationName, r.destinationAddress, riderLabel(r) ?? ''].some((s) => s.toLowerCase().includes(q)))
    : past

  return (
    <section id="rides" aria-label="Your rides" className={`${card} scroll-mt-28 p-0`}>
      <div className="border-b border-slate-100 px-3 pt-2 sm:px-4">
        <div role="tablist" aria-label="Rides" className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((t, i) => {
            const on = tab === t.id
            const red = t.id === 'attention'
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setPicked(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  on ? (red ? 'border-red-600 text-red-700' : 'border-brand-600 text-ink') : 'border-transparent text-slate-500 hover:text-ink'
                }`}
              >
                {red && <AlertTriangle className="h-4 w-4" aria-hidden />}
                {t.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                    red ? 'bg-red-600 text-white' : on ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="p-3 sm:p-4">
        {tab === 'attention' && (
          <ul className="space-y-1">
            {attention.map((r) => (
              <RideRow key={r.id} ride={r} driver={driverOf(r)} now={now} alert={actionReason(r, new Date(now))} />
            ))}
          </ul>
        )}

        {tab === 'upcoming' &&
          (upcoming.length === 0 ? (
            <Empty
              icon={<CalendarPlus className="h-6 w-6" />}
              title="No upcoming rides"
              text="Book a ride and it shows up here, grouped by day."
              action={
                <Link to="/partner/request" className={primaryButton}>
                  Request a ride
                </Link>
              }
            />
          ) : (
            <DayGroups rides={upcoming} now={now} render={(r) => <RideRow key={r.id} ride={r} driver={driverOf(r)} now={now} />} />
          ))}

        {tab === 'past' &&
          (past.length === 0 ? (
            <Empty icon={<History className="h-6 w-6" />} title="No past rides yet" text="Finished and cancelled rides are kept here, newest first." />
          ) : (
            <>
              <div className="relative mx-2 mb-3 mt-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  className={`${input} pl-11`}
                  placeholder="Search by place or rider"
                  aria-label="Search past rides"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPastShown(PAST_PAGE)
                  }}
                />
              </div>
              {pastMatches.length === 0 ? (
                <p className="px-3 py-6 text-center text-slate-500">No past rides match “{query.trim()}”.</p>
              ) : (
                <ul className="space-y-1">
                  {pastMatches.slice(0, pastShown).map((r) => (
                    <RideRow key={r.id} ride={r} driver={driverOf(r)} now={now} past />
                  ))}
                </ul>
              )}
              {pastMatches.length > pastShown && (
                <div className="mt-3 flex justify-center">
                  <button type="button" className={secondaryButton} onClick={() => setPastShown((n) => n + PAST_PAGE)}>
                    Show {Math.min(PAST_PAGE, pastMatches.length - pastShown)} more
                  </button>
                </div>
              )}
            </>
          ))}
      </div>
    </section>
  )
}

function DayGroups({ rides, now, render }: { rides: Ride[]; now: number; render: (r: Ride) => ReactNode }) {
  const groups: { label: string; rides: Ride[] }[] = []
  for (const r of rides) {
    const label = r.type === 'ON_DEMAND' ? 'As soon as possible' : dayLabel(new Date(r.pickupTime).getTime(), now)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.rides.push(r)
    else groups.push({ label, rides: [r] })
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="px-3 pb-1 font-sans text-sm font-bold text-slate-400">{g.label}</h3>
          <ul className="space-y-1">{g.rides.map(render)}</ul>
        </div>
      ))}
    </div>
  )
}

interface RowProps {
  ride: Ride
  driver?: DriverInfo
  now: number
  alert?: string
  past?: boolean
}

// One ride as a row. The whole row opens the ride; "Book again" sits above that link.
function RideRow({ ride, driver, now, alert, past }: RowProps) {
  const pickupMs = new Date(ride.pickupTime).getTime()
  const needs = [riderLabel(ride) ?? passengersLabel(ride.passengers), ride.needsWheelchair && 'Wheelchair', ride.needsAssistance && 'Needs help']
    .filter(Boolean)
    .join(' · ')
  const showDriver = driver && (ride.status === 'ACCEPTED' || ride.status === 'PICKED_UP')

  return (
    <li
      className={`group relative flex gap-3 rounded-xl p-3 transition hover:bg-slate-50 sm:gap-4 ${alert ? 'bg-red-50/60 hover:bg-red-50' : ''}`}
    >
      <div className="w-[4.5rem] shrink-0 pt-0.5 text-center sm:w-20">
        {ride.type === 'ON_DEMAND' && !past ? (
          <span className="text-sm font-bold text-ink">Now</span>
        ) : (
          <>
            <span className="block whitespace-nowrap font-display text-sm font-extrabold tabular-nums text-ink sm:text-base">{formatTime(ride.pickupTime)}</span>
            {past && <span className="block text-xs text-slate-500">{dayLabel(pickupMs, now)}</span>}
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {alert && (
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {alert}
          </p>
        )}
        <Link
          to={ridePath(ride.id)}
          className="block break-words font-semibold text-ink after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-brand-500 focus-visible:after:ring-offset-2"
        >
          {ride.returnOfRideId && <span className="text-slate-500">Return · </span>}
          {ride.destinationName}
        </Link>
        <p className="text-sm text-slate-500">{needs}</p>
        {showDriver && (
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-brand-800">
            <CarFront className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {acceptedMessage(ride, driver.name)} <span className="text-slate-500">{driver.vehicle}</span>
            </span>
          </p>
        )}
        {/* Phones: status and rebooking sit under the details, so the text gets the full width */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
          <StatusDot ride={ride} />
          {past && !ride.returnOfRideId && <BookAgain rideId={ride.id} />}
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <StatusBadge status={ride.status} label={ride.expired ? 'No driver found' : undefined} />
        {past && !ride.returnOfRideId && <BookAgain rideId={ride.id} />}
      </div>
    </li>
  )
}

// Sits above the row's own link, so it can be tapped on its own
function BookAgain({ rideId }: { rideId: string }) {
  return (
    <Link
      to={`/partner/request?again=${rideId}`}
      className="relative z-10 -mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:mx-0"
    >
      <RotateCcw className="h-4 w-4" aria-hidden />
      Book again
    </Link>
  )
}

// On phones the full badge crowds the row, so show a short version: still words and an icon, not colour alone.
const SHORT_STATUS: Record<Ride['status'], { text: string; color: string }> = {
  SEARCHING: { text: 'Finding', color: 'text-brand-700' },
  OFFERED: { text: 'Waiting', color: 'text-amber-800' },
  ACCEPTED: { text: 'Confirmed', color: 'text-emerald-700' },
  NEEDS_ATTENTION: { text: 'Attention', color: 'text-red-700' },
  PICKED_UP: { text: 'Riding', color: 'text-cyan-700' },
  COMPLETED: { text: 'Done', color: 'text-slate-600' },
  NO_SHOW: { text: 'No show', color: 'text-coral-700' },
  CANCELLED: { text: 'Cancelled', color: 'text-slate-500' },
}

function StatusDot({ ride }: { ride: Ride }) {
  const s = SHORT_STATUS[ride.status]
  const Icon = STATUS_ICON[ride.status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.color}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      {ride.expired ? 'No driver' : s.text}
    </span>
  )
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500" aria-hidden>
        {icon}
      </span>
      <p className="font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
