import { Check } from 'lucide-react'
import { RIDE_STEPS, rideStage } from '../logic/rideStage'
import type { RideStatus } from '../types'

// The ride as four stops on one road. Drawn for the navy next-pickup panel.
// While the client is in the car, a dot travels the last stretch.
export function RideProgress({ status }: { status: RideStatus }) {
  const stage = rideStage(status)
  if (stage === undefined) return null

  return (
    <ol className="flex" aria-label="Ride progress">
      {RIDE_STEPS.map((step, i) => {
        const reached = i <= stage
        const current = i === stage
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center gap-1.5" aria-current={current ? 'step' : undefined}>
            {i > 0 && (
              <span className={`absolute right-1/2 top-2 h-0.5 w-full -translate-y-1/2 ${reached ? 'bg-aqua-300' : 'bg-white/20'}`} aria-hidden>
                {stage === 2 && i === 3 && (
                  <span className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 animate-travel-x rounded-full bg-aqua-300" />
                )}
              </span>
            )}
            <span
              className={`relative flex h-4 w-4 items-center justify-center rounded-full ${
                reached ? 'bg-aqua-300 text-ink' : 'border-2 border-white/30 bg-ink'
              } ${current ? 'ring-4 ring-aqua-300/25' : ''}`}
              aria-hidden
            >
              {reached && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
            </span>
            <span className={`whitespace-nowrap px-0.5 text-[11px] font-semibold ${reached ? 'text-white' : 'text-white/50'}`}>
              {step}
              <span className="sr-only">{reached ? ' (done)' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
