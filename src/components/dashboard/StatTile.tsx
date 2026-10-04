import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { tones, type Tone } from '../ui'

interface Props {
  label: string
  value: string | number
  icon: ReactNode
  tone: Tone
  note?: string // small line under the value, e.g. "3 this week"
  to?: string // makes the whole tile a link
  onClick?: () => void // or a button, e.g. to open a tab below
  actionLabel?: string // what the click does, for screen readers
  alert?: boolean // draws the eye: something here needs doing
}

const tile = 'relative flex h-full flex-col rounded-xl border bg-white p-5 transition'

// One headline number. The label leads with a small coloured icon; the value stays in ink.
export function StatTile({ label, value, icon, tone, note, to, onClick, actionLabel, alert }: Props) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-slate-700">
          <span className={alert ? 'text-red-700' : tones[tone].text} aria-hidden>
            {icon}
          </span>
          {label}
        </p>
        {(to || onClick) && (
          <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
        )}
      </div>
      <p className="mt-3 font-display text-4xl font-black tabular-nums tracking-tight text-ink">{value}</p>
      {note && <p className={`mt-1 text-sm ${alert ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{note}</p>}
    </>
  )

  const ring = alert ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
  const interactive = `group ${tile} ${ring} w-full text-left hover:-translate-y-0.5 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:translate-y-0`
  if (to) {
    return (
      <Link to={to} className={interactive} aria-label={actionLabel}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={interactive} aria-label={actionLabel ? `${value} ${label}. ${actionLabel}` : undefined}>
        {body}
      </button>
    )
  }
  return <div className={`${tile} ${ring}`}>{body}</div>
}
