import { ArrowRight, CalendarPlus, CarFront, Clock, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { acceptedMessage } from '../../logic/acceptedMessage'
import { formatDayTime } from '../../logic/formatTime'
import { ridePath } from '../../logic/homeFor'
import { countdown } from '../../logic/rideInsights'
import { riderLabel } from '../../logic/rideText'
import type { Ride } from '../../types'
import { RideProgress } from '../RideProgress'
import { StatusBadge } from '../StatusBadge'
import { card, primaryButton } from '../ui'

interface Props {
  ride?: Ride
  driverName?: string
  vehicle?: string
  now: number
}

// The one ride staff will ask about next: when, where, and who's driving.
export function NextPickup({ ride, driverName, vehicle, now }: Props) {
  if (!ride) {
    return (
      <section aria-labelledby="next-title" className={`${card} flex flex-col items-center p-6 text-center`}>
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
          <CalendarPlus className="h-7 w-7" />
        </span>
        <h2 id="next-title" className="text-lg font-extrabold">
          Nothing booked right now
        </h2>
        <p className="mt-1 text-sm text-slate-500">When you book a ride, the next pickup shows up here with a live countdown.</p>
        <Link to="/partner/request" className={`${primaryButton} mt-5 w-full`}>
          Request a ride
        </Link>
      </section>
    )
  }

  const onBoard = ride.status === 'PICKED_UP'
  const pickupMs = new Date(ride.pickupTime).getTime()
  const riders = riderLabel(ride)
  const hasDriver = ride.status === 'ACCEPTED' || onBoard

  return (
    <section aria-labelledby="next-title" className="relative overflow-hidden rounded-xl bg-ink p-6 text-white">
      <span className="absolute inset-x-0 top-0 h-1 bg-brand-500" aria-hidden />
      <div className="relative">
        <h2 id="next-title" className="text-sm font-bold text-white">
          {onBoard ? 'On the road' : 'Next pickup'}
        </h2>
        <p className="mt-2 font-display text-4xl font-black tracking-tight" aria-live="polite">
          {onBoard ? 'Riding now' : ride.type === 'ON_DEMAND' ? 'As soon as possible' : countdown(pickupMs, now)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
          <Clock className="h-4 w-4" aria-hidden />
          {ride.type === 'ON_DEMAND' ? 'On demand' : formatDayTime(ride.pickupTime)}
        </p>

        <div className="mt-5 rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
          <p className="flex items-start gap-2 font-semibold">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-aqua-300" aria-hidden />
            <span className="min-w-0 break-words">
              {ride.returnOfRideId && 'Return: '}
              {ride.destinationName}
            </span>
          </p>
          {riders && <p className="mt-1 pl-6 text-sm text-white/70">{riders}</p>}
          <div className="mt-3 pl-6">
            <StatusBadge status={ride.status} />
          </div>
          {hasDriver && (
            <p className="mt-3 flex items-start gap-2 text-sm text-white/90">
              <CarFront className="mt-0.5 h-4 w-4 shrink-0 text-aqua-300" aria-hidden />
              <span>
                {acceptedMessage(ride, driverName)}
                {vehicle && <span className="block text-white/60">{vehicle}</span>}
              </span>
            </p>
          )}
        </div>

        <div className="mt-5">
          <RideProgress status={ride.status} />
        </div>

        <Link
          to={ridePath(ride.id)}
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-xl font-semibold text-white transition hover:gap-2.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white"
        >
          View ride details <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
