import { BellRing, Check, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useData } from '../hooks/useData'
import { passengersLabel } from '../logic/rideText'
import { dataService } from '../services'
import type { Ride } from '../types'
import { ghostButton, primaryButton, secondaryButton } from './ui'

interface Answered {
  offerId: string
  accepted: boolean
  error?: string
}

// Pops up on every page when a ride request reaches a transport provider's drivers, so the provider can answer for them.
// Drivers don't get this pop-up: their requests are front and centre on their own Rides page.
export function IncomingRequests() {
  const { currentUser, users, refresh } = useApp()
  const [later, setLater] = useState<string[]>([])
  const [answered, setAnswered] = useState<Answered>()

  const orgId = currentUser?.role === 'ORG_ADMIN' ? currentUser.orgId : undefined

  const offers = useData(async () => {
    const pending = orgId ? await dataService.listOffersForOrg(orgId) : []
    const rides = await Promise.all(pending.map((o) => dataService.getRide(o.rideId)))
    return pending.flatMap((offer, i) => (rides[i] ? [{ offer, ride: rides[i] }] : []))
  }, orgId)
  const houses = useData(() => dataService.listHouses()) ?? []
  const orgDrivers = useData(() => (orgId ? dataService.listDrivers(orgId) : Promise.resolve([])), orgId) ?? []

  const showing = (offers ?? [])
    .filter(({ offer }) => !later.includes(offer.id))
    .sort((a, b) => a.offer.sentAt.localeCompare(b.offer.sentAt))
  const next = showing[0]

  async function respond(offerId: string, accept: boolean) {
    try {
      await dataService.respondToOffer(offerId, accept)
      setAnswered({ offerId, accepted: accept })
    } catch (err) {
      setAnswered({ offerId, accepted: false, error: (err as Error).message })
    }
    refresh()
  }

  const confirmation = answered && (
    <div role="status" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            answered.error ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
          }`}
          aria-hidden
        >
          {answered.error ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {answered.error ?? (answered.accepted ? "Your driver has the ride. We've told the partner." : 'Request declined.')}
          </p>
          {answered.accepted && !answered.error && (
            <Link
              to="/org/bookings"
              className="text-sm font-semibold text-teal-700 underline underline-offset-2"
              onClick={() => setAnswered(undefined)}
            >
              See pickup details
            </Link>
          )}
        </div>
        <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close" onClick={() => setAnswered(undefined)}>
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  if (!next) return confirmation || null
  const { offer, ride } = next
  const house = houses.find((h) => h.id === ride.houseId)
  const from = ride.returnOfRideId ? undefined : house && `${house.name}, ${house.city}`
  const forDriver = orgId && users.find((u) => u.id === orgDrivers.find((d) => d.id === offer.driverId)?.userId)?.name

  return (
    <>
      {confirmation}
      <div
        role="alertdialog"
        aria-labelledby="incoming-title"
        className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-2xl shadow-teal-900/20"
      >
        <div className="flex items-center gap-2 bg-fresh-gradient px-5 py-3 text-white">
          <BellRing className="h-5 w-5 animate-pulse" aria-hidden />
          <h2 id="incoming-title" className="font-extrabold">
            New ride request{forDriver && ` for ${forDriver}`}
          </h2>
          {showing.length > 1 && <span className="ml-auto text-sm font-semibold">+{showing.length - 1} more</span>}
        </div>
        <div className="space-y-1 p-5">
          <p className="break-words text-lg font-semibold">
            {from ? `${from} → ` : ''}
            {ride.destinationName}
          </p>
          <p className="text-slate-600">{describePickup(ride)}</p>
          <p className="text-slate-600">
            {passengersLabel(ride.passengers)}
            {ride.needsWheelchair && ' · Wheelchair'}
            {ride.needsAssistance && ' · Needs help'}
          </p>
          <p className="pt-1 text-sm text-slate-500">
            Answer by {new Date(offer.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. The first
            driver to accept gets the ride.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button type="button" className={primaryButton} onClick={() => respond(offer.id, true)}>
              Accept
            </button>
            <button type="button" className={secondaryButton} onClick={() => respond(offer.id, false)}>
              Decline
            </button>
          </div>
          <button type="button" className={`${ghostButton} w-full`} onClick={() => setLater((l) => [...l, offer.id])}>
            Decide later
          </button>
        </div>
      </div>
    </>
  )
}

function describePickup(ride: Ride): string {
  if (ride.type === 'ON_DEMAND') return 'Pickup now'
  return `Pickup ${new Date(ride.pickupTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
}
