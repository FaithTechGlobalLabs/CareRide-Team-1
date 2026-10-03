import {
  ArrowRight,
  Bus,
  CalendarPlus,
  Car,
  ClipboardCheck,
  Home,
  Inbox,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../hooks/useApp'
import { useCurrentOrg } from '../../hooks/useCurrent'
import { HOME_FOR, ROLE_LABELS } from '../../logic/homeFor'
import type { User } from '../../types'
import { ROLE_TONE, tones } from '../ui'

interface Shortcut {
  to: string
  label: string
  text: string
  icon: ReactNode
}

interface Welcome {
  intro: string
  shortcuts: Shortcut[] // the first one is the main action
}

const icon = 'h-5 w-5'

// What each kind of account usually comes to do, so the next step is one tap away.
function welcomeFor(user: User, isProvider: boolean): Welcome {
  switch (user.role) {
    case 'HOUSE':
      return {
        intro: 'Need to get a client somewhere? Book a free ride in about a minute.',
        shortcuts: [
          { to: '/house/request', label: 'Request a ride', text: 'Book a free trip for a client', icon: <CalendarPlus className={icon} /> },
          { to: '/house', label: 'Your rides', text: 'Track upcoming and past trips', icon: <ListChecks className={icon} /> },
        ],
      }
    case 'DRIVER':
      return {
        intro: 'Thanks for driving. See who needs a ride, or check the trips you have accepted.',
        shortcuts: [
          { to: '/driver', label: 'Ride requests', text: 'Rides waiting for a driver', icon: <Inbox className={icon} /> },
          { to: '/driver/my-rides', label: 'My rides', text: "Trips you've accepted", icon: <Car className={icon} /> },
          { to: '/driver/settings', label: 'Settings', text: 'Your hours, vehicle, and cities', icon: <Settings className={icon} /> },
        ],
      }
    case 'ORG_ADMIN':
      return isProvider
        ? {
            intro: 'See the rides booked with your vehicles and manage your drivers.',
            shortcuts: [
              { to: '/org/bookings', label: 'Bookings', text: 'Rides booked with your vehicles', icon: <Bus className={icon} /> },
              { to: '/org/drivers', label: 'Our drivers', text: 'Manage your team', icon: <Users className={icon} /> },
            ],
          }
        : {
            intro: 'Book rides for your houses and keep an eye on every trip.',
            shortcuts: [
              { to: '/org/request', label: 'Request a ride', text: 'Book for any of your houses', icon: <CalendarPlus className={icon} /> },
              { to: '/org/rides', label: 'Rides', text: 'Every trip across your houses', icon: <ListChecks className={icon} /> },
              { to: '/org/houses', label: 'Houses', text: 'Add or edit your locations', icon: <Home className={icon} /> },
            ],
          }
    case 'PLATFORM_ADMIN':
      return {
        intro: 'Review the organizations and drivers waiting for approval.',
        shortcuts: [
          { to: '/admin', label: 'Approvals', text: 'Organizations and drivers to review', icon: <ClipboardCheck className={icon} /> },
          { to: '/admin/accounts', label: 'Accounts', text: 'Everyone using CareRide', icon: <Users className={icon} /> },
        ],
      }
  }
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// The hero for someone already signed in: says hello by name and offers their next step.
export function WelcomeBack({ user }: { user: User }) {
  const { signOut } = useApp()
  const org = useCurrentOrg()
  const [hour] = useState(() => new Date().getHours())
  const { intro, shortcuts } = welcomeFor(user, org?.type === 'TRANSPORT_PROVIDER')
  const [main, ...rest] = shortcuts
  const tone = tones[ROLE_TONE[user.role]]

  return (
    <div className="text-center lg:text-left">
      <p className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        You're signed in
        <span className={`rounded-full px-2 py-0.5 text-xs ${tone.tile}`}>{ROLE_LABELS[user.role]}</span>
      </p>

      <p className="animate-fade-up text-lg font-semibold text-slate-500 [animation-delay:60ms]">{greetingFor(hour)},</p>
      <h1 className="animate-fade-up text-5xl font-black leading-[1.05] tracking-tight [animation-delay:100ms] sm:text-6xl">
        Hello, <span className="text-brand-gradient">{user.name}</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl animate-fade-up text-xl leading-relaxed text-slate-600 [animation-delay:160ms] lg:mx-0">{intro}</p>

      <div className="mx-auto mt-8 max-w-xl animate-fade-up space-y-3 text-left [animation-delay:220ms] lg:mx-0">
        <Link
          to={main.to}
          className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 p-4 text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 active:translate-y-0"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden>
            {main.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-extrabold">{main.label}</span>
            <span className="block text-sm text-white/80">{main.text}</span>
          </span>
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
        </Link>

        <div className={`grid gap-3 ${rest.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {rest.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:translate-y-0 ${tone.border}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.tile}`} aria-hidden>
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">{s.label}</span>
                <span className="block text-sm leading-snug text-slate-500">{s.text}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-6 animate-fade-up text-sm text-slate-500 [animation-delay:280ms]">
        Not {user.name}?{' '}
        <button type="button" onClick={signOut} className="font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100">
          Sign out
        </button>{' '}
        or{' '}
        <Link to="/signin" className="font-semibold text-brand-700 hover:underline">
          switch account
        </Link>
        . Everything else is on your{' '}
        <Link to={HOME_FOR[user.role]} className="font-semibold text-brand-700 hover:underline">
          dashboard
        </Link>
        .
      </p>
    </div>
  )
}
