import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  Building2,
  Bus,
  CalendarCheck,
  Car,
  Check,
  CheckCircle2,
  EyeOff,
  HandHeart,
  MapPin,
  Navigation,
  PhoneCall,
  UserCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { ghostButton, primaryButton, secondaryButton, tones, type Tone } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { HOME_FOR } from '../../logic/homeFor'

const STEPS: { icon: ReactNode; title: string; text: string; tone: Tone }[] = [
  {
    icon: <CalendarCheck className="h-6 w-6" />,
    title: 'A house books the ride',
    text: 'Staff pick a saved destination and a time. It takes a few taps.',
    tone: 'coral',
  },
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: 'A verified driver accepts',
    text: 'We ask suitable drivers one at a time. If nobody can go, the house knows right away.',
    tone: 'teal',
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: 'The client gets there',
    text: 'The driver meets them in the lobby. No phone, app, or money needed.',
    tone: 'violet',
  },
]

const AUDIENCES: { role: string; icon: ReactNode; title: string; text: string; cta: string; tone: Tone }[] = [
  {
    role: 'partner',
    icon: <Building2 className="h-7 w-7" />,
    title: 'Housing and social services',
    text: 'Book free rides to hospitals, clinics, and appointments for the people you serve.',
    cta: 'Register your organization',
    tone: 'violet',
  },
  {
    role: 'provider',
    icon: <Bus className="h-7 w-7" />,
    title: 'Transport providers',
    text: 'Put your vans and drivers to work where they matter most. Get bookings in one place.',
    cta: 'Offer your vehicles',
    tone: 'amber',
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
  { icon: <EyeOff className="h-5 w-5" />, title: 'No personal data', text: 'We never store client names, phone numbers, or history.', tone: 'violet' },
  { icon: <BadgeCheck className="h-5 w-5" />, title: 'Verified drivers', text: 'Every driver and organization is reviewed before the first ride.', tone: 'teal' },
  { icon: <HandHeart className="h-5 w-5" />, title: 'Free first', text: 'Free options come before paid ones, every time.', tone: 'coral' },
  { icon: <PhoneCall className="h-5 w-5" />, title: 'Not for emergencies', text: 'In a medical emergency, always call 911.', tone: 'amber' },
]

function SectionHeading({
  eyebrow,
  title,
  tone = 'brand',
  children,
}: {
  eyebrow: string
  title: string
  tone?: Tone
  children?: ReactNode
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className={`mb-3 text-sm font-bold uppercase tracking-widest ${tones[tone].text}`}>{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-slate-600">{children}</p>}
    </div>
  )
}

// Where the example ride is: the first two steps are done.
const TRACK = ['Booked', 'Confirmed', 'Picked up', 'Arrived']
const TRACK_DONE = 2

// Illustrative product preview beside the hero. Fictional example data.
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none" aria-hidden>
      <div className="absolute inset-6 rounded-[3rem] bg-brand-gradient opacity-20 blur-3xl" />
      <div className="absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-coral-300/40 blur-3xl" />
      <div className="absolute -left-8 top-1/3 h-36 w-36 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="relative rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-2xl sm:rounded-[2.5rem] sm:p-8 shadow-brand-900/10 backdrop-blur">
        <img src="/assets/logo-mark.png" alt="" className="mx-auto h-36 w-36 animate-float sm:h-48 sm:w-48" />

        {/* Highlights sit in their own row so they never cover the logo */}
        <div className="mt-5 hidden grid-cols-2 gap-3 sm:mt-6 sm:grid">
          <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones.violet.tile}`}>
              <Accessibility className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-bold leading-tight text-ink">Wheelchair ready</p>
              <p className="mt-0.5 text-xs leading-tight text-slate-500">Matched to needs</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones.teal.tile}`}>
              <Navigation className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-500" />
              </span>
            </span>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-bold leading-tight text-ink">On the way</p>
              <p className="mt-0.5 text-xs leading-tight text-slate-500">Olive · 5 min away</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="h-2 w-2 rounded-full bg-teal-500" /> Scheduled · 9:15 am
            </span>
            <span className="whitespace-nowrap rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-900">Driver confirmed</span>
          </div>
          <p className="mt-2 font-display text-lg font-extrabold text-ink">Belkin House → St. Paul's Hospital</p>
          <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
            <Car className="mt-0.5 h-4 w-4 shrink-0" /> Olive · White sedan · Meets in the lobby
          </p>

          <ol className="mt-4 flex border-t border-slate-100 pt-4">
            {TRACK.map((step, i) => {
              const done = i < TRACK_DONE
              return (
                <li key={step} className="relative flex flex-1 flex-col items-center gap-1.5">
                  {i > 0 && (
                    <span className={`absolute right-1/2 top-2.5 h-0.5 w-full -translate-y-1/2 ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />
                  )}
                  <span
                    className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${
                      done ? 'bg-teal-500 text-white' : 'border-2 border-slate-200 bg-white'
                    } ${i === TRACK_DONE - 1 ? 'ring-4 ring-teal-100' : ''}`}
                  >
                    {done && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className={`whitespace-nowrap text-[11px] font-semibold ${done ? 'text-ink' : 'text-slate-400'}`}>{step}</span>
                </li>
              )
            })}
          </ol>
        </div>

      </div>
    </div>
  )
}

export function Landing() {
  const { currentUser } = useApp()

  return (
    <div className="overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/75 backdrop-blur-lg">
        <div className="h-1 bg-spectrum" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            {currentUser ? (
              <Link to={HOME_FOR[currentUser.role]} className={primaryButton}>
                <span className="sm:hidden">Dashboard</span>
                <span className="hidden sm:inline">Go to dashboard</span>
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            ) : (
              <>
                <Link to="/signin" className={ghostButton}>
                  Sign in
                </Link>
                <span className="hidden sm:block">
                  <Link to="/register" className={primaryButton}>
                    Get started
                  </Link>
                </span>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-100/70 to-transparent blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:gap-14 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-2 lg:pt-20">
            <div className="text-center lg:text-left">
              <p className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-800 shadow-sm min-[360px]:px-4 min-[360px]:text-sm">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inset-0 animate-ping rounded-full bg-coral-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-coral-500" />
                </span>
                Free rides · Now piloting in Vancouver
              </p>
              <h1 className="animate-fade-up text-5xl font-black leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl">
                Welcome to <span className="text-brand-gradient">CareRide</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl animate-fade-up text-xl leading-relaxed text-slate-600 [animation-delay:160ms] lg:mx-0">
                Free, reliable rides to the places that matter, for people who can't get there on their own.
              </p>
              <div className="mt-10 flex animate-fade-up flex-col gap-3 [animation-delay:240ms] sm:flex-row sm:justify-center lg:justify-start">
                {currentUser ? (
                  <Link to={HOME_FOR[currentUser.role]} className={`${primaryButton} min-h-14 px-7 text-lg`}>
                    Go to dashboard <ArrowRight className="h-5 w-5" aria-hidden />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className={`${primaryButton} min-h-14 px-7 text-lg`}>
                      Get started <ArrowRight className="h-5 w-5" aria-hidden />
                    </Link>
                    <Link to="/signin" className={`${secondaryButton} min-h-14 px-7 text-lg`}>
                      I have an account
                    </Link>
                  </>
                )}
              </div>
              <ul className="mx-auto mt-8 flex w-fit animate-fade-up flex-col items-start gap-2 text-sm font-medium text-slate-600 [animation-delay:320ms] sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start">
                {['No app needed for riders', 'Verified drivers', 'No personal data stored'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-fade-up [animation-delay:200ms]">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-slate-200/70 bg-white py-20" aria-labelledby="how">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="How it works" title="From booking to arrival in three steps" tone="teal" />
            <ol className="grid gap-6 md:grid-cols-3" id="how">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#fbfbfe] p-7">
                  <span className={`absolute right-6 top-6 font-display text-5xl font-black opacity-25 ${tones[s.tone].text}`} aria-hidden>
                    {i + 1}
                  </span>
                  <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${tones[s.tone].solid} ${tones[s.tone].glow}`} aria-hidden>
                    {s.icon}
                  </span>
                  <h3 className="text-xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-slate-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-20" aria-labelledby="who">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="Who it's for" title="One network, built together" tone="violet">
              CareRide is independent and open to any organization, so every new partner makes the network stronger.
            </SectionHeading>
            <div className="grid gap-6 md:grid-cols-3" id="who">
              {AUDIENCES.map((a) => (
                <Link
                  key={a.role}
                  to={`/register?role=${a.role}`}
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 ${tones[a.tone].border}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1.5 ${tones[a.tone].solid}`} aria-hidden />
                  <span className="relative mb-5 h-14 w-14" aria-hidden>
                    <span className={`absolute inset-0 flex items-center justify-center rounded-2xl transition ${tones[a.tone].tile}`}>
                      {a.icon}
                    </span>
                    <span className={`absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 transition group-hover:opacity-100 ${tones[a.tone].solid}`}>
                      {a.icon}
                    </span>
                  </span>
                  <h3 className="text-xl font-extrabold">{a.title}</h3>
                  <p className="mt-2 flex-1 text-slate-600">{a.text}</p>
                  <span className={`mt-6 inline-flex items-center gap-1.5 font-bold ${tones[a.tone].text}`}>
                    {a.cta}
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Promises */}
        <section className="border-y border-slate-200/70 bg-white py-20" aria-labelledby="promise">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="Our promise" title="Dignity and safety, built in" tone="coral" />
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" id="promise">
              {PROMISES.map((p) => (
                <li key={p.title} className="rounded-2xl p-2">
                  <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tones[p.tone].tile}`} aria-hidden>
                    {p.icon}
                  </span>
                  <h3 className="text-lg font-extrabold">{p.title}</h3>
                  <p className="mt-1 text-slate-600">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 py-20 sm:px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-brand-gradient px-6 py-16 text-center shadow-2xl shadow-brand-700/20 sm:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-coral-400/30 blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-2xl" aria-hidden />
            <div className="pointer-events-none absolute bottom-6 right-1/4 h-24 w-24 rounded-full bg-amber-300/25 blur-2xl" aria-hidden />
            <h2 className="relative text-3xl font-black tracking-tight text-white sm:text-4xl">Every essential trip deserves a ride.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/85">
              Join CareRide in a few minutes. It's free for organizations, drivers, and the people they serve.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 text-lg font-bold text-brand-700 shadow-lg transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]"
              >
                Create a free account <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link
                to="/signin"
                className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/40 px-7 text-lg font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="h-1 bg-spectrum" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo size="sm" />
          <p className="text-center sm:text-right">
            CareRide is an independent platform. Pilot partners are shown for demonstration only.
          </p>
        </div>
      </footer>
    </div>
  )
}
