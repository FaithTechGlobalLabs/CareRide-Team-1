import { BadgeCheck, Building2, Car, HeartHandshake, PiggyBank } from 'lucide-react'
import type { ReactNode } from 'react'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

// What everyone on CareRide has done together. Small, at the foot of a dashboard.
export function NetworkImpact() {
  const impact = useData(() => dataService.getImpact())
  if (!impact) return null

  const stats: { label: string; value: string; icon: ReactNode }[] = [
    { label: 'free rides', value: impact.ridesCompleted.toLocaleString(), icon: <Car className="h-4 w-4" /> },
    { label: 'in taxi fares saved', value: `$${impact.moneySaved.toLocaleString()}`, icon: <PiggyBank className="h-4 w-4" /> },
    { label: 'organizations', value: impact.organizations.toLocaleString(), icon: <Building2 className="h-4 w-4" /> },
    { label: 'verified drivers', value: impact.verifiedDrivers.toLocaleString(), icon: <BadgeCheck className="h-4 w-4" /> },
  ]

  return (
    <section aria-labelledby="network-title" className="rounded-2xl bg-gradient-to-r from-brand-50 via-white to-violet-50 p-5 ring-1 ring-slate-200/70">
      <h2 id="network-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-700">
        <HeartHandshake className="h-4 w-4" aria-hidden />
        Across CareRide
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200" aria-hidden>
              {s.icon}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block font-display text-lg font-black tabular-nums text-ink">{s.value}</span>
              <span className="block text-xs text-slate-500">{s.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
