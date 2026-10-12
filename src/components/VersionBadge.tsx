import { Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { CURRENT_VERSION, RELEASES } from '../changelog'

const SEEN_KEY = 'careride-seen-version'

// Kept in this browser only: losing it just means the "new" dot shows once more.
function readSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

// A small version chip in the bottom-right corner. Opens the list of recent changes.
export function VersionBadge() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [unseen, setUnseen] = useState(() => readSeenVersion() !== CURRENT_VERSION)

  function open() {
    dialog.current?.showModal()
    setUnseen(false)
    try {
      localStorage.setItem(SEEN_KEY, CURRENT_VERSION)
    } catch {
      // Ignore: the dot may show again after a reload
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Version ${CURRENT_VERSION}. See what's new${unseen ? ' (new updates)' : ''}`}
        className="no-print fixed bottom-[calc(1rem+var(--safe-bottom))] right-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 py-2 pl-3.5 pr-4 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <span className="relative">
          <Sparkles className="h-4 w-4" aria-hidden />
          {unseen && (
            <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-sun-400 ring-2 ring-brand-600" aria-hidden />
          )}
        </span>
        What's new
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">v{CURRENT_VERSION}</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="whats-new-title"
        className="m-auto max-h-[min(36rem,calc(100dvh-2rem))] overflow-y-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl p-0 text-ink shadow-xl backdrop:bg-slate-900/50"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close()
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="whats-new-title" className="text-xl font-bold">
              What's new
            </h2>
            <p className="text-sm text-slate-500">You're on version {CURRENT_VERSION}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="-mr-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-6 px-6 py-5">
          {RELEASES.map((release) => (
            <section key={release.version}>
              <h3 className="flex items-baseline gap-2">
                <span className="font-semibold">Version {release.version}</span>
                <span className="text-sm text-slate-500">{formatDate(release.date)}</span>
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-slate-700">
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </>
  )
}
