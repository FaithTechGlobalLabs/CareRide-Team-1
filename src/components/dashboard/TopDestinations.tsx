import { RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PlaceCount } from '../../logic/rideInsights'
import { card } from '../ui'

// Where clients go most, as a ranked list with one-tap rebooking.
// Bars are one hue on a lighter track of the same hue, so length is the only thing to read.
export function TopDestinations({ places }: { places: PlaceCount[] }) {
  const max = Math.max(1, ...places.map((p) => p.count))

  return (
    <section aria-labelledby="places-title" className={`${card} p-5 sm:p-6`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="places-title" className="text-lg font-extrabold">
          Frequent places
        </h2>
        <Link to="/partner/destinations" className="text-sm font-semibold text-brand-700 hover:underline">
          Manage
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="text-sm text-slate-500">Your most-visited places show up here after your first rides.</p>
      ) : (
        <ol className="space-y-4">
          {places.map((p, i) => (
            <li key={p.lastRideId}>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${i === 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink" title={p.address}>
                    {p.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-100" aria-hidden>
                      <span className="block h-full rounded-full bg-brand-500 transition-[width] duration-700" style={{ width: `${(p.count / max) * 100}%` }} />
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-slate-600">
                      {p.count} {p.count === 1 ? 'ride' : 'rides'}
                    </span>
                    <Link
                      to={`/partner/request?again=${p.lastRideId}`}
                      className="-my-2 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                      aria-label={`Book ${p.name} again`}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Book
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
