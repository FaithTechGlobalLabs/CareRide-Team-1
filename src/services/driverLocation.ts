// The driver's location, only after they tap "Use my location". Kept in memory for this tab, never saved or sent
// anywhere except Google, to work out drive time to a pickup.

import { roundLocation, type LatLng } from './googleMaps'

export type LocationStatus = 'off' | 'asking' | 'on' | 'denied' | 'unavailable'

export interface DriverLocation {
  status: LocationStatus
  coords?: LatLng
  at?: number // when the phone reported it, to tell the driver if it's old
}

let state: DriverLocation = { status: 'off' }
const listeners = new Set<() => void>()

function set(next: DriverLocation) {
  state = next
  listeners.forEach((l) => l())
}

export function getDriverLocation(): DriverLocation {
  return state
}

export function subscribeDriverLocation(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// fresh: skip the phone's cached position, for "Update"
export function requestDriverLocation(fresh = false) {
  if (!('geolocation' in navigator)) {
    set({ status: 'unavailable' })
    return
  }
  set({ ...state, status: 'asking' })
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      set({
        status: 'on',
        coords: roundLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        at: pos.timestamp,
      }),
    (err) => set({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: fresh ? 0 : 5 * 60_000 },
  )
}

// If the driver already allowed location for this site, fill it in without asking again
let checked = false
export function fillLocationIfAllowed() {
  if (checked || state.status !== 'off') return
  checked = true
  navigator.permissions
    ?.query({ name: 'geolocation' })
    .then((p) => {
      if (p.state === 'granted' && state.status === 'off') requestDriverLocation()
    })
    .catch(() => {})
}
