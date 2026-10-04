// Shared checks for form fields. Each form shows its own wording around them.

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Ten digits or more, so "604-555-0123", "(604) 555 0123" and "+1 604 555 0123" all pass
export function isPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10
}

// Longest a typed name or note can be, so a stray paste can't fill the screen
export const MAX_NAME = 80
export const MAX_NOTE = 500

export function tooLong(value: string, max: number): string | undefined {
  return value.trim().length > max ? `Keep this under ${max} characters.` : undefined
}
