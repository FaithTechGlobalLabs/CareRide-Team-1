import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Ride } from '../types'
import { StatusBadge } from './StatusBadge'
import { card } from './ui'

interface Props {
  ride: Ride
  to?: string // link to the ride's detail page
  children?: ReactNode // action buttons
}

export function RideCard({ ride, to, children }: Props) {
  const highlight = ride.status === 'NEEDS_ATTENTION' ? 'border-red-500 border-2' : ''
  return (
    <div className={`${card} ${highlight}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {ride.type === 'ESSENTIAL' ? 'Essential' : 'Scheduled'}
          {ride.returnOfRideId && ' · Return trip'}
        </span>
        <StatusBadge status={ride.status} />
      </div>
      <p className="text-lg font-semibold">
        {ride.clientName} → {ride.destinationAddress}
      </p>
      <p className="text-slate-600">{new Date(ride.pickupTime).toLocaleString()}</p>
      {(ride.needsWheelchair || ride.needsAssistance) && (
        <p className="text-slate-600">
          {[ride.needsWheelchair && 'Wheelchair', ride.needsAssistance && 'Needs help'].filter(Boolean).join(' · ')}
        </p>
      )}
      {to && (
        <Link to={to} className="mt-2 inline-block font-semibold text-blue-700 underline">
          View details
        </Link>
      )}
      {children && <div className="mt-4 flex flex-wrap gap-3">{children}</div>}
    </div>
  )
}
