import type { RideStatus } from '../types'

// Status is shown in words and colour, never colour alone.
const styles: Record<RideStatus, { text: string; className: string; dot: string }> = {
  SEARCHING: { text: 'Finding a driver', className: 'bg-brand-50 text-brand-900', dot: 'bg-brand-500 animate-pulse' },
  OFFERED: { text: 'Waiting for driver', className: 'bg-sun-400 text-ink', dot: 'bg-ink animate-pulse' },
  ACCEPTED: { text: 'Driver confirmed', className: 'bg-emerald-100 text-emerald-900', dot: 'bg-emerald-600' },
  NEEDS_ATTENTION: { text: 'Needs attention', className: 'bg-care-red text-white', dot: 'bg-white' },
  PICKED_UP: { text: 'Picked up', className: 'bg-cyan-100 text-cyan-900', dot: 'bg-cyan-600' },
  COMPLETED: { text: 'Completed', className: 'bg-slate-100 text-slate-800', dot: 'bg-slate-500' },
  NO_SHOW: { text: "Client didn't show", className: 'bg-coral-50 text-coral-700', dot: 'bg-coral-600' },
  CANCELLED: { text: 'Cancelled', className: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400' },
}

export function StatusBadge({ status, label }: { status: RideStatus; label?: string }) {
  const { text, className, dot } = styles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${className}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label ?? text}
    </span>
  )
}
