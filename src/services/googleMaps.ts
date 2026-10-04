// Google Maps: drive times and route lines. Optional.
// With no VITE_GOOGLE_MAPS_API_KEY nothing here loads, and screens keep the plain Google Maps links.
// Setup: README.md, "Google Maps (optional)".

import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()

// Advanced markers need a map ID. Google's demo ID works until you make your own.
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || 'DEMO_MAP_ID'

export interface LatLng {
  lat: number
  lng: number
}

// An address, or a point from the phone's location
export type Place = string | LatLng

export interface TripRoute {
  minutes: number
  km: number
  path?: LatLng[] // only when asked for, to draw the map
}

// ---- Availability: off with no key, and switches off for good if Google rejects the key

let failed = false
const listeners = new Set<() => void>()

function fail() {
  if (failed) return
  failed = true
  listeners.forEach((l) => l())
}

export function mapsAvailable(): boolean {
  return !!KEY && !failed
}

export function onMapsAvailabilityChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let configured = false

export async function loadMapsLibrary<L extends keyof google.maps.ImportLibraryMap>(
  name: L,
): Promise<google.maps.ImportLibraryMap[L]> {
  if (!mapsAvailable()) throw new Error('Google Maps is off.')
  if (!configured) {
    configured = true
    // Called by Google when the key is missing, restricted, or billing is off
    ;(window as Window & { gm_authFailure?: () => void }).gm_authFailure = fail
    setOptions({ key: KEY, v: 'weekly', region: 'CA', language: 'en' })
  }
  try {
    return await importLibrary(name)
  } catch (err) {
    fail()
    throw err
  }
}

// ---- Routes. One request per origin and destination per page load, however often the screen refreshes.

// About 100 m, so a phone's location wobble doesn't ask Google again
export function roundLocation(p: LatLng): LatLng {
  return { lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 }
}

const COORDS = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/

// Places as plain strings, so React effects and the cache can compare them
export function placeKey(place?: Place): string | undefined {
  if (!place) return undefined
  if (typeof place === 'string') return place.trim() || undefined
  const p = roundLocation(place)
  return `${p.lat},${p.lng}`
}

function fromKey(key: string): string | LatLng {
  const m = COORDS.exec(key)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : key
}

const cache = new Map<string, Promise<TripRoute | null>>()

// Resolves to null when there's no route or Google can't answer. Failures stay cached too, so a refresh doesn't retry.
export function getRoute(origin: string, destination: string, withPath = false): Promise<TripRoute | null> {
  const id = `${origin}|${destination}|${withPath ? 'path' : 'time'}`
  // A drawn route already has the time
  const known = cache.get(id) ?? (withPath ? undefined : cache.get(`${origin}|${destination}|path`))
  if (known) return known

  const request = (async () => {
    try {
      const { Route } = await loadMapsLibrary('routes')
      const { routes } = await Route.computeRoutes({
        origin: fromKey(origin),
        destination: fromKey(destination),
        travelMode: 'DRIVING',
        region: 'ca',
        fields: withPath ? ['durationMillis', 'distanceMeters', 'path'] : ['durationMillis', 'distanceMeters'],
      })
      const route = routes?.[0]
      if (!route?.durationMillis || route.distanceMeters == null) return null
      return {
        minutes: Math.max(1, Math.round(route.durationMillis / 60_000)),
        km: Math.round(route.distanceMeters / 100) / 10,
        path: withPath ? route.path?.map((p) => ({ lat: p.lat, lng: p.lng })) : undefined,
      }
    } catch (err) {
      console.warn('Google Maps route failed', err)
      // A rejected key or a disabled Routes API won't fix itself this session, so stop asking
      if (/API key|API_KEY|PERMISSION_DENIED|REQUEST_DENIED|not authorized/i.test(String(err))) fail()
      return null
    }
  })()
  cache.set(id, request)
  return request
}

export function formatDriveTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
