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

const tile =
  'relative flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.14)] ring-1 transition'

// One headline number. The value stays in ink; the coloured icon carries the identity.
export function StatTile({ label, value, icon, tone, note, to, onClick, actionLabel, alert }: Props) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${alert ? 'bg-red-100 text-red-700' : tones[tone].tile}`} aria-hidden>
          {icon}
        </span>
        {(to || onClick) && (
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
        )}
      </div>
      <p className="mt-4 font-display text-3xl font-black tabular-nums tracking-tight text-ink">{value}</p>
      <p className="font-semibold text-slate-700">{label}</p>
      {note && <p className={`mt-0.5 text-sm ${alert ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{note}</p>}
    </>
  )

  const ring = alert ? 'ring-red-200 bg-red-50/40' : 'ring-slate-200/80'
  const interactive = `group ${tile} ${ring} w-full text-left hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:translate-y-0`
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
