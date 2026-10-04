import { CarFront, Home, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { LIVE_STEPS, buildLiveDemo, frameSrc, showSnapshot, staffPath, type LiveDemo } from './liveSteps'

// Screen sizes the frames render at, before being scaled down to fit the slide
const LAPTOP = { w: 1280, h: 800 }
const PHONE = { w: 390, h: 844 }
const LABEL_H = 26 // the role label above each frame
const BAR_H = 22 // the laptop's browser bar
const GAP = 32

interface Props {
  index: number
  onChange: (index: number) => void
}

// The real app, side by side for staff and driver, at each moment of one ride.
// The frames can't be clicked, so the clicker always stays with the deck.
export function LiveScreens({ index, onChange }: Props) {
  const step = LIVE_STEPS[index]
  const [demo, setDemo] = useState<LiveDemo>()
  const row = useRef<HTMLDivElement>(null)
  const staff = useRef<HTMLIFrameElement>(null)
  const phone = useRef<HTMLIFrameElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  // Fresh data every time the slide opens, so times like "arriving in 10 min" are about now
  useEffect(() => {
    let active = true
    buildLiveDemo().then((d) => {
      if (active) setDemo(d)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (demo) showSnapshot(demo, step)
  }, [demo, step])

  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Scroll each screen to the part this step is about (e.g. the slip), once it has rendered
  const ready = !!demo
  useScrollTo(
    staff,
    ready,
    index,
    (doc) => (step.staffScroll ? [...doc.querySelectorAll('h2')].find((h) => h.textContent?.trim() === step.staffScroll) : null),
    'center',
  )
  useScrollTo(phone, ready, index, (doc) => doc.getElementById(step.driverScroll))

  // Both frames share one height; the laptop gives way first if the slide is narrow
  const frameH = Math.max(0, box.h - LABEL_H)
  const phoneScale = frameH / PHONE.h
  const phoneW = PHONE.w * phoneScale
  const laptopScale = Math.max(0, Math.min((frameH - BAR_H) / LAPTOP.h, (box.w - phoneW - GAP) / LAPTOP.w))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div key={index} className="animate-step-forward text-center" aria-live="polite">
        <h2 className="text-2xl font-black leading-tight md:text-3xl">
          {step.title} <span className="font-semibold text-slate-500">· {step.caption}</span>
        </h2>
      </div>

      <div ref={row} className="relative flex min-h-0 flex-1 items-start justify-center" style={{ gap: GAP }}>
        {!demo ? (
          <p className="m-auto text-xl font-semibold text-slate-500">Getting the screens ready…</p>
        ) : (
          <>
            <Frame label="Belkin House staff" icon={<Home className="h-4 w-4" />}>
              <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
                <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3" style={{ height: BAR_H }}>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <Screen ref={staff} src={frameSrc(staffPath(demo, step), 'partner')} size={LAPTOP} scale={laptopScale} title="Staff screen" />
              </div>
            </Frame>
            <Frame label="Driver" icon={<CarFront className="h-4 w-4" />}>
              <div className="overflow-hidden rounded-[2rem] border-[6px] border-ink bg-white shadow-xl">
                <Screen ref={phone} src={frameSrc('/driver', 'driver')} size={PHONE} scale={phoneScale * 0.97} title="Driver’s phone" />
              </div>
            </Frame>
            {demo.warning && (
              <p className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 shadow">
                <TriangleAlert className="h-4 w-4" /> {demo.warning}
              </p>
            )}
          </>
        )}
      </div>

      {/* Stops */}
      <div className="relative mx-[6%] h-12 shrink-0">
        <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-slate-200" />
        <div
          className="bg-spectrum absolute left-0 top-3 h-1.5 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${(index / (LIVE_STEPS.length - 1)) * 100}%` }}
        />
        {LIVE_STEPS.map((s, i) => (
          <button
            key={s.short}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(i)}
            className="absolute top-0 -translate-x-1/2 text-center"
            style={{ left: `${(i / (LIVE_STEPS.length - 1)) * 100}%` }}
          >
            <div className={`mx-auto mt-1 h-4 w-4 rounded-full border-2 bg-white transition ${i <= index ? 'border-brand-500' : 'border-slate-300'}`} />
            <div className={`mt-1 whitespace-nowrap text-sm font-bold ${i === index ? 'text-ink' : 'text-slate-400'}`}>{s.short}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// After each step change, scrolls a frame to what `find` returns, retrying while the page renders.
// Nothing found: back to the top.
function useScrollTo(
  frame: RefObject<HTMLIFrameElement | null>,
  ready: boolean,
  step: number,
  find: (doc: Document) => Element | null | undefined,
  block: ScrollLogicalPosition = 'start',
) {
  const findRef = useRef(find)
  useEffect(() => {
    findRef.current = find
  })
  useEffect(() => {
    if (!ready) return
    let tries = 0
    const timer = window.setInterval(() => {
      const doc = frame.current?.contentDocument
      const target = doc && findRef.current(doc)
      if (target) target.scrollIntoView({ block })
      else doc?.scrollingElement?.scrollTo(0, 0)
      if (target || ++tries > 20) window.clearInterval(timer)
    }, 150)
    return () => window.clearInterval(timer)
  }, [frame, ready, step, block])
}

function Frame({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center">
      <figcaption className="flex items-center gap-2 text-base font-bold text-slate-600" style={{ height: LABEL_H }}>
        {icon} {label}
      </figcaption>
      {children}
    </figure>
  )
}

function Screen({
  ref,
  src,
  size,
  scale,
  title,
}: {
  ref?: React.Ref<HTMLIFrameElement>
  src: string
  size: { w: number; h: number }
  scale: number
  title: string
}) {
  return (
    <div style={{ width: size.w * scale, height: size.h * scale }} className="overflow-hidden">
      <iframe
        ref={ref}
        src={src}
        title={title}
        tabIndex={-1}
        className="pointer-events-none origin-top-left border-0"
        style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
      />
    </div>
  )
}
