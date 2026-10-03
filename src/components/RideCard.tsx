import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PURPOSE_LABELS, RIDE_TYPE_LABELS } from '../constants'
import type { Ride } from '../types'
import { StatusBadge } from './StatusBadge'
import { card } from './ui'
import { formatDayTime } from '../logic/formatTime'

interface Props {
  ride: Ride
  from?: string // pickup label, e.g. the house name
  to?: string // link to the ride's detail page
  statusLabel?: string // override badge text when the default is for another role
  children?: ReactNode // action buttons
  alert?: string // one-line reason the ride needs action, shown in red
}

// A coloured left edge echoes the status badge, so a list scans at a glance.
const ACCENT: Record<Ride['status'], string> = {
  SEARCHING: 'border-l-sky-400',
  OFFERED: 'border-l-amber-400',
  ACCEPTED: 'border-l-brand-500',
  NEEDS_ATTENTION: 'border-l-red-500',
  PICKED_UP: 'border-l-violet-500',
  COMPLETED: 'border-l-emerald-500',
  NO_SHOW: 'border-l-orange-400',
  CANCELLED: 'border-l-slate-300',
}

export function RideCard({ ride, from, to, statusLabel, children, alert }: Props) {
  const highlight = ride.status === 'NEEDS_ATTENTION' || alert ? 'border-red-300 bg-red-50/40' : ''
  const needs = [
    `${ride.passengers} ${ride.passengers === 1 ? 'person' : 'people'}`,
    ride.needsWheelchair && 'Wheelchair',
    ride.needsAssistance && 'Needs help',
  ].filter(Boolean)

  return (
    <div className={`${card} border-l-4 ${ACCENT[ride.status]} ${highlight}`}>
      {alert && <p className="mb-2 font-bold text-red-800">⚠ {alert}</p>}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {RIDE_TYPE_LABELS[ride.type]}
          {ride.returnOfRideId && ' · Return trip'}
          {ride.clientName && ` · ${ride.clientName}`}
        </span>
        <StatusBadge status={ride.status} label={statusLabel} />
      </div>
      <p className="break-words text-lg font-semibold">
        {from ? `${from} → ` : ''}
        {ride.destinationName}
      </p>
      <p className="text-slate-600">
        {ride.type === 'ON_DEMAND' ? 'On demand' : formatDayTime(ride.pickupTime)}
      </p>
      <p className="text-slate-600">
        {PURPOSE_LABELS[ride.purpose]} · {needs.join(' · ')}
      </p>
      {to && (
        <Link to={to} className="mt-2 inline-block font-semibold text-brand-700 underline underline-offset-2 hover:text-violet-700">
          View details
        </Link>
      )}
      {children && <div className="mt-4 grid w-full gap-3 sm:flex sm:flex-wrap">{children}</div>}
    </div>
  )
}
