import { formatDayTime } from '../logic/formatTime'
import { isNative } from './platform'

const KEY = 'careride:live-bundle'

export interface LiveBundle {
  sha: string
  receivedAt: string
}

export function bakedCommitSha(): string {
  const sha = import.meta.env.VITE_COMMIT_SHA
  return typeof sha === 'string' ? sha.trim() : ''
}

export function showBuildStamp(): boolean {
  return isNative || import.meta.env.DEV
}

function remember(sha: string, receivedAt: string): LiveBundle {
  const next = { sha, receivedAt }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private windows can block storage; the stamp still renders for this visit.
  }
  return next
}

export function rememberLiveBundle(): LiveBundle {
  const sha = bakedCommitSha()
  const now = new Date().toISOString()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const prev = JSON.parse(raw) as Partial<LiveBundle>
      if (prev.sha === sha && typeof prev.receivedAt === 'string' && prev.receivedAt) return { sha, receivedAt: prev.receivedAt }
    }
  } catch {
    // Corrupt or unreadable storage: treat this open as the first time we saw this SHA.
  }
  return remember(sha, now)
}

function capgoDownloadedAt(value: string): string | undefined {
  const ms = Date.parse(value)
  if (!Number.isFinite(ms) || ms < Date.parse('2000-01-01')) return undefined
  return new Date(ms).toISOString()
}

export async function loadLiveBundle(): Promise<LiveBundle> {
  const remembered = rememberLiveBundle()
  if (!isNative) return remembered
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
    const { bundle } = await CapacitorUpdater.current()
    if (bundle.id === 'builtin') return remembered
    const downloaded = capgoDownloadedAt(bundle.downloaded)
    if (!downloaded) return remembered
    return remember(remembered.sha, downloaded)
  } catch {
    return remembered
  }
}

export function receivedLabel(iso: string): string {
  return formatDayTime(iso)
}
