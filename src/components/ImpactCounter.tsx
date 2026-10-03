import { BadgeCheck, Building2, Car, PiggyBank } from 'lucide-react'
import type { ReactNode } from 'react'
import { useData } from '../hooks/useData'
import { dataService } from '../services'
import { card, tones, type Tone } from './ui'

export function ImpactCounter() {
  const impact = useData(() => dataService.getImpact())
  if (!impact) return null

  const stats: { label: string; value: string | number; icon: ReactNode; tone: Tone }[] = [
    { label: 'Free rides completed', value: impact.ridesCompleted, icon: <Car className="h-5 w-5" />, tone: 'brand' },
    { label: 'Taxi fares saved', value: `$${impact.moneySaved}`, icon: <PiggyBank className="h-5 w-5" />, tone: 'teal' },
    { label: 'Organizations', value: impact.organizations, icon: <Building2 className="h-5 w-5" />, tone: 'violet' },
    { label: 'Verified drivers', value: impact.verifiedDrivers, icon: <BadgeCheck className="h-5 w-5" />, tone: 'coral' },
  ]

  return (
    <section aria-label="Impact" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className={card}>
          <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones[s.tone].tile}`} aria-hidden>
            {s.icon}
          </span>
          <div className={`font-display text-3xl font-black ${tones[s.tone].text}`}>{s.value}</div>
          <div className="text-slate-600">{s.label}</div>
        </div>
      ))}
    </section>
  )
}
