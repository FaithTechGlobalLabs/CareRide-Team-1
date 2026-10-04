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
export function DashboardHeader({ name, summary, detail, actions }: Props) {
  const now = useNow(60_000)
  const date = new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section
      aria-labelledby="dashboard-title"
      className="relative animate-fade-up overflow-hidden rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-20px_rgba(16,24,40,0.18)] ring-1 ring-slate-200/80 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{date}</p>
          <h1 id="dashboard-title" className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            {greetingFor(new Date(now).getHours())}, <span className="text-brand-gradient">{name}</span>
          </h1>
          <div className="mt-2 text-lg text-slate-600">{summary}</div>
          {detail && <div className="mt-3">{detail}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div>}
      </div>
    </section>
  )
}
