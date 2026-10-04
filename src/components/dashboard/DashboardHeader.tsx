import type { ReactNode } from 'react'
import { useNow } from '../../hooks/useNow'
import { greetingFor } from '../../logic/rideInsights'

interface Props {
  name: string
  summary: ReactNode // one line on what's happening today
  detail?: ReactNode // e.g. the pickup location
  actions?: ReactNode // the main things to do, on the right
}

// The top of every dashboard: today's date, a hello by name, and the next thing to do.
// It sits straight on the page, not in a card, so the cards below read as the content.
export function DashboardHeader({ name, summary, detail, actions }: Props) {
  const now = useNow(60_000)
  const date = new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section aria-labelledby="dashboard-title" className="relative animate-fade-up py-2">
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{date}</p>
          <h1 id="dashboard-title" className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            {greetingFor(new Date(now).getHours())}, {name}
          </h1>
          <div className="mt-2 text-lg text-slate-600">{summary}</div>
          {detail && <div className="mt-3">{detail}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div>}
      </div>
    </section>
  )
}
