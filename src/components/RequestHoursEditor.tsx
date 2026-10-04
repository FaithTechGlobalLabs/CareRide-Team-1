import { Check, ChevronDown, Copy } from 'lucide-react'
import { useId, useState } from 'react'
import { WEEKDAYS } from '../constants'
import {
  ALL_DAY,
  DAY_NAMES,
  NOTICE_PRESETS,
  amountToMinutes,
  formatTime,
  isNoticePreset,
  noticeToAmount,
  REQUEST_PRESETS,
  invalidDay,
  sameHours,
  weeklyHours,
  windowSpan,
  type NoticeUnit,
} from '../logic/requestHours'
import type { RequestHours, TimeWindow } from '../types'
import { FieldMessage } from './form/FieldMessage'
import { SelectField } from './form/SelectField'
import { TextField } from './form/TextField'

// Monday first, the way most people picture a week
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const FALLBACK_WINDOW: TimeWindow = { from: '09:00', to: '17:00' }

// Half-hour steps, plus the very end of the day
const TIMES = [...Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`), ALL_DAY.to]

const timeSelect =
  'min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3 pr-8 text-base text-ink transition focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-100 aria-[invalid=true]:border-red-500'

function TimeSelect({ label, value, invalid, onChange }: { label: string; value: string; invalid: boolean; onChange: (time: string) => void }) {
  // Keep times saved before half-hour steps, e.g. 8:45, selectable
  const times = TIMES.includes(value) ? TIMES : [...TIMES, value].sort()
  return (
    <div className="relative min-w-0 flex-1">
      <select
        aria-label={label}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={timeSelect}
      >
        {times.map((t) => (
          <option key={t} value={t}>
            {t === ALL_DAY.to ? 'Midnight' : formatTime(t)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  )
}

interface Props {
  value: RequestHours
  onChange: (value: RequestHours) => void
  error?: string
}

// A week at a glance: switch days on or off, set each day's window, and see it drawn on a 24-hour bar.
export function RequestHoursEditor({ value, onChange, error }: Props) {
  const badDay = invalidDay(value)
  const total = weeklyHours(value)

  const setDay = (day: number, window: TimeWindow | null) => onChange(value.map((w, i) => (i === day ? window : w)))

  // Turning a day on reuses the hours they already use elsewhere, so most people never retype them
  const lastWindow = () => DAY_ORDER.map((d) => value[d]).find(Boolean) ?? FALLBACK_WINDOW

  const copyToAll = (window: TimeWindow) => onChange(value.map((w) => (w ? { ...window } : w)))

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Quick start</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REQUEST_PRESETS.map((p) => {
            const active = sameHours(value, p.hours)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(p.hours.map((w) => w && { ...w }))}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${
                  active ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'
                }`}
              >
                <span className="flex items-center gap-1 text-sm font-bold text-ink">
                  {active && <Check className="h-4 w-4 text-teal-600" strokeWidth={3} aria-hidden />}
                  {p.label}
                </span>
                <span className="block text-xs text-slate-500">{p.detail}</span>
              </button>
            )
          })}
        </div>
      </div>

      <fieldset aria-describedby="request-hours-message">
        <legend className="mb-2 text-sm font-semibold text-ink">Your week</legend>

        {/* Hour marks over the bars, wide screens only */}
        <div className="hidden grid-cols-[5.5rem_1fr_20rem] gap-4 px-3 text-xs font-medium text-slate-400 md:grid" aria-hidden>
          <span />
          <div className="relative h-4">
            {['12 AM', '6 AM', '12 PM', '6 PM'].map((t, i) => (
              <span key={t} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: `${i * 25}%` }}>
                {t}
              </span>
            ))}
          </div>
          <span />
        </div>

        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {DAY_ORDER.map((day) => {
            const w = value[day]
            const name = DAY_NAMES[day]
            const span = w && windowSpan(w)
            const invalid = day === badDay
            return (
              <li key={day} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 p-3 md:grid-cols-[5.5rem_1fr_20rem] md:gap-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(w)}
                  aria-label={`Requests on ${name}`}
                  onClick={() => setDay(day, w ? null : { ...lastWindow() })}
                  className={`inline-flex min-h-11 w-[5.5rem] items-center justify-center gap-1 rounded-full border-2 font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${
                    w ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300'
                  }`}
                >
                  {w && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                  {WEEKDAYS[day]}
                </button>

                <div className="relative h-6 overflow-hidden rounded-lg bg-slate-100 md:h-8" aria-hidden>
                  {[25, 50, 75].map((left) => (
                    <span key={left} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${left}%` }} />
                  ))}
                  {span && span.width > 0 && (
                    <span
                      className="absolute inset-y-0 rounded-lg bg-fresh-gradient shadow-sm"
                      style={{ left: `${span.start * 100}%`, width: `${span.width * 100}%` }}
                    />
                  )}
                </div>

                {/* Phones: times get their own row under the bar. Wide screens: last column. */}
                {w ? (
                  <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                    <TimeSelect
                      label={`${name} from`}
                      value={w.from}
                      invalid={invalid}
                      onChange={(from) => setDay(day, { ...w, from })}
                    />
                    <span className="text-slate-400" aria-hidden>
                      –
                    </span>
                    <TimeSelect
                      label={`${name} until`}
                      value={w.to}
                      invalid={invalid}
                      onChange={(to) => setDay(day, { ...w, to })}
                    />
                    <button
                      type="button"
                      onClick={() => copyToAll(w)}
                      title="Use these hours on every day that's on"
                      aria-label={`Use ${name}'s hours on every day that's on`}
                      className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 sm:inline-flex transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                    >
                      <Copy className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <span className="hidden text-right text-sm text-slate-400 md:block">No requests</span>
                )}
              </li>
            )
          })}
        </ul>
        <FieldMessage
          id="request-hours-message"
          error={error ?? (badDay >= 0 ? `On ${DAY_NAMES[badDay]}, the end time must be after the start time.` : undefined)}
          hint={`${total > 0 ? `About ${total} hours a week. ` : ''}You choose which requests to accept, so this is never a promise to drive.`}
        />
      </fieldset>
    </div>
  )
}

interface NoticeProps {
  value: number
  onChange: (minutes: number) => void
}

const chipClass = (checked: boolean) =>
  `inline-flex min-h-11 cursor-pointer select-none items-center gap-1.5 rounded-full border-2 px-4 font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-teal-100 ${
    checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
  }`

// How far ahead a pickup must be booked before we ask this driver.
export function NoticePicker({ value, onChange }: NoticeProps) {
  const group = useId()
  const [custom, setCustom] = useState(() => !isNoticePreset(value))
  const initial = noticeToAmount(value)
  const [amount, setAmount] = useState(initial.amount)
  const [unit, setUnit] = useState<NoticeUnit>(initial.unit)

  const presetSelected = !custom && isNoticePreset(value)
  const customMinutes = amountToMinutes(amount, unit)
  const customError = custom && customMinutes === undefined ? 'Enter a whole number greater than zero.' : undefined

  function pickPreset(minutes: number) {
    setCustom(false)
    const next = noticeToAmount(minutes)
    setAmount(next.amount)
    setUnit(next.unit)
    onChange(minutes)
  }

  function pickCustom() {
    setCustom(true)
    const next = noticeToAmount(value)
    setAmount(next.amount)
    setUnit(next.unit)
  }

  function updateCustom(nextAmount: string, nextUnit: NoticeUnit) {
    setAmount(nextAmount)
    setUnit(nextUnit)
    const minutes = amountToMinutes(nextAmount, nextUnit)
    if (minutes !== undefined) onChange(minutes)
  }

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink">Notice you need before a pickup</legend>
      <p className="mb-3 text-sm text-slate-500">We'll only ask you about rides booked at least this far ahead.</p>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {NOTICE_PRESETS.map((o) => {
          const checked = presetSelected && value === o.minutes
          return (
            <label key={o.minutes} className={chipClass(checked)}>
              <input
                type="radio"
                name={group}
                className="sr-only"
                checked={checked}
                onChange={() => pickPreset(o.minutes)}
              />
              {checked && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
              {o.text}
            </label>
          )
        })}
        <label className={chipClass(custom)}>
          <input type="radio" name={group} className="sr-only" checked={custom} onChange={pickCustom} />
          {custom && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
          Custom
        </label>
      </div>
      {custom && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem]">
          <TextField
            id={`${group}-amount`}
            label="Custom amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            error={customError}
            onChange={(e) => updateCustom(e.target.value, unit)}
          />
          <SelectField id={`${group}-unit`} label="Unit" value={unit} onChange={(e) => updateCustom(amount, e.target.value as NoticeUnit)}>
            <option value="min">minutes</option>
            <option value="hr">hours</option>
          </SelectField>
        </div>
      )}
    </fieldset>
  )
}
