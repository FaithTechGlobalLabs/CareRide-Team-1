import { Car, Clock, Crosshair, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useDriverLocation, useMapsAvailable, useRoute, type RouteState } from '../../hooks/useMaps'
import { useNow } from '../../hooks/useNow'
import { formatTime } from '../../logic/formatTime'
import { requestDriverLocation } from '../../services/driverLocation'
import { formatDriveTime } from '../../services/googleMaps'

// After this, "from you" says where they were and when, and offers an update
const STALE_MS = 10 * 60_000

interface Props {
  pickup?: string // a real address, or leave out
  dropoff?: string
  fromMe?: boolean // also show the drive from the driver's location to the pickup
  showRide?: boolean // show the pickup to drop-off drive
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-700">
      <span className="text-slate-400" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </p>
  )
}

function timeText(state: RouteState, ready: (minutes: string, km: number) => ReactNode): ReactNode {
  if (state.status === 'loading') return <span className="text-slate-500">Working out drive time…</span>
  if (state.status === 'ready') return ready(formatDriveTime(state.route.minutes), state.route.km)
  return null
}

// Drive times from Google Maps, in words. Renders nothing when Maps is off.
export function DriveTimes({ pickup, dropoff, fromMe = false, showRide = true }: Props) {
  const available = useMapsAvailable()
  const location = useDriverLocation(fromMe)
  const now = useNow(60_000)
  const toPickup = useRoute(fromMe ? location.coords : undefined, fromMe ? pickup : undefined)
  const ride = useRoute(showRide ? pickup : undefined, showRide ? dropoff : undefined)

  if (!available || !pickup) return null

  const stale = location.at !== undefined && now - location.at > STALE_MS
  const toPickupText = timeText(toPickup, (t) => (
    <>
      About <strong className="font-semibold text-ink">{t}</strong> to the pickup from{' '}
      {stale && location.at ? `where you were at ${formatTime(new Date(location.at).toISOString())}` : 'you'}
      {stale && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => requestDriverLocation(true)}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Update
          </button>
        </>
      )}
    </>
  ))
  const rideText = timeText(ride, (t, km) => (
    <>
      The ride is about <strong className="font-semibold text-ink">{t}</strong> ({km} km)
    </>
  ))

  return (
    <div className="w-full space-y-1.5" aria-live="polite">
      {fromMe && location.coords && toPickupText && <Line icon={<Car className="h-4 w-4" />}>{toPickupText}</Line>}
      {fromMe && !location.coords && <LocationAsk status={location.status} />}
      {showRide && rideText && <Line icon={<Clock className="h-4 w-4" />}>{rideText}</Line>}
    </div>
  )
}

function LocationAsk({ status }: { status: string }) {
  if (status === 'asking') {
    return (
      <Line icon={<Loader2 className="h-4 w-4 animate-spin" />}>
        <span className="text-slate-500">Finding your location…</span>
      </Line>
    )
  }
  if (status === 'denied') {
    return (
      <Line icon={<Crosshair className="h-4 w-4" />}>
        <span className="text-slate-500">Location is blocked. Allow it in your browser settings to see drive time to the pickup.</span>
      </Line>
    )
  }
  return (
    <button
      type="button"
      onClick={() => requestDriverLocation()}
      className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <Crosshair className="h-4 w-4" aria-hidden />
      {status === 'unavailable' ? "Couldn't find you. Try again" : 'Use my location to see drive time to the pickup'}
    </button>
  )
}
