import { useData } from '../hooks/useData'
import { dataService } from '../services'
import { card } from './ui'

export function ImpactCounter() {
  const impact = useData(() => dataService.getImpact())
  if (!impact) return null

  const stats = [
    { label: 'Free rides completed', value: impact.ridesCompleted },
    { label: 'Taxi fares saved', value: `$${impact.moneySaved}` },
    { label: 'Organizations', value: impact.organizations },
    { label: 'Verified drivers', value: impact.verifiedDrivers },
  ]

  return (
    <section aria-label="Impact" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className={card}>
          <div className="text-3xl font-bold">{s.value}</div>
          <div className="text-slate-600">{s.label}</div>
        </div>
      ))}
    </section>
  )
}
