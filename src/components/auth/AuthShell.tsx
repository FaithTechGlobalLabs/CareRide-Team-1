import type { ReactNode } from 'react'
import { Logo } from '../Logo'

interface Props {
  aside?: ReactNode // e.g. "Already have an account? Sign in"
  children: ReactNode
  width?: 'md' | 'xl' | 'wide'
}

const WIDTHS = { md: 'max-w-md', xl: 'max-w-2xl', wide: 'max-w-5xl' }

// Calm, focused frame for signing in and registering.
export function AuthShell({ aside, children, width = 'md' }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
      <div className="relative z-20 h-1 bg-spectrum" aria-hidden />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[30rem] w-[30rem] rounded-full bg-aqua-300/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-24 h-[22rem] w-[22rem] rounded-full bg-violet-200/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[22rem] w-[22rem] rounded-full bg-coral-200/35 blur-3xl" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo />
        {aside && <div className="text-sm text-slate-600">{aside}</div>}
      </header>

      <main className={`relative z-10 mx-auto px-4 pb-16 pt-4 sm:px-6 ${WIDTHS[width]}`}>{children}</main>
    </div>
  )
}
