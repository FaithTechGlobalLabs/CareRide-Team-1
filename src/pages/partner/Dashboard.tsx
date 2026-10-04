import { CalendarPlus, ClipboardList, MapPin, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ImpactCounter } from '../../components/ImpactCounter'
import { RideBoard } from '../../components/RideBoard'
import { tones, type Tone } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

interface Action {
  to: string
  title: string
  detail: string
  icon: LucideIcon
  tone: Tone
}

export function Dashboard() {
  const { currentUser } = useApp()
  const houseId = currentUser?.houseId ?? ''
  const orgId = currentUser?.orgId
  const rides = useData(() => dataService.listRidesForHouse(houseId), houseId) ?? []
  const ownDrivers = useData(() => (orgId ? dataService.listDrivers(orgId) : Promise.resolve([])), orgId) ?? []

  // Everything a partner can do, in one place
  const actions: Action[] = [
    { to: '/partner/destinations', title: 'Destinations', detail: 'Places your clients often go', icon: MapPin, tone: 'teal' },
    { to: '/partner/drivers', title: 'Our drivers', detail: 'Volunteers from your organization', icon: Users, tone: 'violet' },
    ...(ownDrivers.length > 0
      ? [{ to: '/partner/bookings', title: 'Bookings', detail: 'Rides your drivers have taken', icon: ClipboardList, tone: 'amber' as Tone }]
      : []),
  ]

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{currentUser?.name}</h1>

      <nav aria-label="What you can do" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/partner/request"
          className="group flex items-center gap-4 rounded-2xl bg-brand-gradient p-5 text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 sm:col-span-2 lg:col-span-1"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20" aria-hidden>
            <CalendarPlus className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-extrabold">Request a ride</span>
            <span className="block text-sm text-white/85">About a minute</span>
          </span>
        </Link>
        {actions.map(({ to, title, detail, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 ${tones[tone].border}`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone].tile}`} aria-hidden>
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-bold text-ink">{title}</span>
              <span className="block text-sm text-slate-500">{detail}</span>
            </span>
          </Link>
        ))}
      </nav>

      <ImpactCounter />

      <RideBoard rides={rides} />
    </div>
  )
}
