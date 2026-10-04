import { Clock, HeartPulse, Hospital, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { passengersLabel } from '../../logic/rideText'
import { card } from '../ui'

interface Stop {
  name: string
  detail?: string
}

interface Props {
  from: Stop
  to?: Stop
  when?: string
  wait?: string // current hospital / urgent-care wait, if we have one for this place
  rider?: string
  passengers: number
  needs: string[]
  done: number
  total: number
  children: ReactNode // driver match, errors, and the send button
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-slate-500">{label}</dt>
        <dd className="text-sm text-ink">{children}</dd>
      </div>
    </div>
  )
}

const missing = (text: string) => <span className="italic text-slate-400">{text}</span>

// A live recap of the ride beside the form, so staff can check it at a glance before sending.
export function TripSummary({ from, to, when, wait, rider, passengers, needs, done, total, children }: Props) {
  const percent = Math.round((done / total) * 100)
  return (
    <div className={`${card} space-y-5 p-5`}>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-extrabold">Trip summary</h2>
          <span className="text-xs font-semibold text-slate-500">
            {done} of {total} required steps
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Required steps done"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${done === total ? 'bg-emerald-600' : 'bg-brand-600'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="relative space-y-4 pl-6" aria-label="Route">
        <span className="absolute bottom-3 left-[5px] top-3 w-0.5 rounded bg-slate-300" aria-hidden />
        <li className="relative">
          <span className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500 ring-2 ring-brand-200" aria-hidden />
          <span className="block text-sm font-semibold text-slate-500">Pickup</span>
          <span className="block text-sm font-semibold text-ink">{from.name}</span>
          {from.detail && <span className="block truncate text-xs text-slate-500">{from.detail}</span>}
        </li>
        <li className="relative">
          <span
            className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ${to ? 'bg-coral-500 ring-coral-200' : 'bg-slate-300 ring-slate-200'}`}
            aria-hidden
          />
          <span className="block text-sm font-semibold text-slate-500">Drop-off</span>
          {to ? (
            <>
              <span className="block text-sm font-semibold text-ink">{to.name}</span>
              {to.detail && to.detail !== to.name && <span className="block truncate text-xs text-slate-500">{to.detail}</span>}
            </>
          ) : (
            <span className="block text-sm">{missing('Not chosen yet')}</span>
          )}
        </li>
      </ol>

      <dl className="space-y-3 border-t border-slate-100 pt-4">
        <Row icon={<Clock className="h-4 w-4" />} label="When">
          {when ?? missing('Choose a pickup time')}
        </Row>
        {wait && (
          <Row icon={<Hospital className="h-4 w-4" />} label="Wait to be seen">
            {wait}
          </Row>
        )}
        <Row icon={<User className="h-4 w-4" />} label="Passengers">
          {passengersLabel(passengers)}
          {rider && <span className="text-slate-500"> · {rider}</span>}
        </Row>
        {needs.length > 0 && (
          <Row icon={<HeartPulse className="h-4 w-4" />} label="Needs">
            <span className="mt-1 flex flex-wrap gap-1.5">
              {needs.map((n) => (
                <span key={n} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {n}
                </span>
              ))}
            </span>
          </Row>
        )}
      </dl>

      {children}
    </div>
  )
}
