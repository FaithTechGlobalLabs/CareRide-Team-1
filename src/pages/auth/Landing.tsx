import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BellRing,
  Building2,
  CalendarCheck,
  Car,
  CheckCircle2,
  EyeOff,
  HandHeart,
  HeartPulse,
  MapPin,
  PhoneCall,
  Puzzle,
  UserCheck,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Faq } from '../../components/landing/Faq'
import { HeroPreview } from '../../components/landing/HeroPreview'
import { LandingHeader, type PageSection } from '../../components/landing/LandingHeader'
import { Logo } from '../../components/Logo'
import { primaryButton, secondaryButton, tones, type Tone } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { HOME_FOR } from '../../logic/homeFor'

const SECTIONS: PageSection[] = [
  { id: 'why', label: 'Why CareRide' },
  { id: 'how', label: 'How it works' },
  { id: 'who', label: "Who it's for" },
  { id: 'promise', label: 'Our promise' },
  { id: 'faq', label: 'Questions' },
]

// The problem CareRide exists to solve (PRODUCT_DESCRIPTION.md §1, PRODUCT_STRATEGY.md §1). No invented statistics.
const REASONS: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  {
    icon: <HeartPulse className="h-6 w-6" />,
    title: 'A missed ride is missed care',
    text: 'Without a phone, money, or a way to book a ride, a hospital visit or housing appointment can quietly slip away.',
    tone: 'coral',
  },
  {
    icon: <Puzzle className="h-6 w-6" />,
    title: 'Help exists, but it’s scattered',
    text: 'Drivers willing to give their time and organizations with vans are out there. Staff lose hours phoning around to find them.',
    tone: 'amber',
  },
  {
    icon: <HandHeart className="h-6 w-6" />,
    title: 'CareRide brings it together',
    text: 'One request reaches every suitable driver, and staff can see what’s happening until the person gets there.',
    tone: 'teal',
  },
]

const STEPS: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: 'Staff send one request',
    text: 'A case worker picks where the person needs to go and when. It takes about a minute, and the person riding needs nothing.',
    tone: 'coral',
  },
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: 'A verified driver says yes',
    text: 'Every suitable driver is asked, and the first to accept takes the ride. If nobody can go, staff know right away.',
    tone: 'teal',
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: 'The person gets there',
    text: 'The driver meets them at the front desk. Staff follow the ride to drop-off, and can book the way home with the same driver.',
    tone: 'brand',
  },
]

const AUDIENCES: { role: string; icon: ReactNode; title: string; text: string; cta: string; tone: Tone }[] = [
  {
    role: 'partner',
    icon: <Building2 className="h-7 w-7" />,
    title: 'Housing and social services',
    text: 'Get the people you support to hospitals, clinics, and appointments, without phoning around or paying for taxis.',
    cta: 'Register your organization',
    tone: 'brand',
  },
  {
    role: 'driver',
    icon: <Car className="h-7 w-7" />,
    title: 'Professional drivers',
    text: 'Taxi and rideshare drivers: give a ride to someone who needs it, whenever it suits your schedule.',
    cta: 'Become a driver',
    tone: 'teal',
  },
]

const PROMISES: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  { icon: <EyeOff className="h-5 w-5" />, title: 'The person comes first', text: 'No account, phone, or app for the rider. Drivers see only what the ride needs.', tone: 'brand' },
  { icon: <BadgeCheck className="h-5 w-5" />, title: 'Verified drivers', text: 'Every driver and organization is reviewed before the first ride.', tone: 'teal' },
  { icon: <BellRing className="h-5 w-5" />, title: 'Nothing slips through', text: 'Every request stays in view until it’s covered. If no one can go, staff hear right away.', tone: 'coral' },
  { icon: <PhoneCall className="h-5 w-5" />, title: 'Not for emergencies', text: 'In a medical emergency, always call 911.', tone: 'amber' },
]

// Every section opens the same way. On wide screens the heading sits beside its intro, so
// the section starts on one line instead of a tall stack, and every heading lines up on the left edge.
function SectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-12 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-16">
      <h2 id={id} className="max-w-xl text-3xl font-black tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {children && <p className="max-w-2xl text-lg text-slate-600">{children}</p>}
    </div>
  )
}

const HERO_POINTS = ['No phone, app, or money needed', 'Drivers who give their time', 'Free for everyone involved']

