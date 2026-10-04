export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

const UPSTREAM = 'https://edwaittimes.ca/api/wait-times'

interface WaitTime {
  waitTimeMinutes?: number | null
  createdAt?: string
}

interface Location {
  name?: string
  address?: string
  type?: string
  showWaitTimes?: boolean
  waitTime?: WaitTime
}

function slim(locations: Location[]) {
  return locations.flatMap((loc) => {
    const minutes = loc.waitTime?.waitTimeMinutes
    if (!loc.showWaitTimes || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0 || !loc.name) return []
    return [
      {
        name: loc.name,
        address: loc.address ?? '',
        minutes,
        kind: loc.type === 'upcc' ? 'upcc' : 'ed',
        updatedAt: loc.waitTime?.createdAt,
      },
    ]
  })
}

async function waitTimes(): Promise<Response> {
  const upstream = await fetch(UPSTREAM, {
    headers: { Accept: 'application/json' },
    // Cloudflare-only: cache at the edge. Ignored by other runtimes.
    ...({ cf: { cacheTtl: 120, cacheEverything: true } } as object),
  })
  if (!upstream.ok) return Response.json({ error: 'Wait times are unavailable.' }, { status: 502 })
  const data: unknown = await upstream.json()
  const locations = Array.isArray(data) ? slim(data as Location[]) : []
  return Response.json(
    { source: UPSTREAM, locations },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/wait-times') {
      try {
        return await waitTimes()
      } catch {
        return Response.json({ error: 'Wait times are unavailable.' }, { status: 502 })
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return env.ASSETS.fetch(request)
  },
}
