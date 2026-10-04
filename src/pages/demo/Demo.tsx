import { ChevronLeft, ChevronRight, Maximize, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { ghostButton } from '../../components/ui'
import { Pitch } from './Pitch'
import { SLIDES } from './slides'

const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n))
const toIndex = (v: string | null) => (Number(v ?? 1) || 1) - 1

// Presenter page: the pitch deck. Stepped slides (the ride overview, the real screens) click through one moment at a time.
// Where you are lives in the URL (?slide=4&step=3) so any moment can be linked to.
// Keys: → / ← / PageDown / PageUp / Space step through everything (clickers work), N shows notes, F goes full screen.
export function Demo() {
  const [params, setParams] = useSearchParams()
  const slide = clamp(toIndex(params.get('slide')), SLIDES.length - 1)
  const lastStep = (i: number) => (SLIDES[i].steps ?? 1) - 1
  const step = clamp(toIndex(params.get('step')), lastStep(slide))
  const [notes, setNotes] = useState(false)

  function update(next: Partial<{ slide: number; step: number }>) {
    setParams({ slide: String((next.slide ?? slide) + 1), step: String((next.step ?? step) + 1) }, { replace: true })
  }

  // One "next" for the whole talk: a stepped slide walks through its moments first, then moves on.
  function move(dir: 1 | -1) {
    if (step + dir >= 0 && step + dir <= lastStep(slide)) return update({ step: step + dir })
    const nextSlide = clamp(slide + dir, SLIDES.length - 1)
    if (nextSlide === slide) return
    // Going back into a stepped slide lands on its last moment
    update({ slide: nextSlide, step: dir === -1 ? lastStep(nextSlide) : 0 })
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ' && t.closest('button')) return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) move(1)
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) move(-1)
      else if (e.key === 'n' || e.key === 'N') setNotes((n) => !n)
      else if (e.key === 'f' || e.key === 'F') fullscreen()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="mx-auto flex h-dvh max-w-[1500px] flex-col gap-3 px-4 py-3 lg:px-6">
      <header className="no-print flex flex-wrap items-center gap-x-5 gap-y-2">
        <Logo size="sm" to="/demo" />
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 text-sm font-semibold text-slate-400">
            {slide + 1} / {SLIDES.length}
          </span>
          <button
            type="button"
            className={`${ghostButton} min-h-10 px-3`}
            aria-pressed={notes}
            aria-label="Speaker notes (N)"
            onClick={() => setNotes((n) => !n)}
          >
            <StickyNote className="h-5 w-5" />
          </button>
          <button type="button" className={`${ghostButton} min-h-10 px-3`} aria-label="Full screen (F)" onClick={fullscreen}>
            <Maximize className="h-5 w-5" />
          </button>
          <button type="button" className={`${ghostButton} min-h-10 px-3`} onClick={() => move(-1)} disabled={slide === 0} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={`${ghostButton} min-h-10 px-3`}
            onClick={() => move(1)}
            disabled={slide === SLIDES.length - 1 && step === lastStep(slide)}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Pitch slide={slide} step={step} onStep={(s) => update({ step: s })} />
      </main>

      <nav aria-label="Slides" className="flex shrink-0 items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => update({ slide: i, step: 0 })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${i === slide ? 'bg-ink text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-ink'}`}
            aria-current={i === slide ? 'step' : undefined}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {notes && (
        <aside aria-label="Speaker notes" className="fixed inset-x-4 bottom-14 z-10 mx-auto max-w-3xl rounded-2xl bg-ink/95 p-5 text-white shadow-2xl">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-200">Notes · {SLIDES[slide].label}</div>
          <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
            {SLIDES[slide].notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.()
}
