import { CarFront, Home, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { DEMO_REFRESH } from '../../context/demoFrame'
import { LIVE_STEPS, buildLiveDemo, frameSrc, showSnapshot, staffPath, type LiveDemo, type Tap } from './liveSteps'

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
// Stepping forward plays the step: a tap on one screen, that screen changes, then the other catches up.
// The frames can't be clicked, so the clicker always stays with the deck.
export function LiveScreens({ index, onChange }: Props) {
  const step = LIVE_STEPS[index]
  const [demo, setDemo] = useState<LiveDemo>()
  const [staffSrc, setStaffSrc] = useState('')
  const [tap, setTap] = useState<{ by: Role; x: number; y: number }>()
  const row = useRef<HTMLDivElement>(null)
  const staff = useRef<HTMLIFrameElement>(null)
  const phone = useRef<HTMLIFrameElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const indexRef = useRef(index)
  const shown = useRef(-1) // the step both screens are showing, once fully played

  useEffect(() => {
    indexRef.current = index
  })

  // Fresh data every time the slide opens, so times like "arriving in 10 min" are about now.
  // The staff frame loads once; after that it moves between pages inside the app.
  useEffect(() => {
    let active = true
    buildLiveDemo().then((d) => {
      if (!active) return
      showSnapshot(d, LIVE_STEPS[indexRef.current].moment)
      setStaffSrc(frameSrc(staffPath(d, LIVE_STEPS[indexRef.current]), 'partner'))
      setDemo(d)
    })
    return () => {
      active = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Both frames share one height; the laptop gives way first if the slide is narrow
  const frameH = Math.max(0, box.h - LABEL_H)
  const phoneScale = (frameH / PHONE.h) * 0.97
  const phoneW = (PHONE.w * phoneScale) / 0.97
  const laptopScale = Math.max(0, Math.min((frameH - BAR_H) / LAPTOP.h, (box.w - phoneW - GAP) / LAPTOP.w))
  const scales = useRef({ staff: laptopScale, driver: phoneScale })
  useEffect(() => {
    scales.current = { staff: laptopScale, driver: phoneScale }
  })

  useEffect(() => {
    if (!demo) return
    const run = { cancelled: false }
    const frames = { staff, driver: phone }
    const wait = (ms: number) => new Promise<void>((done) => window.setTimeout(done, ms)).then(() => run.cancelled && Promise.reject(CANCELLED))
    const forward = index === shown.current + 1

    // Each screen's view of this step: the right page, the latest data, scrolled to the part that matters
    const settle = (role: Role) => {
      const frame = frames[role].current
      if (role === 'staff') goTo(frame, staffPath(demo, step))
      refreshFrame(frame)
      scrollWhenReady(frame, run, role === 'staff' ? (doc) => headingNamed(doc, step.staffScroll) : (doc) => doc.getElementById(step.driverScroll), {
        block: role === 'staff' ? 'center' : 'start',
        smooth: forward,
      })
    }

    async function play(by: Role, taps: Tap[]) {
      const frame = frames[by].current
      for (const t of taps) {
        const button = await findWhenReady(frame, run, (doc) => buttonNamed(doc, t.label))
        if (button) {
          button.scrollIntoView({ block: 'center', behavior: 'smooth' })
          await wait(600)
          const r = button.getBoundingClientRect()
          const scale = scales.current[by]
          setTap({ by, x: (r.left + r.width / 2) * scale, y: (r.top + r.height / 2) * scale })
          await wait(TAP_MS)
          if (t.click) button.click()
          setTap(undefined)
        }
        if (t.then) {
          showSnapshot(demo!, t.then)
          if (by === 'staff') goTo(frame, staffPath(demo!, step), { justSaved: 'booked' })
          else refreshFrame(frame)
        }
        await wait(500)
      }
      settle(by)
      await wait(CATCH_UP_MS)
      settle(by === 'staff' ? 'driver' : 'staff')
    }

    const action = step.action
    ;(forward && action ? play(action.by, action.taps) : Promise.resolve(showSnapshot(demo, step.moment)).then(() => (settle('staff'), settle('driver'))))
      .then(() => {
        if (!run.cancelled) shown.current = index
      })
      .catch((e) => {
        if (e !== CANCELLED) throw e
      })
    return () => {
      run.cancelled = true
      setTap(undefined)
    }
  }, [demo, index, step])

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
                <Screen ref={staff} src={staffSrc} size={LAPTOP} scale={laptopScale} title="Staff screen" tap={tap?.by === 'staff' ? tap : undefined} />
              </div>
            </Frame>
            <Frame label="Driver" icon={<CarFront className="h-4 w-4" />}>
              <div className="overflow-hidden rounded-[2rem] border-[6px] border-ink bg-white shadow-xl">
                <Screen
                  ref={phone}
                  src={frameSrc('/driver', 'driver')}
                  size={PHONE}
                  scale={phoneScale}
                  title="Driver’s phone"
                  tap={tap?.by === 'driver' ? tap : undefined}
                />
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
          className="bg-brand-600 absolute left-0 top-3 h-1.5 rounded-full transition-[width] duration-700 ease-out"
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

type Role = 'staff' | 'driver'
type Run = { cancelled: boolean }
const CANCELLED = Symbol('cancelled')
const TAP_MS = 750 // how long a tap shows before the screen reacts
const CATCH_UP_MS = 1000 // between one screen changing and the other

// Tells a frame to show the latest data (frames on /demo only refresh when told)
function refreshFrame(frame: HTMLIFrameElement | null) {
  frame?.contentWindow?.postMessage(DEMO_REFRESH, window.location.origin)
}

// Moves a frame to another page inside the app, without reloading it. `state` is what the app passes along when it navigates.
function goTo(frame: HTMLIFrameElement | null, path: string, state?: unknown) {
  const win = frame?.contentWindow
  if (!win || win.location.href === 'about:blank' || win.location.pathname === path) return // not loaded yet: it opens on the right page anyway
  const idx = ((win.history.state as { idx?: number } | null)?.idx ?? 0) + 1
  win.history.pushState({ usr: state ?? null, key: Math.random().toString(36).slice(2, 10), idx }, '', path + win.location.search)
  win.dispatchEvent(new PopStateEvent('popstate', { state: win.history.state }))
  win.scrollTo(0, 0) // a new page starts at the top, as it does in the app
}

const plain = (text: string | null | undefined) => (text ?? '').replace(/[‘’]/g, "'").trim()

function buttonNamed(doc: Document, label: string) {
  return [...doc.querySelectorAll('button')].find((b) => plain(b.textContent).startsWith(plain(label)) && b.offsetParent)
}

function headingNamed(doc: Document, text?: string) {
  return text ? [...doc.querySelectorAll('h2')].find((h) => plain(h.textContent) === text) : undefined
}

// Looks for something in a frame while its page renders. Gives up after a few seconds.
async function findWhenReady<T extends Element>(frame: HTMLIFrameElement | null, run: Run, find: (doc: Document) => T | null | undefined) {
  for (let tries = 0; tries < 25 && !run.cancelled; tries++) {
    const doc = frame?.contentDocument
    const found = doc && find(doc)
    if (found) return found
    await new Promise((done) => window.setTimeout(done, 120))
  }
  return undefined
}

// Scrolls a frame to what `find` returns once it has rendered. Nothing found: back to the top.
function scrollWhenReady(
  frame: HTMLIFrameElement | null,
  run: Run,
  find: (doc: Document) => Element | null | undefined,
  { block, smooth }: { block: ScrollLogicalPosition; smooth: boolean },
) {
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto'
  // Let the page take the new data first, so the target isn't measured on the old screen
  window.setTimeout(async () => {
    const target = await findWhenReady(frame, run, find)
    if (run.cancelled) return
    if (target) target.scrollIntoView({ block, behavior })
    else frame?.contentDocument?.scrollingElement?.scrollTo({ top: 0, behavior })
  }, 150)
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
  tap,
}: {
  ref?: React.Ref<HTMLIFrameElement>
  src: string
  size: { w: number; h: number }
  scale: number
  title: string
  tap?: { x: number; y: number }
}) {
  return (
    <div style={{ width: size.w * scale, height: size.h * scale }} className="relative overflow-hidden">
      {src && (
        <iframe
          ref={ref}
          src={src}
          title={title}
          tabIndex={-1}
          className="pointer-events-none origin-top-left border-0"
          style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
        />
      )}
      {tap && (
        <span className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2" style={{ left: tap.x, top: tap.y }} aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-coral-500/60" />
          <span className="absolute inset-2 rounded-full border-4 border-white bg-coral-500 shadow-lg" />
        </span>
      )}
    </div>
  )
}
