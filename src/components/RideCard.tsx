import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RIDE_TYPE_LABELS } from '../constants'
import type { Ride } from '../types'
import { StatusBadge } from './StatusBadge'
import { card } from './ui'
import { formatDayTime } from '../logic/formatTime'
import { passengersLabel, riderLabel } from '../logic/rideText'

interface Props {
  ride: Ride
  from?: string // pickup label, e.g. the house name
  to?: string // link to the ride's detail page
  statusLabel?: string // override badge text when the default is for another role
  children?: ReactNode // action buttons
  alert?: string // one-line reason the ride needs action, shown in red
}

// A coloured rule across the top echoes the status badge, so a list scans at a glance.
const ACCENT: Record<Ride['status'], string> = {
  SEARCHING: 'bg-brand-500',
  OFFERED: 'bg-sun-400',
  ACCEPTED: 'bg-emerald-600',
  NEEDS_ATTENTION: 'bg-care-red',
  PICKED_UP: 'bg-cyan-600',
  COMPLETED: 'bg-slate-400',
  NO_SHOW: 'bg-coral-600',
  CANCELLED: 'bg-slate-300',
}

export function RideCard({ ride, from, to, statusLabel, children, alert }: Props) {
  const highlight = ride.status === 'NEEDS_ATTENTION' || alert ? 'border-red-300 bg-red-50/40' : ''
  const riders = riderLabel(ride)
  const needs = [
    passengersLabel(ride.passengers),
    ride.needsWheelchair && 'Wheelchair',
    ride.needsAssistance && 'Needs help',
  ].filter(Boolean)

  return (
    <div className={`${card} relative overflow-hidden ${highlight}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${ACCENT[ride.status]}`} aria-hidden />
      {alert && <p className="mb-2 font-bold text-red-800">⚠ {alert}</p>}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-500">
          {RIDE_TYPE_LABELS[ride.type]}
          {ride.returnOfRideId && ' · Return trip'}
          {riders && ` · ${riders}`}
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
        {needs.join(' · ')}
      </p>
      {to && (
        <Link to={to} className="mt-2 inline-block font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
          View details
        </Link>
      )}
      {children && <div className="mt-4 grid w-full gap-3 sm:flex sm:flex-wrap">{children}</div>}
    </div>
  )
}