// The hero for visitors: what CareRide is, and a clear way in for new and returning people.
function Introduction() {
  return (
    <div className="text-center lg:text-left">
      <h1 className="animate-fade-up text-5xl font-black leading-[1.05] tracking-tight text-balance [animation-delay:80ms] sm:text-6xl">
        Care shouldn’t depend <span className="whitespace-nowrap text-brand-700">on a ride</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl animate-fade-up text-xl leading-relaxed text-slate-600 [animation-delay:160ms] lg:mx-0">
        CareRide helps housing and social service staff get the people they support to essential appointments. Verified drivers give their time,
        and every request stays in view until the person gets there.
      </p>
      <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:240ms] sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
        <Link to="/register" className={`${primaryButton} min-h-14 px-7 text-lg`}>
          Get started <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <Link to="/signin" className={`${secondaryButton} min-h-14 px-7 text-lg`}>
          Sign in
        </Link>
        <Link
          to="/demo"
          className="inline-flex min-h-14 items-center justify-center rounded-full px-3 text-lg font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          See a ride
        </Link>
      </div>
      {/* One row on tablets, a list on phones and beside the preview: never two plus one */}
      <ul className="mx-auto mt-10 grid w-fit animate-fade-up gap-3 border-t border-slate-200 pt-6 text-left text-sm font-medium text-slate-600 [animation-delay:320ms] md:grid-flow-col md:auto-cols-max md:gap-x-8 lg:mx-0 lg:w-full lg:grid-flow-row lg:gap-2.5">
        {HERO_POINTS.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Which section is on screen, so the header can highlight it.
// Pass shown = false while the sections aren't on the page yet; it starts watching once they are.
function useActiveSection(ids: string[], shown: boolean): string | undefined {
  const [active, setActive] = useState<string>()
  useEffect(() => {
    if (!shown) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' }, // a thin band across the middle of the screen
    )
    for (const id of ['top', ...ids]) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids, shown])
  return active
}

function useScrolledPast(px: number): boolean {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > px)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [px])
  return past
}

const SECTION_IDS = SECTIONS.map((s) => s.id)

// One container for every section, header and footer, so all left edges line up
const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6'

