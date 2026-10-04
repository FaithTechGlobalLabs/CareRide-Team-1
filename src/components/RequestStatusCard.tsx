import { BellOff, BellRing, MoonStar, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ALL_DAY,
  describeRequestHours,
  formatNotice,
  formatTime,
  isWithinRequestHours,
  nextRequestStart,
} from '../logic/requestHours'
import type { Driver } from '../types'

interface Props {
  driver: Driver
  onPause: (available: boolean) => void
  showSettingsLink?: boolean
}

// "today at 9 AM", "tomorrow at 9 AM", "Monday at 9 AM"
function describeStart(start: Date, now: Date): string {
  const days = Math.round(
    (new Date(start).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000,
  )
  const day = days === 0 ? 'today' : days === 1 ? 'tomorrow' : start.toLocaleDateString(undefined, { weekday: 'long' })
  return `${day} at ${formatTime(start.toTimeString().slice(0, 5))}`
}

// Whether the driver is getting requests right now, with a big switch to pause them.
export function RequestStatusCard({ driver, onPause, showSettingsLink = false }: Props) {
  const now = new Date()
  const window = driver.requestHours[now.getDay()]
  const inHours = isWithinRequestHours(driver.requestHours, now)
  const next = nextRequestStart(driver.requestHours, now)

  const state = !driver.available ? 'paused' : inHours ? 'live' : 'off'
  const look = {
    live: {
      box: 'bg-fresh-gradient text-white shadow-lg shadow-teal-600/20',
      icon: <BellRing className="h-6 w-6" aria-hidden />,
      title: 'Taking requests now',
      detail: window && window.to === ALL_DAY.to && window.from === ALL_DAY.from ? 'All day today.' : window ? `Until ${formatTime(window.to)} today.` : '',
      heading: 'text-white',
      sub: 'text-teal-50',
    },
    off: {
      box: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20',
      icon: <MoonStar className="h-6 w-6" aria-hidden />,
      title: 'Outside your request hours',
      detail: next ? `We'll start sending requests ${describeStart(next, now)}.` : 'Add some request hours to start getting requests.',
      heading: 'text-white',
      sub: 'text-indigo-100',
    },
    paused: {
      box: 'border border-slate-200 bg-slate-100 text-ink',
      icon: <BellOff className="h-6 w-6" aria-hidden />,
      title: 'Requests paused',
      detail: "You won't get any requests until you turn them back on.",
      heading: 'text-ink',
      sub: 'text-slate-600',
    },
  }[state]

  return (
    <section className={`overflow-hidden rounded-2xl p-5 sm:p-6 ${look.box}`} aria-live="polite">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              state === 'paused' ? 'bg-white text-slate-500' : 'bg-white/20'
            }`}
          >
            {look.icon}
            {state === 'live' && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
              </span>
            )}
          </span>
          <div>
            <h2 className={`text-xl font-extrabold ${look.heading}`}>{look.title}</h2>
            <p className={look.sub}>{look.detail}</p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={driver.available}
          onClick={() => onPause(!driver.available)}
          className={`inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 font-semibold transition focus-visible:outline-none focus-visible:ring-4 ${
            state === 'paused'
              ? 'bg-white text-ink shadow-sm hover:bg-slate-50 focus-visible:ring-teal-100'
              : 'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/40'
          }`}
        >
          {driver.available ? 'Requests on' : 'Requests off'}
          <span
            className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
              driver.available ? 'justify-end bg-white' : 'justify-start bg-slate-300'
            }`}
            aria-hidden
          >
            <span className={`h-6 w-6 rounded-full shadow ${driver.available ? 'bg-teal-500' : 'bg-white'}`} />
          </span>
        </button>
      </div>

      <div
        className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-sm ${
          state === 'paused' ? 'border-slate-200 text-slate-600' : 'border-white/20 text-white/90'
        }`}
      >
        <span>
          <span className="font-semibold">Hours:</span> {describeRequestHours(driver.requestHours)}
        </span>
        <span>
          <span className="font-semibold">Notice:</span> {formatNotice(driver.minNoticeMinutes)}
        </span>
        {showSettingsLink && (
          <Link
            to="/driver/settings"
            className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 ${
              state === 'paused' ? 'text-teal-700 focus-visible:ring-teal-100' : 'text-white focus-visible:ring-white/40'
            }`}
          >
            <Settings2 className="h-4 w-4" aria-hidden /> Change settings
          </Link>
        )}
      </div>
    </section>
  )
}
