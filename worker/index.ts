export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

interface OtaLatest {
  version: string
  checksum: string
  file: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      ...cors,
      'Cache-Control': 'no-store',
    },
  })
}

async function loadLatest(request: Request, env: Env): Promise<OtaLatest | null> {
  const latestRes = await env.ASSETS.fetch(new Request(new URL('/ota/latest.json', request.url)))
  if (!latestRes.ok) return null
  try {
    const latest = (await latestRes.json()) as Partial<OtaLatest>
    if (!latest.version || !latest.checksum || !latest.file) return null
    return { version: latest.version, checksum: latest.checksum, file: latest.file }
  } catch {
    return null
  }
}

function zipUrl(request: Request, latest: OtaLatest): string {
  return new URL(`/ota/${latest.file}`, request.url).href
}

async function ota(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  const latest = await loadLatest(request, env)
  if (!latest) {
    return json({ kind: 'up_to_date', message: 'No OTA bundle published', error: 'no_bundle' })
  }

  if (request.method === 'GET') {
    return json({ version: latest.version, url: zipUrl(request, latest), checksum: latest.checksum })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let versionName = ''
  try {
    const body = (await request.json()) as { version_name?: unknown }
    if (typeof body.version_name === 'string') versionName = body.version_name
  } catch {
    versionName = ''
  }

  if (versionName === latest.version) {
    return json({
      kind: 'up_to_date',
      message: 'No new version available',
      error: 'no_new',
      version: '',
      url: '',
    })
  }

  return json({
    version: latest.version,
    url: zipUrl(request, latest),
    checksum: latest.checksum,
  })
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

    if (url.pathname === '/api/ota') {
      return ota(request, env)
    }

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

    const asset = await env.ASSETS.fetch(request)
    if (url.pathname.startsWith('/ota/') && asset.ok) {
      const headers = new Headers(asset.headers)
      headers.set(
        'Cache-Control',
        url.pathname.endsWith('.json') ? 'no-store' : 'public, max-age=31536000, immutable',
      )
      return new Response(asset.body, { status: asset.status, headers })
    }

    return asset
  },
}
