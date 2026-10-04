import { BellRing, MoonStar, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ALL_DAY,
  describeRequestHours,
  formatTime,
  isWithinRequestHours,
  nextRequestStart,
} from '../logic/requestHours'
import type { Driver } from '../types'

interface Props {
  driver: Driver
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

// Whether the driver is getting requests right now. There's no pause switch: drivers just decline what doesn't suit them.
export function RequestStatusCard({ driver, showSettingsLink = false }: Props) {
  const now = new Date()
  const window = driver.requestHours[now.getDay()]
  const inHours = isWithinRequestHours(driver.requestHours, now)
  const next = nextRequestStart(driver.requestHours, now)

  const state = inHours ? 'live' : 'off'
  const look = {
    live: {
      box: 'bg-teal-700 text-white',
      icon: <BellRing className="h-6 w-6" aria-hidden />,
      title: 'Taking requests now',
      detail: window && window.to === ALL_DAY.to && window.from === ALL_DAY.from ? 'All day today.' : window ? `Until ${formatTime(window.to)} today.` : '',
      heading: 'text-white',
      sub: 'text-teal-50',
    },
    off: {
      box: 'bg-ink text-white',
      icon: <MoonStar className="h-6 w-6" aria-hidden />,
      title: 'Outside your request hours',
      detail: next ? `We'll start sending requests ${describeStart(next, now)}.` : 'Add some request hours to start getting requests.',
      heading: 'text-white',
      sub: 'text-brand-100',
    },
  }[state]

  return (
    <section className={`overflow-hidden rounded-xl p-5 sm:p-6 ${look.box}`} aria-live="polite">
      <div className="flex items-start gap-4">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
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

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/20 pt-4 text-sm text-white/90">
        <span>
          <span className="font-semibold">Hours:</span> {describeRequestHours(driver.requestHours)}
        </span>
        {showSettingsLink && (
          <Link
            to="/driver/settings"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-white underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white"
          >
            <Settings2 className="h-4 w-4" aria-hidden /> Change settings
          </Link>
        )}
      </div>
    </section>
  )
}
