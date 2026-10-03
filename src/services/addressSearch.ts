// Street-address lookup via Photon (OpenStreetMap). No API key.
// Biased to Metro Vancouver so house sign-up finds a real pickup point.

const PHOTON_URL = 'https://photon.komoot.io/api/'
const VANCOUVER = { lat: 49.2827, lon: -123.1207 }
const MIN_QUERY = 3

export interface AddressSuggestion {
  id: string
  label: string
  name?: string
  address: string
  city: string
}

interface PhotonProperties {
  osm_type?: string
  osm_id?: number
  name?: string
  housenumber?: string
  street?: string
  postcode?: string
  city?: string
  town?: string
  locality?: string
  district?: string
  state?: string
  countrycode?: string
  type?: string
}

interface PhotonFeature {
  properties: PhotonProperties
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

function streetLine(p: PhotonProperties): string | undefined {
  const numbered = [p.housenumber, p.street].filter(Boolean).join(' ').trim()
  if (numbered) return numbered
  return undefined
}

function cityOf(p: PhotonProperties): string | undefined {
  const raw = p.city || p.town
  if (!raw) return undefined
  const lower = raw.toLowerCase()
  if (lower.includes('vancouver')) return 'Vancouver'
  if (lower.includes('richmond')) return 'Richmond'
  return raw
}

function isCanadianStreet(p: PhotonProperties): boolean {
  const country = p.countrycode?.toUpperCase()
  if (country && country !== 'CA') return false
  return Boolean(streetLine(p) && cityOf(p))
}

function toSuggestion(feature: PhotonFeature): AddressSuggestion | undefined {
  const p = feature.properties
  if (!isCanadianStreet(p)) return undefined
  const address = streetLine(p)!
  const city = cityOf(p)!
  const postcode = p.postcode?.trim()
  const label = [address, city, postcode].filter(Boolean).join(', ')
  return {
    id: `${p.osm_type ?? 'place'}:${p.osm_id ?? label}`,
    label,
    name: p.name && p.name.toLowerCase() !== address.toLowerCase() ? p.name : undefined,
    address,
    city,
  }
}

export function canSearchAddress(query: string): boolean {
  return query.trim().length >= MIN_QUERY
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const q = query.trim()
  if (!canSearchAddress(q)) return []

  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', q)
  url.searchParams.set('lat', String(VANCOUVER.lat))
  url.searchParams.set('lon', String(VANCOUVER.lon))
  url.searchParams.set('limit', '8')
  url.searchParams.set('lang', 'en')

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Address search is unavailable right now.')

  const data = (await res.json()) as PhotonResponse
  const seen = new Set<string>()
  const results: AddressSuggestion[] = []
  for (const feature of data.features ?? []) {
    const suggestion = toSuggestion(feature)
    if (!suggestion || seen.has(suggestion.id)) continue
    seen.add(suggestion.id)
    results.push(suggestion)
  }
  return results
}
