// Which pop-up notices this person has dismissed, so they don't come back after a reload.
// Kept in this browser only: losing it just means a notice shows once more.

function key(userId: string, kind: string): string {
  return `careride-seen-${kind}:${userId}`
}

export function readSeen(userId: string, kind: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key(userId, kind)) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function markSeen(userId: string, kind: string, id: string): string[] {
  const next = [...readSeen(userId, kind), id]
  try {
    localStorage.setItem(key(userId, kind), JSON.stringify(next))
  } catch {
    // Ignore: the notice may show again after a reload
  }
  return next
}