export function Landing() {
  const { ready, currentUser } = useApp()
  const active = useActiveSection(SECTION_IDS, ready && !currentUser)
  const showBackToTop = useScrolledPast(900)

  // Wait until we know who's signed in, so someone returning to their dashboard never sees a flash of this page
  if (!ready) return null
  // Signed-in people go straight to their dashboard: that's where everything they can do is
  if (currentUser) return <Navigate to={HOME_FOR[currentUser.role]} replace />

  return (
    <div className="overflow-x-clip">
      <LandingHeader sections={SECTIONS} active={active} />

      <main>
        <section id="top" className="scroll-mt-24 border-b border-slate-200" aria-label="Welcome">
          <div className={`${container} grid items-center gap-12 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:py-24`}>
            <Introduction />
            <div className="animate-fade-up [animation-delay:200ms]">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section id="why" className="scroll-mt-20 bg-white py-20 sm:py-24" aria-labelledby="why-heading">
          <div className={container}>
            <SectionHeading id="why-heading" title="Getting there shouldn’t be the hard part">
              CareRide is a not-for-profit platform built for social good. It exists so that people who can’t get there on their own still reach
              the care, housing, and services they need.
            </SectionHeading>
            <ul className="grid gap-6 md:grid-cols-3">
              {REASONS.map((r) => (
                <li key={r.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tones[r.tone].tile}`} aria-hidden>
                    {r.icon}
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold">{r.title}</h3>
                  <p className="mt-2 text-slate-600">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-slate-200 bg-canvas py-20 sm:py-24" aria-labelledby="how-heading">
          <div className={container}>
            <SectionHeading id="how-heading" title="One request, followed through to arrival">
              Three steps from booking to drop-off. The person riding never needs an account, a phone, or money.
            </SectionHeading>
            {/* The steps sit on one road, like the trip itself */}
            <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
              <span className="absolute bottom-6 left-[1.125rem] top-6 w-1 rounded-full bg-slate-200 md:bottom-auto md:left-5 md:right-5 md:top-[1.125rem] md:h-1 md:w-auto" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 md:block">
                  <span className={`relative flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-black ring-4 ring-canvas ${tones[s.tone].solid}`} aria-hidden>
                    {i + 1}
                  </span>
                  <div className="md:mt-6 md:pr-4">
                    <h3 className="flex items-center gap-2 text-xl font-extrabold">
                      <span className={tones[s.tone].text} aria-hidden>{s.icon}</span>
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-sm text-slate-600">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="who" className="scroll-mt-20 bg-white py-20 sm:py-24" aria-labelledby="who-heading">
          <div className={container}>
            <SectionHeading id="who-heading" title="A network of people who care">
              CareRide is open to any housing or social service organization and any verified driver. Every new partner means more people reach
              the care they need.
            </SectionHeading>
            <ul className="grid gap-6 md:grid-cols-2">
              {AUDIENCES.map((a) => (
                <li key={a.role}>
                  <Link
                    to={`/register?role=${a.role}`}
                    className={`group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-7 transition duration-200 hover:-translate-y-1 sm:p-8 ${tones[a.tone].border} focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2`}
                  >
                    <span className={`flex h-14 w-14 items-center justify-center rounded-full ${tones[a.tone].tile}`} aria-hidden>
                      {a.icon}
                    </span>
                    <h3 className="mt-5 text-2xl font-extrabold">{a.title}</h3>
                    <p className="mt-2 flex-1 text-slate-600">{a.text}</p>
                    <span
                      className={`mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-full px-5 font-semibold transition ${tones[a.tone].solid} group-hover:gap-3`}
                    >
                      {a.cta}
                      <ArrowRight className="h-5 w-5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-slate-600 md:text-left">
              Already part of CareRide?{' '}
              <Link to="/signin" className="rounded font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <section id="promise" className="scroll-mt-20 border-y border-slate-200 bg-canvas py-20 sm:py-24" aria-labelledby="promise-heading">
          <div className={`${container} grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16`}>
            <div>
              <h2 id="promise-heading" className="max-w-md text-3xl font-black tracking-tight text-balance sm:text-4xl">
                Dignity, safety, and honesty, built in
              </h2>
              <p className="mt-4 max-w-md text-lg text-slate-600">What everyone can count on, every ride.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {PROMISES.map((p) => (
                <li key={p.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
                    <span className={tones[p.tone].text} aria-hidden>{p.icon}</span>
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-slate-600">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-24" aria-labelledby="faq-heading">
          <div className={container}>
            <SectionHeading id="faq-heading" title="Good to know">
              Short answers to what partners and drivers ask first.
            </SectionHeading>
            <Faq />
          </div>
        </section>

        <section className="bg-white pb-20 sm:pb-24" aria-label="Get going">
          <div className={container}>
            <div className="relative grid gap-8 overflow-hidden rounded-xl bg-ink px-6 py-12 sm:px-12 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
              <span className="absolute inset-x-0 top-0 h-1 bg-brand-500" aria-hidden />
              <div>
                <h2 className="text-3xl font-black tracking-tight text-balance text-white sm:text-4xl">Help more people reach the care they need.</h2>
                <p className="mt-4 max-w-xl text-lg text-brand-100">
                  Join CareRide in a few minutes. It’s not-for-profit and free for partner organizations, drivers, and the people they serve.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  to="/register"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-lg font-bold text-ink transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.98]"
                >
                  Create an account <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/50 px-7 text-lg font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="h-1 bg-brand-600" aria-hidden />
        <div className={`${container} grid gap-8 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16`}>
          <div className="space-y-3">
            <Logo size="sm" />
            <p className="max-w-sm text-slate-500">CareRide is an independent, not-for-profit platform built for social good. Pilot partners are shown for demonstration only.</p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <nav aria-label="Footer: on this page">
              <p className="mb-3 font-bold text-ink">On this page</p>
              <ul className="space-y-2">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-slate-600 hover:text-brand-700">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Footer: account">
              <p className="mb-3 font-bold text-ink">Account</p>
              <ul className="space-y-2">
                <li>
                  <Link to="/signin" className="text-slate-600 hover:text-brand-700">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-slate-600 hover:text-brand-700">
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link to="/register?role=driver" className="text-slate-600 hover:text-brand-700">
                    Become a driver
                  </Link>
                </li>
                <li>
                  <Link to="/demo" className="text-slate-600 hover:text-brand-700">
                    See a ride
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>

      <a
        href="#top"
        aria-label="Back to top"
        tabIndex={showBackToTop ? 0 : -1}
        aria-hidden={!showBackToTop}
        className={`fixed bottom-5 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-ink shadow-md transition duration-300 hover:-translate-y-0.5 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          showBackToTop ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
      </a>
    </div>
  )
}
