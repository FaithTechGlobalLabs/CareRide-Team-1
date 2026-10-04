import { CarFront, Home, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { DEMO_REFRESH } from '../../context/demoFrame'
import { LIVE_STEPS, buildLiveDemo, frameSrc, showSnapshot, staffPath, type LiveDemo, type LiveStep, type Tap } from './liveSteps'

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
// Stepping forward plays the step. Before each tap the room is shown where to look: the laptop zooms in on the button
// and back out, the phone dims all but the button's row. The tap plays in full view, then the other screen catches up.
// A ring round the step's stop fills as it plays, and tapping a stop plays that step again.
// The frames can't be clicked, so the clicker always stays with the deck. Once a step has played, they can be scrolled.
export function LiveScreens({ index, onChange }: Props) {
  const step = LIVE_STEPS[index]
  const [demo, setDemo] = useState<LiveDemo>()
  const [staffSrc, setStaffSrc] = useState('')
  const [tap, setTap] = useState<{ by: Role; x: number; y: number }>()
  const [view, setView] = useState(WIDE) // the laptop's zoom
  const [spot, setSpot] = useState<Rect>() // the phone's lit area, the rest dimmed
  const [replay, setReplay] = useState(0) // bumped to play the current step again
  const [played, setPlayed] = useState<string>() // the run that has finished playing
  const row = useRef<HTMLDivElement>(null)
  const staff = useRef<HTMLIFrameElement>(null)
  const phone = useRef<HTMLIFrameElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const indexRef = useRef(index)
  const shown = useRef(-1) // the step both screens are showing, once fully played
  const again = useRef<number>(undefined) // a stop the presenter tapped: play it, wherever the deck was
  const runKey = `${index}:${replay}`
  const idle = played === runKey

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

  useEffect(() => {
    if (!demo) return
    const run = { cancelled: false }
    const frames = { staff, driver: phone }
    const wait = (ms: number) => new Promise<void>((done) => window.setTimeout(done, ms)).then(() => run.cancelled && Promise.reject(CANCELLED))
    const forward = again.current === index || index === shown.current + 1
    again.current = undefined
    const behavior: ScrollBehavior = forward ? 'smooth' : 'auto'
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scrolls a screen to the part this step is about (or the top) and waits for the scroll to finish
    async function bringIntoView(role: Role) {
      const frame = frames[role].current
      const focus = role === 'staff' ? step.staffFocus : step.driverFocus
      const find = (doc: Document) => (role === 'staff' ? headingNamed(doc, focus) : doc.getElementById(focus!))
      const target = focus ? await findWhenReady(frame, run, find) : undefined
      if (target) {
        target.scrollIntoView({ block: role === 'staff' ? 'center' : 'start', behavior })
        await still(target, run)
      } else frame?.contentDocument?.scrollingElement?.scrollTo({ top: 0, behavior })
    }

    // Each screen's view of this step: the right page, the latest data, scrolled to the part that matters
    async function settle(role: Role) {
      const frame = frames[role].current
      if (role === 'staff') goTo(frame, staffPath(demo!, step))
      refreshFrame(frame)
      await wait(150) // let the page take the new data first, so the target isn't measured on the old screen
      await bringIntoView(role)
    }

    // Before a tap, show the room where to look, then leave the tap and what it changes to play out in full view.
    // The laptop zooms in on the button and back out; a button about as wide as its card or the screen needs no zoom.
    // The phone is too small to zoom, so all but the button's row dims, until the tap is done.
    async function point(role: Role, button: HTMLElement) {
      if (calm) return
      const r = button.getBoundingClientRect()
      if (role === 'driver') {
        // Buttons side by side (Accept beside Decline) light up together
        const parent = button.parentElement?.getBoundingClientRect()
        const lit = parent && parent.height < r.height * 1.6 ? parent : r
        setSpot({ x: lit.left - SPOT_PAD, y: lit.top - SPOT_PAD, w: lit.width + 2 * SPOT_PAD, h: lit.height + 2 * SPOT_PAD })
        await wait(SPOT_MS)
        return
      }
      const card = button.closest('section, article, form')?.getBoundingClientRect()
      if (r.width > LAPTOP.w * 0.6 || (card && r.width > card.width * 0.8)) return
      // Some room around the button, so it reads in place
      const s = within(Math.min(LAPTOP.w / Math.max(r.width, MIN_FOCUS.w), LAPTOP.h / Math.max(r.height, MIN_FOCUS.h)), 1, MAX_ZOOM)
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      setView({ x: within(LAPTOP.w / 2 - s * cx, LAPTOP.w - s * LAPTOP.w, 0), y: within(LAPTOP.h / 2 - s * cy, LAPTOP.h - s * LAPTOP.h, 0), s })
      await wait(ZOOM_MS + LOOK_MS)
      setView(WIDE)
      await wait(ZOOM_MS)
    }

    async function play(by: Role, taps: Tap[]) {
      const frame = frames[by].current
      // Start from the moment before, in case the last step was skipped part way through
      const before = LIVE_STEPS[index - 1]
      showSnapshot(demo!, before.moment)
      goTo(staff.current, staffPath(demo!, before))
      refreshFrame(staff.current)
      refreshFrame(phone.current)
      for (const t of taps) {
        const button = await findWhenReady(frame, run, (doc) => buttonNamed(doc, t.label))
        if (button) {
          button.scrollIntoView({ block: 'center', behavior: 'smooth' })
          await still(button, run)
          await point(by, button)
          const r = button.getBoundingClientRect()
          setTap({ by, x: r.left + r.width / 2, y: r.top + r.height / 2 })
          await wait(TAP_MS)
          if (t.click) button.click()
          setTap(undefined)
          setSpot(undefined)
        }
        if (t.then) {
          showSnapshot(demo!, t.then)
          if (by === 'staff') goTo(frame, staffPath(demo!, step), { justSaved: 'booked' })
          else refreshFrame(frame)
        }
        await wait(REACT_MS)
      }
      await settle(by)
      await wait(CATCH_UP_MS)
      await settle(by === 'staff' ? 'driver' : 'staff')
    }

    // A step with no taps: both screens settle
    async function show() {
      showSnapshot(demo!, step.moment)
      await Promise.all([settle('staff'), settle('driver')])
    }

    const action = step.action
    ;(forward && action ? play(action.by, action.taps) : show())
      .then(() => {
        if (run.cancelled) return
        shown.current = index
        setPlayed(`${index}:${replay}`)
      })
      .catch((e) => {
        if (e !== CANCELLED) throw e
      })
    return () => {
      // Leaving a step part way through still counts as having shown it, so a quick click on still plays the next one
      run.cancelled = true
      shown.current = index
      setTap(undefined)
      setView(WIDE)
      setSpot(undefined)
    }
  }, [demo, index, step, replay])

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
                <Screen
                  ref={staff}
                  src={staffSrc}
                  size={LAPTOP}
                  scale={laptopScale}
                  title="Staff screen"
                  tap={tap?.by === 'staff' ? tap : undefined}
                  view={view}
                  scrollable={idle}
                />
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
                  view={WIDE}
                  spot={spot}
                  scrollable={idle}
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
          className="bg-spectrum absolute left-0 top-3 h-1.5 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${(index / (LIVE_STEPS.length - 1)) * 100}%` }}
        />
        {LIVE_STEPS.map((s, i) => (
          <button
            key={s.short}
            type="button"
            tabIndex={-1}
            onClick={() => {
              // Plays the step from its start, even the one already showing
              again.current = i
              if (i === index) setReplay((n) => n + 1)
              else onChange(i)
            }}
            className="absolute top-0 -translate-x-1/2 text-center"
            style={{ left: `${(i / (LIVE_STEPS.length - 1)) * 100}%` }}
          >
            <div className="relative mx-auto mt-1 h-4 w-4">
              <div className={`h-4 w-4 rounded-full border-2 bg-white transition ${i <= index ? 'border-brand-500' : 'border-slate-300'}`} />
              {i === index && demo && <PlayRing key={runKey} ms={playTime(s)} done={idle} />}
            </div>
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
// Paced so the room can follow each moment, with the presenter talking over it
const ZOOM_MS = 900 // the laptop zooming in or out
const LOOK_MS = 700 // zoomed in on the button, before zooming back out
const SPOT_MS = 1500 // the phone dimmed round the button, before the tap
const TAP_MS = 1300 // how long a tap shows before the screen reacts
const REACT_MS = 1200 // watching the tapped screen change
const CATCH_UP_MS = 1000 // between one screen changing and the other
const MAX_ZOOM = 2
// How close the laptop is zoomed in, and where its page sits, in the page's own pixels
type View = { x: number; y: number; s: number }
const WIDE: View = { x: 0, y: 0, s: 1 }
// The least of the page the zoomed laptop shows around a button, in its own pixels
const MIN_FOCUS = { w: 640, h: 400 }
// Part of a page, in its own pixels
type Rect = { x: number; y: number; w: number; h: number }
const SPOT_PAD = 10 // room round the lit buttons

// About how long a step takes to play, for the ring round its stop
function playTime(step: LiveStep) {
  if (!step.action) return 800
  const before = step.action.by === 'staff' ? 2 * ZOOM_MS + LOOK_MS : SPOT_MS
  return step.action.taps.length * (700 + before + TAP_MS + REACT_MS) + CATCH_UP_MS + 1200
}

const within = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// Waits for a smooth scroll to end: the element has stopped moving. Gives up after a couple of seconds.
async function still(el: Element, run: Run) {
  let last = NaN
  for (let tries = 0; tries < 25 && !run.cancelled; tries++) {
    const top = el.getBoundingClientRect().top
    if (top === last) return
    last = top
    await new Promise((done) => window.setTimeout(done, 90))
  }
}

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
  view,
  spot,
  scrollable,
}: {
  ref?: React.Ref<HTMLIFrameElement>
  src: string
  size: { w: number; h: number }
  scale: number
  title: string
  tap?: { x: number; y: number }
  view: View
  spot?: Rect
  scrollable: boolean // once a step has played: the wheel scrolls the page, so the presenter can go back over something
}) {
  const at = (n: number, shift: number) => (shift + n * view.s) * scale // a point on the page, in the frame
  return (
    <div style={{ width: size.w * scale, height: size.h * scale }} className="relative overflow-hidden">
      {src && (
        <iframe
          ref={ref}
          src={src}
          title={title}
          tabIndex={-1}
          className="pointer-events-none origin-top-left border-0"
          style={{
            width: size.w,
            height: size.h,
            transform: `scale(${scale}) translate(${view.x}px, ${view.y}px) scale(${view.s})`,
            transition: `transform ${ZOOM_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
          }}
        />
      )}
      {spot && (
        <div
          className="pointer-events-none absolute animate-dim-in rounded-xl"
          style={{
            left: at(spot.x, view.x),
            top: at(spot.y, view.y),
            width: spot.w * view.s * scale,
            height: spot.h * view.s * scale,
            boxShadow: '0 0 0 100vmax rgb(11 21 87 / 0.55)',
          }}
          aria-hidden
        />
      )}
      {scrollable && (
        <div
          className="absolute inset-0"
          // Instant: the app's smooth scrolling would restart a glide on every wheel tick and lag behind
          onWheel={(e) =>
            e.currentTarget.parentElement?.querySelector('iframe')?.contentWindow?.scrollBy({ top: e.deltaY / scale, behavior: 'instant' })
          }
          aria-hidden
        />
      )}
      {tap && (
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: at(tap.x, view.x), top: at(tap.y, view.y), width: 48, height: 48 }}
          aria-hidden
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-coral-500/50" />
          <span className="absolute inset-[18%] rounded-full bg-coral-500/35" style={{ boxShadow: '0 0 0 3px #f5573f' }} />
        </span>
      )}
    </div>
  )
}

// Round a stop: fills while the step plays, and closes when it's done
function PlayRing({ ms, done }: { ms: number; done: boolean }) {
  return (
    <svg className="pointer-events-none absolute -inset-[5px] -rotate-90 text-brand-500" viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="2.5" />
      <circle
        cx="13"
        cy="13"
        r="11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        className={done ? '' : 'animate-ring-fill'}
        style={done ? { strokeDashoffset: 0 } : { animationDuration: `${ms}ms` }}
      />
    </svg>
  )
}
