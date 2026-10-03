import type { RideStatus } from '../types'

// Status is shown in words and colour, never colour alone.
const styles: Record<RideStatus, { text: string; className: string }> = {
  SEARCHING: { text: 'Finding a driver', className: 'bg-slate-100 text-slate-800' },
  OFFERED: { text: 'Waiting for driver', className: 'bg-amber-100 text-amber-900' },
  ACCEPTED: { text: 'Driver confirmed', className: 'bg-blue-100 text-blue-900' },
  NEEDS_ATTENTION: { text: 'Needs attention', className: 'bg-red-100 text-red-900' },
  PICKED_UP: { text: 'Picked up', className: 'bg-indigo-100 text-indigo-900' },
  COMPLETED: { text: 'Completed', className: 'bg-green-100 text-green-900' },
  CANCELLED: { text: 'Cancelled', className: 'bg-slate-200 text-slate-700' },
}

export function StatusBadge({ status }: { status: RideStatus }) {
  const { text, className } = styles[status]
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${className}`}>{text}</span>
}
