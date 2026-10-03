import { useState, type FormEvent } from 'react'
import { AddressPicker } from '../../components/form/AddressPicker'
import { TextField } from '../../components/form/TextField'
import { card, pageTitle, primaryButton } from '../../components/ui'
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
  const [city, setCity] = useState('')
  const [placeId, setPlaceId] = useState<string>()
  const [phone, setPhone] = useState('')
  const [addressError, setAddressError] = useState<string>()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    if (!placeId) {
      setAddressError(
        address.trim() ? 'Pick a matching address from the list.' : 'Search for the address and pick it from the list.',
      )
      return
    }
    await dataService.addHouse({ orgId, name, address, city, phone })
    setName('')
    setAddress('')
    setCity('')
    setPlaceId(undefined)
    setPhone('')
    setAddressError(undefined)
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
        <TextField
          id="house-name"
          label="Name"
          required
          placeholder="e.g. Belkin House"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AddressPicker
          id="house-address"
          label="Street address"
          value={address}
          selected={Boolean(placeId)}
          error={addressError}
          onQueryChange={(next) => {
            setAddress(next)
            setPlaceId(undefined)
            setCity('')
            setAddressError(undefined)
          }}
          onSelect={(place) => {
            setAddress(place.address)
            setCity(place.city)
            setPlaceId(place.id)
            setAddressError(undefined)
          }}
        />
        <TextField
          id="house-phone"
          label="Front desk phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          Add house
        </button>
      </form>
    </div>
  )
}
