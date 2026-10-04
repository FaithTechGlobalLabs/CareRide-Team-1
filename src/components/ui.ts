import type { UserRole } from '../types'

// Shared Tailwind class names. Big targets, clear focus, readable text throughout.
export const card =
  'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]'

export const button =
  'inline-flex min-h-12 select-none items-center whitespace-nowrap justify-center gap-2 rounded-xl px-5 text-base font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'
export const primaryButton = `${button} bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-md shadow-brand-600/25 hover:from-brand-700 hover:to-violet-700 hover:shadow-lg hover:shadow-violet-600/25 focus-visible:ring-brand-200`
export const secondaryButton = `${button} border border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-brand-100`
export const ghostButton = `${button} text-slate-700 hover:bg-slate-100 hover:text-ink focus-visible:ring-brand-100`
export const dangerButton = `${button} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200`
export const dangerOutlineButton = `${button} border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 focus-visible:ring-red-100`

export const input =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-ink placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-100'
export const label = 'mb-1.5 block text-sm font-semibold text-ink'
export const hint = 'mt-1.5 text-sm text-slate-500'
export const pageTitle = 'mb-6 font-display text-3xl font-extrabold tracking-tight text-ink'

// Accent colours that sit beside the brand blue. Each role and section picks one so screens feel distinct.
export type Tone = 'brand' | 'violet' | 'coral' | 'teal' | 'amber'

export const tones: Record<Tone, { tile: string; solid: string; text: string; border: string; glow: string }> = {
  brand: {
    tile: 'bg-brand-50 text-brand-600',
    solid: 'bg-brand-gradient text-white',
    text: 'text-brand-600',
    border: 'hover:border-brand-300',
    glow: 'shadow-brand-500/25',
  },
  violet: {
    tile: 'bg-violet-50 text-violet-600',
    solid: 'bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white',
    text: 'text-violet-600',
    border: 'hover:border-violet-300',
    glow: 'shadow-violet-500/25',
  },
  coral: {
    tile: 'bg-coral-50 text-coral-600',
    solid: 'bg-warm-gradient text-white',
    text: 'text-coral-600',
    border: 'hover:border-coral-300',
    glow: 'shadow-coral-500/25',
  },
  teal: {
    tile: 'bg-teal-50 text-teal-600',
    solid: 'bg-fresh-gradient text-white',
    text: 'text-teal-600',
    border: 'hover:border-teal-300',
    glow: 'shadow-teal-500/25',
  },
  amber: {
    tile: 'bg-amber-50 text-amber-600',
    solid: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
    text: 'text-amber-600',
    border: 'hover:border-amber-300',
    glow: 'shadow-amber-500/25',
  },
}

export const ROLE_TONE: Record<UserRole, Tone> = {
  PLATFORM_ADMIN: 'brand',
  ORG_ADMIN: 'amber',
  PARTNER: 'violet',
  DRIVER: 'teal',
}
