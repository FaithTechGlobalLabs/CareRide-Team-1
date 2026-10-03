import type { RideStatus } from '../types'

// Status is shown in words and colour, never colour alone.
const styles: Record<RideStatus, { text: string; className: string; dot: string }> = {
  SEARCHING: { text: 'Finding a driver', className: 'bg-sky-100 text-sky-900', dot: 'bg-sky-500 animate-pulse' },
  OFFERED: { text: 'Waiting for driver', className: 'bg-amber-100 text-amber-900', dot: 'bg-amber-500 animate-pulse' },
  ACCEPTED: { text: 'Driver confirmed', className: 'bg-brand-100 text-brand-900', dot: 'bg-brand-500' },
  NEEDS_ATTENTION: { text: 'Needs attention', className: 'bg-red-100 text-red-900', dot: 'bg-red-500' },
  PICKED_UP: { text: 'Picked up', className: 'bg-violet-100 text-violet-900', dot: 'bg-violet-500' },
  COMPLETED: { text: 'Completed', className: 'bg-emerald-100 text-emerald-900', dot: 'bg-emerald-500' },
  NO_SHOW: { text: "Client didn't show", className: 'bg-orange-100 text-orange-900', dot: 'bg-orange-500' },
  CANCELLED: { text: 'Cancelled', className: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400' },
}

export function StatusBadge({ status }: { status: RideStatus }) {
  const { text, className, dot } = styles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${className}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {text}
    </span>
  )
}
