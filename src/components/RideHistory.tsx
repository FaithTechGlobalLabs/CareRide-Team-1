import { useData } from '../hooks/useData'
import { formatDayTime } from '../logic/formatTime'
import { rideEventText } from '../logic/rideEventText'
import { dataService } from '../services'

// Every change to a ride, oldest first: who did what, and when.
export function RideHistory({ rideId }: { rideId: string }) {
  const events = useData(() => dataService.listRideEvents(rideId), rideId)

  if (!events) return <p className="text-sm text-slate-500">Loading history…</p>
  if (events.length === 0) return <p className="text-sm text-slate-500">No changes recorded for this ride.</p>

  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span className="text-ink">{rideEventText(e)}</span>
          <time dateTime={e.at} className="shrink-0 text-sm text-slate-500">
            {formatDayTime(e.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}
