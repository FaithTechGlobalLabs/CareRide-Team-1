import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmergencyBanner } from '../../components/EmergencyBanner'
import { input, label, pageTitle, primaryButton } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { estimateFare } from '../../logic/estimateFare'
import { dataService } from '../../services'
import type { RideType } from '../../types'

const CUSTOM = 'custom'

export function RequestRide() {
  const { currentUser, refresh } = useApp()
  const navigate = useNavigate()
  const facilities = useData(() => dataService.listFacilities())
  const destinations = useData(() => dataService.listDestinations())
  const facility = facilities?.find((f) => f.id === currentUser?.facilityId)

  const [type, setType] = useState<RideType>('ESSENTIAL')
  const [clientName, setClientName] = useState('')
  const [clientRef, setClientRef] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [needsWheelchair, setNeedsWheelchair] = useState(false)
  const [needsAssistance, setNeedsAssistance] = useState(false)
  const [notes, setNotes] = useState('')
  const [returnTrip, setReturnTrip] = useState(false)
  const [returnTime, setReturnTime] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentUser || !facility) return

    const saved = destinations?.find((d) => d.id === destinationId)
    const destinationAddress = saved?.address ?? customAddress
    const shared = {
      type,
      orgId: facility.orgId,
      facilityId: facility.id,
      requestedBy: currentUser.id,
      clientName,
      clientRef,
      needsWheelchair,
      needsAssistance,
      notes: notes || undefined,
      estimatedFareSaved: estimateFare(),
    }

    const outbound = await dataService.requestRide({
      ...shared,
      pickupAddress: facility.address,
      destinationId: saved?.id,
      destinationAddress,
      pickupTime: new Date(pickupTime).toISOString(),
    })

    if (returnTrip && returnTime) {
      await dataService.requestRide({
        ...shared,
        type: 'SCHEDULED',
        pickupAddress: destinationAddress,
        destinationAddress: facility.address,
        pickupTime: new Date(returnTime).toISOString(),
        returnOfRideId: outbound.id,
      })
    }

    refresh()
    navigate(`/staff/ride/${outbound.id}`)
  }

  if (!facility) return <p>Your account isn't linked to a facility yet.</p>

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <h1 className={pageTitle}>Request a ride</h1>
      <EmergencyBanner />

      <fieldset>
        <legend className={label}>When is it needed?</legend>
        <label className="flex items-center gap-2">
          <input type="radio" checked={type === 'ESSENTIAL'} onChange={() => setType('ESSENTIAL')} />
          <span>
            <strong>Essential</strong>: today, within a few hours
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={type === 'SCHEDULED'} onChange={() => setType('SCHEDULED')} />
          <span>
            <strong>Scheduled</strong>: booked ahead
          </span>
        </label>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="client-name">Client first name</label>
          <input id="client-name" className={input} required value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="client-ref">Client reference</label>
          <input id="client-ref" className={input} required placeholder="e.g. C-104" value={clientRef} onChange={(e) => setClientRef(e.target.value)} />
        </div>
      </div>

      <div>
        <span className={label}>Pickup</span>
        <p>
          {facility.name}, {facility.address}
        </p>
      </div>

      <div>
        <label className={label} htmlFor="destination">Destination</label>
        <select id="destination" className={input} required value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
          <option value="" disabled>
            Choose a destination
          </option>
          {destinations?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          <option value={CUSTOM}>Somewhere else…</option>
        </select>
      </div>
      {destinationId === CUSTOM && (
        <div>
          <label className={label} htmlFor="custom-address">Address</label>
          <input id="custom-address" className={input} required value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
        </div>
      )}

      <div>
        <label className={label} htmlFor="pickup-time">Pickup time</label>
        <input id="pickup-time" type="datetime-local" className={input} required value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
      </div>

      <fieldset>
        <legend className={label}>Needs</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={needsWheelchair} onChange={(e) => setNeedsWheelchair(e.target.checked)} />
          Wheelchair accessible vehicle
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={needsAssistance} onChange={(e) => setNeedsAssistance(e.target.checked)} />
          Needs help getting in and out
        </label>
      </fieldset>

      <div>
        <label className={label} htmlFor="notes">Notes for the driver (optional)</label>
        <input id="notes" className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={returnTrip} onChange={(e) => setReturnTrip(e.target.checked)} />
        Also book a return trip
      </label>
      {returnTrip && (
        <div>
          <label className={label} htmlFor="return-time">Return pickup time</label>
          <input id="return-time" type="datetime-local" className={input} required value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
        </div>
      )}

      {/* TODO: suggest group rides (logic/groupRides.ts) before submitting */}

      <button type="submit" className={primaryButton}>
        Request ride
      </button>
    </form>
  )
}
