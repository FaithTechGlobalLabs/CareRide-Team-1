import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Car,
  CheckCircle2,
  EyeOff,
  HandHeart,
  MapPin,
  PhoneCall,
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
  { id: 'how', label: 'How it works' },
  { id: 'who', label: "Who it's for" },
  { id: 'promise', label: 'Our promise' },
  { id: 'faq', label: 'Questions' },
]

const STEPS: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: 'A partner books the ride',
    text: 'Staff pick a saved destination and a time. It takes about a minute.',
    tone: 'coral',
  },
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: 'A verified driver accepts',
    text: 'Every suitable driver is asked, and the first to say yes gets it. If nobody can go, staff know right away.',
    tone: 'teal',
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: 'The client gets there',
    text: 'The driver meets them in the lobby. No phone, app, or money needed.',
    tone: 'brand',
  },
]

const AUDIENCES: { role: string; icon: ReactNode; title: string; text: string; cta: string; tone: Tone }[] = [
  {
    role: 'partner',
    icon: <Building2 className="h-7 w-7" />,
    title: 'Housing and social services',
    text: 'Book free rides to hospitals, clinics, and appointments for the people you serve.',
    cta: 'Register your organization',
    tone: 'brand',
  },
  {
    role: 'driver',
    icon: <Car className="h-7 w-7" />,
    title: 'Professional drivers',
    text: 'Taxi and rideshare drivers: give a free ride when it suits your schedule.',
    cta: 'Become a driver',
    tone: 'teal',
  },
]

const PROMISES: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  { icon: <EyeOff className="h-5 w-5" />, title: 'Only what the ride needs', text: 'Riders need no account, phone, or app. Staff share only what the driver needs.', tone: 'brand' },
  { icon: <BadgeCheck className="h-5 w-5" />, title: 'Verified drivers', text: 'Every driver and organization is reviewed before the first ride.', tone: 'teal' },
  { icon: <HandHeart className="h-5 w-5" />, title: 'Free first', text: 'Free options come before paid ones, every time.', tone: 'coral' },
  { icon: <PhoneCall className="h-5 w-5" />, title: 'Not for emergencies', text: 'In a medical emergency, always call 911.', tone: 'amber' },
]

function SectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      <h2 id={id} className="text-3xl font-black tracking-tight sm:text-4xl">
        {title}
      </h2>
      {children && <p className="mt-4 text-lg text-slate-600">{children}</p>}
    </div>
  )
}

