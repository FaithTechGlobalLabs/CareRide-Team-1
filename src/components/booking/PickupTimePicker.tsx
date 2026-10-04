import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toLocalInput } from '../../logic/pickupTime'
import { FieldMessage } from '../form/FieldMessage'
import { RequiredMark } from '../form/RequiredMark'
import { label } from '../ui'

const DAY = 86_400_000
const SLOT_MINUTES = 15
// How far ahead a ride can be booked
export const BOOK_AHEAD_DAYS = 60

interface Props {
  id: string
  value: string // datetime-local style, e.g. "2026-10-03T14:30"
  onChange: (value: string) => void
  now: number // the clock past times are hidden against
  error?: string
  hint?: string
}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayKey(ms: number): string {
  return toLocalInput(ms).slice(0, 10)
}

// Every quarter hour of a day that's still ahead of `now`
function slotsFor(day: number, now: number): number[] {
  const slots: number[] = []
  for (let m = 0; m < 24 * 60; m += SLOT_MINUTES) {
    const d = new Date(day)
    d.setHours(0, m, 0, 0)
    if (d.getTime() > now) slots.push(d.getTime())
  }
  return slots
}

const time = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// A calendar and a list of times in the app's own style. Past days and times can't be picked,
// and today shows where "now" is, so staff don't have to work it out.
export function PickupTimePicker({ id, value, onChange, now, error, hint }: Props) {
  const parsed = Date.parse(value)
  const selected = Number.isNaN(parsed) ? undefined : parsed
  const today = startOfDay(now)
  const lastDay = today + BOOK_AHEAD_DAYS * DAY
  const selectedDay = startOfDay(selected ?? now)

  const [month, setMonth] = useState(() => {
    const d = new Date(selectedDay)
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  })
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the chosen time in view whenever the day changes
  useEffect(() => {
    const list = listRef.current
    const target = list?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? list?.querySelector<HTMLElement>('[data-now]')
    // The list is the offset parent (it has `relative`), so offsetTop is already measured from its top
    if (list && target) list.scrollTop = target.offsetTop - 8
  }, [selectedDay])

  const first = new Date(month)
  const lead = first.getDay() // blanks before the 1st
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1).getTime()),
  ]
  const canGoBack = month > today
  const canGoForward = new Date(first.getFullYear(), first.getMonth() + 1, 1).getTime() <= lastDay

  function pickDay(day: number) {
    // Keep the same time of day if it's still ahead; otherwise take the first free slot
    const minutes = selected ? new Date(selected).getHours() * 60 + new Date(selected).getMinutes() : 9 * 60
    const d = new Date(day)
    d.setHours(0, minutes, 0, 0)
    const slots = slotsFor(day, now)
    const next = d.getTime() > now ? d.getTime() : slots[0]
    if (next) onChange(toLocalInput(next))
  }

  function shiftMonth(by: number) {
    const d = new Date(month)
    setMonth(new Date(d.getFullYear(), d.getMonth() + by, 1).getTime())
  }

  const slots = slotsFor(selectedDay, now)
  const isToday = selectedDay === today
  const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const dayName = new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  const messageId = `${id}-message`

  return (
    <div id={id} tabIndex={-1} aria-describedby={messageId} className="focus:outline-none">
      <span className={label}>
        Pickup date and time
        <RequiredMark />
      </span>
      <div
        className={`grid overflow-hidden rounded-xl border bg-white sm:grid-cols-[minmax(0,1fr)_13rem] ${
          error ? 'border-red-500' : 'border-slate-200'
        }`}
      >
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoBack}
              aria-label="Previous month"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-display font-extrabold text-ink" aria-live="polite">
              {monthName}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={!canGoForward}
              aria-label="Next month"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={`Days in ${monthName}`}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="pb-1 text-xs font-bold text-slate-400" aria-hidden>
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />
              const past = day < today || day > lastDay
              const on = day === selectedDay
              const isTodayCell = day === today
              return (
                <button
                  key={dayKey(day)}
                  type="button"
                  disabled={past}
                  aria-pressed={on}
                  aria-label={new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + (isTodayCell ? ', today' : '')}
                  onClick={() => pickDay(day)}
                  className={`relative flex aspect-square min-h-10 items-center justify-center rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:text-slate-300 ${
                    on
                      ? 'bg-brand-600 text-white'
                      : isTodayCell
                        ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-300'
                        : 'text-ink hover:bg-slate-100'
                  }`}
                >
                  {new Date(day).getDate()}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 sm:border-l sm:border-t-0">
          <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-ink">{dayName}</p>
          <div ref={listRef} className="relative max-h-72 space-y-1.5 overflow-y-auto p-3" role="group" aria-label={`Times on ${dayName}`}>
            {isToday && (
              <p data-now className="flex items-center gap-2 px-1 py-1 text-sm font-bold text-coral-600">
                <span className="h-2 w-2 rounded-full bg-coral-500" aria-hidden />
                Now · {time(now)}
                <span className="h-px flex-1 bg-coral-200" aria-hidden />
              </p>
            )}
            {slots.length === 0 && <p className="px-1 py-2 text-sm text-slate-500">No times left today. Pick another day.</p>}
            {slots.map((slot, i) => {
              const on = slot === selected
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(toLocalInput(slot))}
                  className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    on ? 'bg-brand-600 text-white' : 'bg-white text-ink ring-1 ring-slate-200 hover:ring-brand-300'
                  }`}
                >
                  {time(slot)}
                  {isToday && i === 0 && (
                    <span className={`text-xs font-bold ${on ? 'text-white/80' : 'text-coral-600'}`}>Soonest</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
