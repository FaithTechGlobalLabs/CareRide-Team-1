import { parseWaitTimes, type HospitalWait } from '../logic/hospitalWaitTimes'

const UPSTREAM = 'https://edwaittimes.ca/api/wait-times'
const LOCAL = '/api/wait-times'
const FRESH_MS = 2 * 60_000
const RETRY_MS = 30_000

let cache: { at: number; ttl: number; waits: HospitalWait[] } | undefined
let inflight: Promise<HospitalWait[]> | undefined

async function fromUrl(url: string): Promise<HospitalWait[] | undefined> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return undefined
    const waits = parseWaitTimes(await res.json())
    return waits.length ? waits : undefined
  } catch {
    return undefined
  }
}

async function fetchWaits(): Promise<HospitalWait[]> {
  return (await fromUrl(LOCAL)) ?? (await fromUrl(UPSTREAM)) ?? []
}

// Cached so the booking form doesn't refetch on every keystroke. Empty results retry sooner.
export function loadHospitalWaitTimes(): Promise<HospitalWait[]> {
  if (cache && Date.now() - cache.at < cache.ttl) return Promise.resolve(cache.waits)
  if (inflight) return inflight
  inflight = fetchWaits()
    .then((waits) => {
      cache = { at: Date.now(), ttl: waits.length ? FRESH_MS : RETRY_MS, waits }
      return waits
    })
    .finally(() => {
      inflight = undefined
    })
  return inflight
}