// The hero for visitors: what CareRide is, and a clear way in for new and returning people.
function Introduction() {
  return (
    <div className="text-center lg:text-left">
      <h1 className="animate-fade-up text-5xl font-black leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl">
        Free rides to the places that matter
      </h1>
      <p className="mx-auto mt-6 max-w-xl animate-fade-up text-xl leading-relaxed text-slate-600 [animation-delay:160ms] lg:mx-0">
        CareRide connects housing and social service staff with verified drivers, so people who can't get there on their own still make it to
        every appointment.
      </p>
      <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:240ms] sm:flex-row sm:justify-center lg:justify-start">
        <Link to="/register" className={`${primaryButton} min-h-14 px-7 text-lg`}>
          Get started <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <Link to="/signin" className={`${secondaryButton} min-h-14 px-7 text-lg`}>
          Sign in
        </Link>
      </div>
      <p className="mt-4 animate-fade-up text-sm text-slate-500 [animation-delay:280ms]">
        Just looking?{' '}
        <Link to="/signin?demo" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
          Try a demo account
        </Link>
      </p>
      <ul className="mx-auto mt-8 flex w-fit animate-fade-up flex-col items-start gap-2 text-sm font-medium text-slate-600 [animation-delay:320ms] sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start">
        {['Piloting in Vancouver', 'No app needed for riders', 'Verified drivers', 'No rider accounts'].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {t}
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
        <section id="top" className="relative scroll-mt-24" aria-label="Welcome">
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:gap-14 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-2 lg:pt-20">
            <Introduction />
            <div className="animate-fade-up [animation-delay:200ms]">
              <HeroPreview />
            </div>
          </div>
          <a
            href="#how"
            className="relative mx-auto -mt-4 mb-6 hidden w-fit flex-col items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-brand-700 lg:flex"
          >
            See how it works
            <ArrowRight className="h-4 w-4 rotate-90 animate-float [animation-duration:2.5s]" aria-hidden />
          </a>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-slate-200 bg-white py-20" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="how-heading" title="From booking to arrival in three steps" />
            {/* The steps sit on one road, like the trip itself */}
            <ol className="relative grid gap-8 md:grid-cols-3 md:gap-10">
              <span className="absolute bottom-6 left-[1.125rem] top-6 w-1 rounded-full bg-slate-200 md:bottom-auto md:left-5 md:right-0 md:top-[1.125rem] md:h-1 md:w-auto" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 md:block">
                  <span className={`relative flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-black ring-4 ring-white ${tones[s.tone].solid}`} aria-hidden>
                    {i + 1}
                  </span>
                  <div className="md:mt-5">
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

        <section id="who" className="scroll-mt-20 py-20" aria-labelledby="who-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="who-heading" title="One network, built together">
              CareRide is independent and open to any organization, so every new partner makes the network stronger.
            </SectionHeading>
            <ul className="grid gap-6 md:grid-cols-2">
              {AUDIENCES.map((a) => {
                const inner = (
                  <>
                    <span className={`absolute inset-x-0 top-0 h-1 ${tones[a.tone].solid}`} aria-hidden />
                    <h3 className="flex items-center gap-3 text-xl font-extrabold">
                      <span className={tones[a.tone].text} aria-hidden>{a.icon}</span>
                      {a.title}
                    </h3>
                    <p className="mt-2 flex-1 text-slate-600">{a.text}</p>
                  </>
                )
                const cardClass = `group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-7 transition duration-200 ${tones[a.tone].border}`
                return (
                  <li key={a.role}>
                    <Link
                      to={`/register?role=${a.role}`}
                      className={`${cardClass} hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500 focus-visible:ring-offset-2`}
                    >
                      {inner}
                      <span className={`mt-6 inline-flex items-center gap-1.5 font-bold ${tones[a.tone].text}`}>
                        {a.cta}
                        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section id="promise" className="scroll-mt-20 border-y border-slate-200 bg-white py-20" aria-labelledby="promise-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="promise-heading" title="Dignity and safety, built in" />
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {PROMISES.map((p) => (
                <li key={p.title} className="border-t border-slate-200 py-6">
                  <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
                    <span className={tones[p.tone].text} aria-hidden>{p.icon}</span>
                    {p.title}
                  </h3>
                  <p className="mt-1 max-w-md text-slate-600">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-20" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="faq-heading" title="Good to know" />
            <Faq />
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6" aria-label="Get going">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl bg-ink px-6 py-14 sm:px-12">
            <span className="absolute inset-x-0 top-0 h-1 bg-brand-500" aria-hidden />
            <>
              <h2 className="relative text-3xl font-black tracking-tight text-white sm:text-4xl">Every essential trip deserves a ride.</h2>
              <p className="relative mt-4 max-w-xl text-lg text-brand-100">
                Join CareRide in a few minutes. It's free for partner organizations, drivers, and the people they serve.
              </p>
              <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-lg font-bold text-ink transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.98]"
                >
                  Create a free account <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/50 px-7 text-lg font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Sign in
                </Link>
              </div>
            </>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="h-1 bg-brand-600" aria-hidden />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1fr_auto_auto] md:gap-16">
          <div className="space-y-3">
            <Logo size="sm" />
            <p className="max-w-sm text-slate-500">CareRide is an independent platform. Pilot partners are shown for demonstration only.</p>
          </div>
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
                <Link to="/signin?demo" className="text-slate-600 hover:text-brand-700">
                  Try a demo
                </Link>
              </li>
            </ul>
          </nav>
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
