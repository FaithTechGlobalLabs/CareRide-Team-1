import { useState, type FormEvent } from 'react'
import { card, input, label, pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

export function Destinations() {
  const { refresh } = useApp()
  const destinations = useData(() => dataService.listDestinations())

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await dataService.saveDestination({ name, address, city, notes: notes || undefined })
    setName('')
    setAddress('')
    setCity('')
    setNotes('')
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Saved destinations</h1>

      <div className="space-y-3">
        {destinations?.map((d) => (
          <div key={d.id} className={card}>
            <p className="text-lg font-semibold">{d.name}</p>
            <p className="text-slate-600">{d.address}</p>
            {d.notes && <p className="text-slate-600">{d.notes}</p>}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${card} max-w-lg space-y-4`}>
        <h2 className="text-xl font-bold">Add a destination</h2>
        <div>
          <label className={label} htmlFor="dest-name">Name</label>
          <input id="dest-name" className={input} required placeholder="e.g. Vancouver General Hospital" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="dest-address">Address</label>
          <input id="dest-address" className={input} required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="dest-city">City</label>
          <input id="dest-city" className={input} required value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="dest-notes">Notes for drivers (optional)</label>
          <input id="dest-notes" className={input} placeholder="e.g. Use the main entrance" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="submit" className={primaryButton}>Save destination</button>
      </form>
    </div>
  )
}
