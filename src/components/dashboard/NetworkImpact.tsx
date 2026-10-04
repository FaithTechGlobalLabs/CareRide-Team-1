import { BadgeCheck, Building2, Car, HeartHandshake, PiggyBank } from 'lucide-react'
import type { ReactNode } from 'react'
import { useData } from '../../hooks/useData'
import { faresSavedFor, formatDollars } from '../../logic/estimateFare'
import { dataService } from '../../services'

// What everyone on CareRide has done together. Small, at the foot of a dashboard.
export function NetworkImpact() {
  const impact = useData(() => dataService.getImpact())
  if (!impact) return null

  const stats: { label: string; value: string; icon: ReactNode }[] = [
    { label: 'free rides', value: impact.ridesCompleted.toLocaleString(), icon: <Car className="h-4 w-4" /> },
    { label: 'in bus fares saved', value: formatDollars(faresSavedFor(impact.ridesCompleted)), icon: <PiggyBank className="h-4 w-4" /> },
    { label: 'organizations', value: impact.organizations.toLocaleString(), icon: <Building2 className="h-4 w-4" /> },
    { label: 'verified drivers', value: impact.verifiedDrivers.toLocaleString(), icon: <BadgeCheck className="h-4 w-4" /> },
  ]

  return (
    <section aria-labelledby="network-title" className="border-t border-slate-200 pt-5">
      <h2 id="network-title" className="flex items-center gap-2 font-sans text-sm font-bold text-slate-600">
        <HeartHandshake className="h-4 w-4" aria-hidden />
        Across CareRide
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="shrink-0 text-brand-600" aria-hidden>
              {s.icon}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block font-display text-lg font-black tabular-nums text-ink">{s.value}</span>
              <span className="block text-sm text-slate-500">{s.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
