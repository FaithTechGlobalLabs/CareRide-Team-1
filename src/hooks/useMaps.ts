import { useEffect, useState, useSyncExternalStore } from 'react'
import { getDriverLocation, subscribeDriverLocation, fillLocationIfAllowed, type DriverLocation } from '../services/driverLocation'
import { getRoute, mapsAvailable, onMapsAvailabilityChange, placeKey, type Place, type TripRoute } from '../services/googleMaps'

// False with no API key, or once Google rejects the key
export function useMapsAvailable(): boolean {
  return useSyncExternalStore(onMapsAvailabilityChange, mapsAvailable)
}

// autoFill: if the driver already allowed location for this site, read it without a tap.
// Only on screens that use it, so an org admin's location is never read.
export function useDriverLocation(autoFill = false): DriverLocation {
  const location = useSyncExternalStore(subscribeDriverLocation, getDriverLocation)
  useEffect(() => {
    if (autoFill && mapsAvailable()) fillLocationIfAllowed()
  }, [autoFill])
  return location
}

export type RouteState =
  | { status: 'off' } // no key, or a missing address
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; route: TripRoute }

// Drive time (and, with withPath, the line to draw) between two places
export function useRoute(origin?: Place, destination?: Place, withPath = false): RouteState {
  const available = useMapsAvailable()
  const from = placeKey(origin)
  const to = placeKey(destination)
  const id = available && from && to ? `${from}|${to}|${withPath}` : undefined
  const [result, setResult] = useState<{ id: string; route: TripRoute | null }>()

  useEffect(() => {
    if (!id || !from || !to) return
    let live = true
    getRoute(from, to, withPath).then((route) => {
      if (live) setResult({ id, route })
    })
    return () => {
      live = false
    }
  }, [id, from, to, withPath])

  if (!id) return { status: 'off' }
  if (result?.id !== id) return { status: 'loading' }
  return result.route ? { status: 'ready', route: result.route } : { status: 'failed' }
}
