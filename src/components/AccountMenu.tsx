import { ChevronDown, LogOut, Repeat, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { ROLE_LABELS } from '../logic/homeFor'
import { BuildStamp } from '../native/BuildStamp'
import { DeleteMyAccount } from './DeleteMyAccount'
import { ROLE_TONE, tones } from './ui'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function AccountMenu() {
  const { currentUser, signOut } = useApp()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!currentUser) return null
  const tone = tones[ROLE_TONE[currentUser.role]]
  const canDelete = currentUser.role === 'DRIVER' || currentUser.role === 'PARTNER'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${tone.solid}`} aria-hidden>
          {initials(currentUser.name)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-semibold text-ink sm:block">{currentUser.name}</span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 origin-top-right animate-fade-up rounded-xl border border-slate-200 bg-white p-2 [animation-duration:200ms]"
        >
          <div className="px-3 py-2">
            <p className="truncate font-semibold text-ink">{currentUser.name}</p>
            <p className="truncate text-sm text-slate-500">{currentUser.email ?? ROLE_LABELS[currentUser.role]}</p>
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tone.tile}`}>
              {ROLE_LABELS[currentUser.role]}
            </p>
          </div>
          <div className="my-1 border-t border-slate-100" />
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setDeleting(true)
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete account
            </button>
          )}
          <Link
            to="/signin"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Repeat className="h-4 w-4" aria-hidden /> Switch account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
          <BuildStamp className="mt-1 border-t border-slate-100 px-3 py-2" />
        </div>
      )}
      {deleting && <DeleteMyAccount user={currentUser} onClose={() => setDeleting(false)} />}
    </div>
  )
}
