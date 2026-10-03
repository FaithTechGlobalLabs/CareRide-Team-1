import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { MatchPreview } from '../../logic/driverMatchPreview'

// Tells staff before sending whether any driver can take the ride, and if not, why.
export function MatchLine({ match }: { match?: MatchPreview }) {
  if (!match) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        Checking drivers…
      </p>
    )
  }
  if (match.count > 0) {
    return (
      <p role="status" className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 ring-1 ring-emerald-200">
        <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <strong>
          {match.count} {match.count === 1 ? 'driver can' : 'drivers can'} take this ride
        </strong>
      </p>
    )
  }
  return (
    <p role="status" className="flex gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-300">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <span>
        <strong>No driver fits this ride right now:</strong> {match.reason} You can still send it. If nobody accepts, the ride turns
        red with other options.
      </span>
    </p>
  )
}
