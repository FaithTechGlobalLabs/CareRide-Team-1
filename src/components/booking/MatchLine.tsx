import type { MatchPreview } from '../../logic/driverMatchPreview'

// Tells staff before sending whether any driver can take the ride, and if not, why.
export function MatchLine({ match }: { match?: MatchPreview }) {
  if (!match) return <p className="text-sm text-slate-500">Checking drivers…</p>
  if (match.count > 0) {
    return (
      <p className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-900">
        <strong>
          {match.count} {match.count === 1 ? 'driver can' : 'drivers can'} take this ride
        </strong>
      </p>
    )
  }
  return (
    <p role="status" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-amber-900">
      <strong>No driver fits this ride right now:</strong> {match.reason} You can still send it. If nobody accepts, the ride turns red with other options.
    </p>
  )
}
