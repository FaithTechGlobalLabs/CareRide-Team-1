import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EmergencyBanner } from '../../components/EmergencyBanner'
import { input, label, pageTitle, primaryButton, secondaryButton } from '../../components/ui'
import { DEFAULT_PICKUP_INSTRUCTIONS, PURPOSE_LABELS } from '../../constants'
import { useApp } from '../../hooks/useApp'
import { useData } from '../../hooks/useData'
import { estimateFare } from '../../logic/estimateFare'
import { ridePath } from '../../logic/homeFor'
import { sortByPopularity } from '../../logic/popularDestinations'
import { dataService } from '../../services'
import type { RideType, TripPurpose } from '../../types'

const CUSTOM = 'custom'

// Default pickup time: two hours from now, formatted for a datetime-local input.
function inTwoHours(): string {
  const d = new Date(Date.now() + 2 * 3_600_000)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// One-way trip. With ?returnOf=<rideId>, books the trip back to the house instead.
// A house books for itself; an organization admin picks which of its houses the ride is for.
export function RequestRide() {
  const { currentUser, refresh } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnOf = params.get('returnOf') ?? ''
  const isOrg = currentUser?.role === 'ORG_ADMIN'

  const houses = useData(() => dataService.listHouses(currentUser?.orgId), currentUser?.orgId)
  const outbound = useData(() => (returnOf ? dataService.getRide(returnOf) : Promise.resolve(undefined)), returnOf)
  const [pickedHouseId, setPickedHouseId] = useState('')
  const houseId = outbound?.houseId ?? (isOrg ? pickedHouseId || houses?.[0]?.id : currentUser?.houseId) ?? ''
  const house = houses?.find((h) => h.id === houseId)
  const pastRides = useData(() => dataService.listRidesForHouse(houseId), houseId) ?? []
  const destinations = useData(() => dataService.listDestinations(currentUser?.orgId), currentUser?.orgId) ?? []
  const sorted = sortByPopularity(destinations, pastRides, houseId)

  const [type, setType] = useState<RideType>('SCHEDULED')
  const [purpose, setPurpose] = useState<TripPurpose>('MEDICAL')
  const [clientName, setClientName] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [destinationId, setDestinationId] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [pickupTime, setPickupTime] = useState(inTwoHours)
  const [pickupInstructions, setPickupInstructions] = useState(DEFAULT_PICKUP_INSTRUCTIONS)
  const [needsWheelchair, setNeedsWheelchair] = useState(false)
  const [needsAssistance, setNeedsAssistance] = useState(false)
  const [notes, setNotes] = useState('')
  const [destinationError, setDestinationError] = useState('')

  if (!houses || (returnOf && !outbound)) return null
  if (!house || !currentUser) {
    return isOrg ? (
      <p>
        Add a house first, so drivers know where to pick clients up.{' '}
        <Link to="/org/houses" className="font-semibold text-brand-700 underline underline-offset-2">
          Add a house
        </Link>
      </p>
    ) : (
      <p>This account isn't linked to a house.</p>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!house || !currentUser) return

    if (!outbound && !destinationId) {
      setDestinationError('Choose where the client is going.')
      return
    }

    const base = {
      type,
      orgId: house.orgId,
      houseId: house.id,
      requestedBy: currentUser.id,
      clientName: clientName.trim() || undefined,
      passengers,
      purpose,
      pickupTime: type === 'ON_DEMAND' ? new Date().toISOString() : new Date(pickupTime).toISOString(),
      needsWheelchair,
      needsAssistance,
      notes: notes || undefined,
      estimatedFareSaved: estimateFare(),
    }

    const saved = destinations.find((d) => d.id === destinationId)
    const to = saved
      ? { destinationId: saved.id, destinationName: saved.name, destinationAddress: saved.address }
      : { destinationName: customAddress, destinationAddress: customAddress }

    const ride = outbound
      ? await dataService.requestRide({
          ...base,
          pickupAddress: outbound.destinationAddress,
          pickupInstructions: pickupInstructions || undefined,
          destinationName: house.name,
          destinationAddress: house.address,
          returnOfRideId: outbound.id,
          preferredDriverId: outbound.driverId, // ask the same driver first
        })
      : await dataService.requestRide({
          ...base,
          pickupAddress: house.address,
          pickupInstructions: pickupInstructions || undefined,
          ...to,
        })

    refresh()
    navigate(ridePath(currentUser.role, ride.id))
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <h1 className={pageTitle}>{outbound ? 'Book the return trip' : 'Request a ride'}</h1>
      <EmergencyBanner />

      <fieldset>
        <legend className={label}>Reason for the trip</legend>
        <select className={input} value={purpose} onChange={(e) => setPurpose(e.target.value as TripPurpose)}>
          {(Object.keys(PURPOSE_LABELS) as TripPurpose[]).map((p) => (
            <option key={p} value={p}>
              {PURPOSE_LABELS[p]}
            </option>
          ))}
        </select>
      </fieldset>

      {outbound ? (
        <div>
          <span className={label}>Trip</span>
          <p>
            {outbound.destinationName} → {house.name}
          </p>
        </div>
      ) : (
        <>
          {isOrg && houses.length > 1 ? (
            <div>
              <label className={label} htmlFor="house">From</label>
              <select id="house" className={input} value={house.id} onChange={(e) => setPickedHouseId(e.target.value)}>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}, {h.city}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <span className={label}>From</span>
              <p>{house.name}</p>
            </div>
          )}
          <fieldset>
            <legend className={label}>To</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Destination">
              {sorted.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={destinationId === d.id}
                  className={destinationId === d.id ? primaryButton : secondaryButton}
                  onClick={() => {
                    setDestinationId(d.id)
                    setDestinationError('')
                  }}
                >
                  {d.name}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={destinationId === CUSTOM}
                className={destinationId === CUSTOM ? primaryButton : secondaryButton}
                onClick={() => {
                  setDestinationId(CUSTOM)
                  setDestinationError('')
                }}
              >
                Somewhere else
              </button>
            </div>
            {destinationError && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                {destinationError}
              </p>
            )}
          </fieldset>
          {destinationId === CUSTOM && (
            <div>
              <label className={label} htmlFor="custom-address">Address</label>
              <input id="custom-address" className={input} required value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
            </div>
          )}
        </>
      )}

      <fieldset>
        <legend className={label}>When</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="when"
            className="h-5 w-5 shrink-0 accent-brand-600"
            checked={type === 'SCHEDULED'}
            onChange={() => setType('SCHEDULED')}
          />
          Scheduled
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="when"
            className="h-5 w-5 shrink-0 accent-brand-600"
            checked={type === 'ON_DEMAND'}
            onChange={() => setType('ON_DEMAND')}
          />
          On Demand
        </label>
        {type === 'SCHEDULED' && (
          <input
            type="datetime-local"
            aria-label="Pickup time"
            className={`${input} mt-2`}
            required
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
          />
        )}
      </fieldset>

      <div>
        <label className={label} htmlFor="instructions">Where the driver meets the client</label>
        <input id="instructions" className={input} value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} />
      </div>

      <div>
        <label className={label} htmlFor="client-name">Name</label>
        <input id="client-name" className={input} required value={clientName} onChange={(e) => setClientName(e.target.value)} />
      </div>

      <div>
        <label className={label} htmlFor="passengers">People riding</label>
        <input id="passengers" type="number" min={1} max={12} className={input} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} />
      </div>

      <fieldset>
        <legend className={label}>Travel needs</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-brand-600" checked={needsWheelchair} onChange={(e) => setNeedsWheelchair(e.target.checked)} />
          Wheelchair accessible vehicle
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-brand-600" checked={needsAssistance} onChange={(e) => setNeedsAssistance(e.target.checked)} />
          Needs help getting in and out
        </label>
      </fieldset>

      <div>
        <label className={label} htmlFor="notes">Notes for the driver (optional)</label>
        <input id="notes" className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* TODO: suggest group rides (logic/groupRides.ts) before submitting */}

      <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
        {outbound ? 'Book return trip' : 'Request ride'}
      </button>
    </form>
  )
}
