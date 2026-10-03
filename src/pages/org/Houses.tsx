import { useState, type FormEvent } from 'react'
import { card, input, label, pageTitle, primaryButton } from '../../components/ui'
import { CITIES } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { dataService } from '../../services'

// Point A: the houses clients live in. Each house gets one shared account for booking.
export function Houses() {
  const { currentUser, refresh } = useApp()
  const orgId = currentUser?.orgId
  const houses = useData(() => dataService.listHouses(orgId), orgId)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(CITIES[0])
  const [phone, setPhone] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    await dataService.addHouse({ orgId, name, address, city, phone })
    setName('')
    setAddress('')
    setPhone('')
    refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className={pageTitle}>Houses</h1>
      <p>Each house has one shared account that staff use to book rides.</p>

      <div className="space-y-3">
        {houses?.map((h) => (
          <div key={h.id} className={card}>
            <p className="text-lg font-semibold">{h.name}</p>
            <p className="text-slate-600">
              {h.address}, {h.city} · <span className="whitespace-nowrap">{h.phone}</span>
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${card} max-w-lg space-y-4`}>
        <h2 className="text-xl font-bold">Add a house</h2>
        <div>
          <label className={label} htmlFor="house-name">Name</label>
          <input id="house-name" className={input} required placeholder="e.g. Belkin House" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="house-address">Address</label>
          <input id="house-address" className={input} required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="house-city">City</label>
          <select id="house-city" className={input} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="house-phone">Front desk phone</label>
          <input id="house-phone" type="tel" className={input} required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          Add house
        </button>
      </form>
    </div>
  )
}
