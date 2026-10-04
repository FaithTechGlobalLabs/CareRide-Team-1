// Google Maps deep links. They open the Maps app on phones and the website elsewhere. No API key needed.

const BASE = 'https://www.google.com/maps/dir/?api=1'

// Seed and new partner locations can carry a stand-in until the real address is entered.
export function isRealAddress(address?: string): address is string {
  return !!address && address.trim().length >= 5 && !/address to confirm/i.test(address)
}

// Directions from wherever the phone is now
export function directionsTo(address: string, mode: 'driving' | 'transit' = 'driving'): string {
  return `${BASE}&destination=${encodeURIComponent(address)}&travelmode=${mode}`
}

export function directionsBetween(from: string, to: string, mode: 'driving' | 'transit' = 'driving'): string {
  return `${BASE}&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${mode}`
}
