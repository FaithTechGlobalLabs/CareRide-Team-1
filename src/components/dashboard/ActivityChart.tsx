import { useState } from 'react'
import type { DayCount } from '../../logic/rideInsights'
import { card } from '../ui'

interface Props {
  days: DayCount[] // oldest first
  today: number // index of today in days
  title: string
  subtitle: string
}

const dayName = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const shortDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const rides = (n: number) => `${n} ${n === 1 ? 'ride' : 'rides'}`

// A clean top for the axis: small counts show every whole number, bigger ones round up to fives.
function axisTop(max: number): number {
  if (max <= 4) return Math.max(2, max)
  return Math.ceil(max / 5) * 5
}

// Rides per day as columns, with today marked. Days already gone and days booked ahead are two shades
// of one hue, named in the key. Each column is a button, so hover, tap, and keyboard focus show its tooltip.
export function ActivityChart({ days, today, title, subtitle }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const top = axisTop(Math.max(...days.map((d) => d.count)))
  const ticks = top % 2 === 0 ? [top, top / 2, 0] : [top, 0]
  const sum = (from: number, to: number) => days.slice(Math.max(0, from), to).reduce((n, d) => n + d.count, 0)
  const lastSeven = sum(today - 6, today + 1)
  const nextSeven = sum(today + 1, today + 8)

  const when = (i: number) => (i === today ? 'Today' : dayName(days[i].start))
  const pct = (n: number) => `${(n / top) * 100}%`

  return (
    <section aria-labelledby="activity-title" className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="activity-title" className="text-lg font-extrabold">
            {title}
          </h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <dl className="flex gap-6">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Last 7 days</dt>
            <dd className="font-display text-2xl font-black tabular-nums text-ink">{rides(lastSeven)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Next 7 days</dt>
            <dd className="font-display text-2xl font-black tabular-nums text-ink">{rides(nextSeven)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-600" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Up to today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-200" /> Booked ahead
        </span>
      </div>

      <div className="mt-3 flex gap-3">
        {/* Y axis */}
        <div className="relative mt-6 h-40 w-5 shrink-0 text-right text-xs tabular-nums text-slate-400" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: pct(top - t) }}>
              {t}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Room above the plot so a value or tooltip on the tallest column never hits the heading */}
          <div className="relative mt-6 h-40">
            {ticks.map((t) => (
              <span key={t} className="absolute inset-x-0 h-px bg-slate-100" style={{ top: pct(top - t) }} aria-hidden />
            ))}
            <span className="absolute inset-x-0 bottom-0 h-px bg-slate-200" aria-hidden />

            <div className="relative flex h-full items-end">
              {days.map((d, i) => {
                const ahead = i > today
                const on = active === i
                // Keep the tooltip inside the card at both ends
                const tipSide = i < 3 ? 'left-0' : i > days.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                return (
                  <button
                    key={d.start}
                    type="button"
                    className="group relative flex h-full flex-1 cursor-default items-end justify-center px-px focus-visible:outline-none"
                    aria-label={`${when(i)}: ${rides(d.count)}${ahead ? ' booked' : ''}`}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    {(on || i === today) && (
                      <span
                        className={`absolute inset-x-0 bottom-0 top-0 rounded-md ${on ? 'bg-slate-100 group-focus-visible:ring-2 group-focus-visible:ring-brand-300' : 'bg-brand-50/70'}`}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`relative w-full max-w-6 rounded-t-sm transition-[height,background-color] duration-500 ease-out ${
                        ahead ? (on ? 'bg-brand-300' : 'bg-brand-200') : i === today || on ? 'bg-brand-700' : 'bg-brand-500'
                      }`}
                      style={{ height: pct(d.count) }}
                      aria-hidden
                    />
                    {on && d.count > 0 && (
                      <span className="absolute left-1/2 -translate-x-1/2 pb-1 text-xs font-bold tabular-nums text-ink" style={{ bottom: pct(d.count) }} aria-hidden>
                        {d.count}
                      </span>
                    )}
                    {on && (
                      <span
                        className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-left text-xs text-white shadow-lg ${tipSide}`}
                        aria-hidden
                      >
                        <strong className="block text-sm">
                          {rides(d.count)}
                          {ahead && ' booked'}
                        </strong>
                        {when(i)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* X axis: a label each week, lined up with today */}
          <div className="mt-2 flex text-[11px] font-medium text-slate-500" aria-hidden>
            {days.map((d, i) => (
              <span key={d.start} className="relative h-4 flex-1">
                {(i - today) % 7 === 0 && (
                  <span className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${i === today ? 'font-bold text-ink' : ''}`}>
                    {i === today ? 'Today' : shortDate(d.start)}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Rides</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.start}>
              <td>{when(i)}</td>
              <td>
                {d.count}
                {i > today && ' booked'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
