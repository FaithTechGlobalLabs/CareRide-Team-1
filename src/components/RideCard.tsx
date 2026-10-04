import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { RIDE_TYPE_LABELS } from '../constants'
import type { Ride } from '../types'
import { StatusBadge } from './StatusBadge'
import { card } from './ui'
import { formatDayTime } from '../logic/formatTime'
import { rideStage } from '../logic/rideStage'
import { passengersLabel, rideBadgeLabel, riderLabel } from '../logic/rideText'

interface Props {
  ride: Ride
  from?: string // pickup label, e.g. the house name
  to?: string // link to the ride's detail page
  statusLabel?: string // override badge text when the default is for another role
  children?: ReactNode // action buttons
  alert?: string // one-line reason the ride needs action, shown in red
  aside?: ReactNode // wide screens: the right side of the card. Phones: above the details
}

const FILLED = 'border-brand-600 bg-brand-600'
const OPEN = 'border-brand-600 bg-white'

// Colours for the pickup dot, the road and the drop-off dot at each stage (see rideStage)
function roadColours(stage: number | undefined) {
  if (stage === undefined) return { pickup: 'border-slate-400 bg-white', line: 'bg-slate-200', dropoff: 'border-slate-400 bg-slate-400' }
  if (stage === 3) return { pickup: 'border-emerald-600 bg-emerald-600', line: 'bg-emerald-600', dropoff: 'border-emerald-600 bg-emerald-600' }
  return { pickup: stage >= 1 ? FILLED : OPEN, line: stage >= 2 ? 'bg-brand-300' : 'bg-brand-200', dropoff: OPEN }
}

export function RideCard({ ride, from, to, statusLabel, children, alert, aside }: Props) {
  // Only rides that need someone get a note. The badge carries every other status.
  const note = alert
  const stage = rideStage(ride.status)
  const road = roadColours(stage)
  const done = stage === undefined || stage === 3
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
      <div className={aside ? 'flex flex-col gap-4 sm:flex-row sm:items-start' : undefined}>
        <div className="min-w-0 flex-1">
          <div className={`mb-3 flex flex-wrap items-center gap-2 ${aside ? 'justify-between sm:justify-start' : 'justify-between'}`}>
            <span className="text-sm font-semibold text-slate-500">
              {RIDE_TYPE_LABELS[ride.type]}
              {ride.returnOfRideId && ' · Return trip'}
              {riders && ` · ${riders}`}
            </span>
            <StatusBadge status={ride.status} label={statusLabel ?? rideBadgeLabel(ride)} />
          </div>
          {/* The route as a short road, like the logo. It fills in as the ride goes: pickup dot once a driver confirms,
              a dot travels the road while the client is in the car, and it all turns green on arrival. Grey if the ride stopped short. */}
          <div className="space-y-1">
            {from && (
              <p className="relative flex items-center gap-3 text-slate-600">
                <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${road.pickup}`} aria-hidden />
                <span className={`absolute -bottom-3 left-[5px] top-[18px] w-0.5 ${road.line}`} aria-hidden>
                  {stage === 2 && <span className="absolute -left-[2px] h-1.5 w-1.5 -translate-y-1/2 animate-travel-y rounded-full bg-brand-600" />}
                </span>
                <span className="sr-only">From </span>
                {from}
              </p>
            )}
            <p className={`flex items-start gap-3 break-words text-lg font-semibold ${done ? 'text-slate-700' : 'text-ink'}`}>
              <span className={`mt-2 h-3 w-3 shrink-0 rounded-full border-2 ${road.dropoff}`} aria-hidden />
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
        {aside}
      </div>
    </div>
  )
}
