// Live emergency and urgent-care waits from Vancouver Coastal Health (edwaittimes.ca).
// Staff see them when booking a ride so they can pick a hospital with eyes open.
// Times are a snapshot of now, not a prediction for a later appointment.

export type WaitKind = 'ed' | 'upcc'

export interface HospitalWait {
  name: string
  address: string
  minutes: number
  kind: WaitKind
  updatedAt?: string
}

interface SlimLocation {
  name?: string
  address?: string
  minutes?: number
  kind?: string
  updatedAt?: string
}

interface UpstreamLocation {
  name?: string
  address?: string
  type?: string
  showWaitTimes?: boolean
  waitTime?: { waitTimeMinutes?: number | null; createdAt?: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/\b(hwy)\b/g, 'highway')
    .replace(/\b(ave)\b/g, 'avenue')
    .replace(/\b(dr)\b/g, 'drive')
    .replace(/\b(rd)\b/g, 'road')
    .replace(/\b(blvd)\b/g, 'boulevard')
    .replace(/\b(st)\b/g, 'street')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// House number + first street word, so 1145 Commercial Dr matches 1145 Commercial Drive.
function streetKey(address: string): string | undefined {
  const folded = fold(address)
    .replace(/\b(unit|suite|#)\s*\w+\b/g, ' ')
    .replace(/\b(west|east|north|south|w|e|n|s)\b/g, ' ')
    .replace(/\b(street|avenue|road|drive|highway|boulevard|way|place|crescent|court)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const match = folded.match(/(\d{3,5})\s+(\S+)/)
  return match ? `${match[1]} ${match[2]}` : undefined
}

function namesMatch(a: string, b: string): boolean {
  const left = fold(a)
  const right = fold(b)
  if (!left || !right) return false
  if (left === right) return true
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left]
  // "Richmond Hospital" must not match "Richmond City Centre Urgent and Primary Care Centre"
  if (shorter.split(' ').length < 3) return false
  return longer.startsWith(`${shorter} `)
}

function fromSlim(row: SlimLocation): HospitalWait | undefined {
  if (!row.name || typeof row.minutes !== 'number' || !Number.isFinite(row.minutes) || row.minutes < 0) return undefined
  return {
    name: row.name,
    address: row.address ?? '',
    minutes: row.minutes,
    kind: row.kind === 'upcc' ? 'upcc' : 'ed',
    updatedAt: row.updatedAt,
  }
}

function fromUpstream(row: UpstreamLocation): HospitalWait | undefined {
  const minutes = row.waitTime?.waitTimeMinutes
  if (!row.showWaitTimes || !row.name || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return undefined
  return {
    name: row.name,
    address: row.address ?? '',
    minutes,
    kind: row.type === 'upcc' ? 'upcc' : 'ed',
    updatedAt: row.waitTime?.createdAt,
  }
}

function readList(data: unknown): unknown[] | undefined {
  if (Array.isArray(data)) return data
  if (isRecord(data) && Array.isArray(data.locations)) return data.locations
  return undefined
}

export function parseWaitTimes(data: unknown): HospitalWait[] {
  const rows = readList(data)
  if (!rows) return []
  const seen = new Set<string>()
  const waits: HospitalWait[] = []
  for (const row of rows) {
    if (!isRecord(row)) continue
    const wait = 'minutes' in row ? fromSlim(row) : fromUpstream(row)
    if (!wait) continue
    const key = fold(wait.name)
    if (seen.has(key)) continue
    seen.add(key)
    waits.push(wait)
  }
  return waits
}

export function matchWaitTime(name: string, address: string | undefined, waits: HospitalWait[]): HospitalWait | undefined {
  const byName = waits.find((wait) => namesMatch(name, wait.name))
  if (byName) return byName
  const key = address ? streetKey(address) : undefined
  if (!key) return undefined
  return waits.find((wait) => streetKey(wait.address) === key)
}

export function formatWaitMinutes(minutes: number): string {
  if (minutes < 60) return `about ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return hours === 1 ? 'about 1 hour' : `about ${hours} hours`
  return `about ${hours}h ${rest}m`
}

export function waitNote(wait: HospitalWait): string {
  const time = formatWaitMinutes(wait.minutes)
  return wait.kind === 'ed' ? `Current ER wait ${time}` : `Current wait ${time}`
}

export function waitSummary(wait: HospitalWait): string {
  return `${formatWaitMinutes(wait.minutes)} to be seen right now`
}
