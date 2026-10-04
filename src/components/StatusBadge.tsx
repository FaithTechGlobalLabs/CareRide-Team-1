import { BellRing, Bus, CarFront, Check, CircleCheck, CircleX, Clock, TriangleAlert, UserX, type LucideIcon } from 'lucide-react'
import type { RideStatus } from '../types'
import { SENT_ON_TRANSIT_LABEL } from '../logic/rideText'

// Each status gets an icon as well as a colour, so it reads without colour vision too.
export const STATUS_ICON: Record<RideStatus, LucideIcon> = {
  SEARCHING: Clock,
  OFFERED: BellRing,
  ACCEPTED: Check,
  NEEDS_ATTENTION: TriangleAlert,
  PICKED_UP: CarFront,
  COMPLETED: CircleCheck,
  NO_SHOW: UserX,
  CANCELLED: CircleX,
}

// Status is shown in words, icon and colour, never colour alone.
const styles: Record<RideStatus, { text: string; className: string }> = {
  SEARCHING: { text: 'Finding a driver', className: 'bg-brand-50 text-brand-800' },
  OFFERED: { text: 'Waiting for driver', className: 'bg-sun-400 text-ink' },
  ACCEPTED: { text: 'Driver confirmed', className: 'bg-emerald-100 text-emerald-900' },
  NEEDS_ATTENTION: { text: 'No driver available', className: 'bg-care-red text-white' },
  PICKED_UP: { text: 'Picked up', className: 'bg-cyan-100 text-cyan-900' },
  COMPLETED: { text: 'Completed', className: 'bg-slate-100 text-slate-700' },
  NO_SHOW: { text: "Client didn't show", className: 'bg-coral-50 text-coral-700' },
  CANCELLED: { text: 'Cancelled', className: 'bg-slate-100 text-slate-600' },
}

const TRANSIT = { text: SENT_ON_TRANSIT_LABEL, className: 'bg-teal-100 text-teal-900' }

export function StatusBadge({ status, label }: { status: RideStatus; label?: string }) {
  const transit = label === SENT_ON_TRANSIT_LABEL
  const { text, className } = transit ? TRANSIT : styles[status]
  const Icon = transit ? Bus : STATUS_ICON[status]
  const live = status === 'SEARCHING' || status === 'OFFERED'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3 text-sm font-semibold ${className}`}>
      <Icon className={`h-4 w-4 shrink-0 ${live ? 'animate-pulse' : ''}`} strokeWidth={2.5} aria-hidden />
      {label ?? text}
    </span>
  )
}
