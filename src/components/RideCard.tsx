import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
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

const FINISHED: Ride['status'][] = ['COMPLETED', 'NO_SHOW', 'CANCELLED']

export function RideCard({ ride, from, to, statusLabel, children, alert }: Props) {
  // Only rides that need someone get a note. The badge carries every other status.
  const note = alert ?? (ride.status === 'NEEDS_ATTENTION' ? 'No driver has accepted yet' : undefined)
  const done = FINISHED.includes(ride.status)
  const riders = riderLabel(ride)
  const needs = [
    passengersLabel(ride.passengers),
    ride.needsWheelchair && 'Wheelchair',
    ride.needsAssistance && 'Needs help',
  ].filter(Boolean)

  return (
    <div className={`${card} overflow-hidden ${note ? 'border-red-300' : ''}`}>
      {note && (
        <p className="-mx-6 -mt-6 mb-4 flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2.5 font-bold text-red-800">
          <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
          {note}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-500">
          {RIDE_TYPE_LABELS[ride.type]}
          {ride.returnOfRideId && ' · Return trip'}
          {riders && ` · ${riders}`}
        </span>
        <StatusBadge status={ride.status} label={statusLabel} />
      </div>
      {/* The route as a short road, like the logo: open dot for pickup, filled dot for drop-off. Grey once the ride is over. */}
      <div className="space-y-1">
        {from && (
          <p className="relative flex items-center gap-3 text-slate-600">
            <span className={`h-3 w-3 shrink-0 rounded-full border-2 bg-white ${done ? 'border-slate-400' : 'border-brand-600'}`} aria-hidden />
            <span className={`absolute -bottom-3 left-[5px] top-[18px] w-0.5 ${done ? 'bg-slate-200' : 'bg-brand-200'}`} aria-hidden />
            <span className="sr-only">From </span>
            {from}
          </p>
        )}
        <p className={`flex items-start gap-3 break-words text-lg font-semibold ${done ? 'text-slate-700' : 'text-ink'}`}>
          <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${done ? 'bg-slate-400' : 'bg-brand-600'}`} aria-hidden />
          <span className="min-w-0">
            {from && <span className="sr-only">To </span>}
            {ride.destinationName}
          </span>
        </p>
      </div>
      <div className="mt-2 pl-6 text-slate-600">
        <p>{ride.type === 'ON_DEMAND' ? 'On demand' : formatDayTime(ride.pickupTime)}</p>
        <p>{needs.join(' · ')}</p>
      </div>
      {to && (
        <Link to={to} className="ml-6 mt-2 inline-block font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
          View details
        </Link>
      )}
      {children && <div className="mt-4 grid w-full gap-3 sm:flex sm:flex-wrap">{children}</div>}
    </div>
  )
}
