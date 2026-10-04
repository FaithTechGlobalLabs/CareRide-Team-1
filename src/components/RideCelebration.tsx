import { PartyPopper, Undo2 } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import type { Ride } from '../types'
import { primaryButton } from './ui'

// Brand blue, aqua, sun, coral and navy: the logo's own colours
const COLOURS = ['var(--color-brand-600)', 'var(--color-aqua-400)', 'var(--color-sun-400)', 'var(--color-coral-500)', 'var(--color-ink)', 'var(--color-brand-300)']
const PIECES = 48

// Fixed per piece so the burst looks the same on every render
const confetti = Array.from({ length: PIECES }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return {
    left: `${r(1) * 100}%`,
    delay: `${r(2) * 0.6}s`,
    size: 6 + Math.round(r(3) * 6),
    colour: COLOURS[i % COLOURS.length],
    drift: `${Math.round((r(4) - 0.5) * 30)}vw`,
    spin: `${Math.round(360 + r(5) * 720)}deg`,
    round: r(6) > 0.6,
  }
})

// Every drop-off gets confetti. Milestones (the first ride, then 5, 10, 25 and every 50) also get their own title.
function isMilestone(count: number): boolean {
  return count === 1 || count === 5 || count === 10 || count === 25 || (count > 0 && count % 50 === 0)
}

function milestoneTitle(count: number): string {
  return count === 1 ? 'Your first ride. Thank you!' : `That's ${count} rides. Thank you!`
}

interface Props {
  ride: Ride
  count: number // the driver's completed rides, including this one
  onClose: () => void
  onUndo: () => void
}

// A thank-you after a drop-off, with a way back if it was tapped by mistake.
export function RideCelebration({ ride, count, onClose, onUndo }: Props) {
  const milestone = isMilestone(count)
  const dialog = useRef<HTMLDialogElement>(null)

  // No close on cleanup: closing fires onClose, which would end the celebration as soon as it starts
  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="celebrate-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl p-8 text-center text-ink shadow-xl backdrop:bg-slate-900/50"
    >
      {/* Inside the dialog so it draws above the backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute top-0 block animate-confetti"
            style={
              {
                left: c.left,
                width: c.size,
                height: c.round ? c.size : c.size * 1.6,
                background: c.colour,
                borderRadius: c.round ? '9999px' : '2px',
                animationDelay: c.delay,
                '--drift': c.drift,
                '--spin': c.spin,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <span className="mx-auto mb-4 flex h-16 w-16 animate-pop items-center justify-center rounded-xl bg-teal-700 text-white" aria-hidden>
        <PartyPopper className="h-8 w-8" />
      </span>
      <h2 id="celebrate-title" className="font-display text-2xl font-extrabold tracking-tight">
        {milestone ? milestoneTitle(count) : 'Ride complete. Thank you!'}
      </h2>
      <p className="mt-2 text-slate-600">
        You got your client to {ride.destinationName}. The front desk has been told.
      </p>
      <button type="button" className={`${primaryButton} mt-6 w-full`} onClick={() => dialog.current?.close()} autoFocus>
        Done
      </button>
      <button
        type="button"
        onClick={() => {
          dialog.current?.close()
          onUndo()
        }}
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <Undo2 className="h-4 w-4" aria-hidden />
        Not yet? Undo the drop-off
      </button>
    </dialog>
  )
}
