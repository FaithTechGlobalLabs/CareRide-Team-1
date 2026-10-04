import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { ghostButton, primaryButton } from '../ui'

export interface PageSection {
  id: string
  label: string
}

interface Props {
  sections: PageSection[]
  active?: string // the section on screen, highlighted in the nav
}

// Landing header: jump links to each section, plus sign in and sign up. Only signed-out visitors see it.
export function LandingHeader({ sections, active }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const close = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="h-1 bg-brand-600" aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="On this page">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? 'true' : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                active === s.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/signin" className={`${ghostButton} min-h-11`}>
            Sign in
          </Link>
          {/* The shared button class sets inline-flex, so a wrapper does the hiding on phones. */}
          <span className="hidden sm:block">
            <Link to="/register" className={`${primaryButton} min-h-11`}>
              Get started
            </Link>
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="landing-menu" className="animate-fade-up border-t border-slate-200 bg-white px-4 pb-5 pt-2 [animation-duration:250ms] md:hidden">
          <nav aria-label="On this page" className="flex flex-col">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={close}
                className="flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-semibold text-ink hover:bg-slate-50"
              >
                {s.label}
                <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
              </a>
            ))}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-4">
            <Link to="/register" onClick={close} className={`${primaryButton} w-full`}>
              Get started <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
