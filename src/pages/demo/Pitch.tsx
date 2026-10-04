import {
  ArrowRight,
  Bot,
  Bus,
  CalendarCheck,
  Check,
  ClipboardList,
  Clock,
  GitBranch,
  GitPullRequest,
  HandHeart,
  PhoneOff,
  Search,
  Share2,
  Undo2,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import logoMark from '../../assets/logo-mark.png'
import { tones, type Tone } from '../../components/ui'
import { LiveScreens } from './LiveScreens'
import { SLIDES } from './slides'

interface Props {
  slide: number
  step: number // moment on a stepped slide
  onStep: (step: number) => void
}

// How we worked, and who did what, from the repo's pull requests
const PROCESS = [
  { icon: Bot, text: 'Each of us worked with a coding agent' },
  { icon: GitPullRequest, text: 'Over 80 pull requests in two days' },
  { icon: Users, text: 'User testing shaped the last round' },
]
const TEAM = [
  { name: 'Adi', did: ['Major design elements'] },
  { name: 'Noah', did: ['Cloudflare deploy and Android app'] },
  { name: 'Gilbert', did: ['Collecting feedback and notes'] },
]

export const REPO_URL = 'github.com/FaithTechGlobalLabs/CareRide-Team-1'

export function Pitch({ slide, step, onStep }: Props) {
  const id = SLIDES[slide].id
  return (
    <div key={id} className="flex min-h-0 flex-1 animate-fade-up flex-col">
      {id === 'title' && (
        <section className="m-auto flex flex-col items-center py-2 text-center">
          <img src={logoMark} alt="" className="h-24 w-24 animate-float" />
          <Wordmark />
          <p className="mt-4 max-w-5xl text-balance text-3xl font-extrabold text-slate-700 md:text-4xl">
            Clients at transitional housing may be unable to use phones. Without the ability to book rides, they can miss the care they need.
          </p>
          <p className="mt-3 text-xl font-bold text-slate-500">Belkin Communities of Hope · The Salvation Army, Vancouver</p>
          <p className="mt-6 flex items-center gap-2 text-2xl font-bold text-brand-700">
            <GitBranch className="h-6 w-6" aria-hidden /> {REPO_URL}
          </p>
          <p className="mt-3 text-xl font-bold text-slate-500">Adi, Noah, Gilbert</p>
        </section>
      )}
      {id === 'problem' && (
        <Slide title="How do you get to an appointment without a phone?">
          <Points
            items={[
              { icon: Users, tone: 'coral', title: 'Clients are often unable to use technology' },
              { icon: PhoneOff, tone: 'ink', title: 'Uber, Lyft, and taxis need phones to book rides' },
              { icon: Search, tone: 'amber', title: 'Case workers search for rides with no easy system' },
              { icon: Wallet, tone: 'brand', title: 'Many can’t afford a taxi, or even the bus' },
            ]}
          />
          <p className="mt-5 text-center text-3xl font-extrabold text-coral-600">Without a ride, they can miss the care they need.</p>
        </Slide>
      )}
      {id === 'impact' && (
        <Slide title="What changes if this works.">
          <Points
            items={[
              { icon: HandHeart, tone: 'coral', title: 'People get to appointments, no phone needed' },
              { icon: Clock, tone: 'brand', title: 'Case workers spend less time finding rides' },
              { icon: Share2, tone: 'ink', title: 'Organizations share drivers, instead of each going it alone' },
              { icon: Wallet, tone: 'amber', title: 'People ride without paying, and staff hand out fewer bus tickets' },
            ]}
          />
        </Slide>
      )}
      {id === 'approach' && (
        <Slide title="A working MVP, built around case workers.">
          <div className="grid gap-5 sm:grid-cols-2">
            <List
              heading="Our angle"
              items={['Case workers book rides for residents', 'Residents need no phone, app, or account', 'Drivers accept or decline each request']}
            />
            <List
              heading="Our assumptions"
              items={['Case workers are the right people to book', 'Drivers will sign up to give rides', 'A printed slip is enough for the resident']}
            />
          </div>
        </Slide>
      )}
      {id === 'live' && <LiveScreens index={step} onChange={onStep} />}
      {id === 'story' && (
        <Slide title="Built together, with coding agents.">
          <div className="flex flex-wrap justify-center gap-3">
            {PROCESS.map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-lg font-bold text-brand-800 ring-1 ring-brand-100">
                <Icon className="h-5 w-5" aria-hidden /> {text}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {TEAM.map(({ name, did }) => (
              <div key={name} className="rounded-xl border border-slate-200/80 bg-white px-6 py-5">
                <h3 className="text-3xl font-extrabold">{name}</h3>
                <ul className="mt-2 space-y-1 text-lg font-bold text-slate-600">
                  {did.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Slide>
      )}
      {id === 'lessons' && (
        <Slide title="A few big lessons.">
          <div className="mx-auto grid max-w-5xl gap-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-5 px-7 text-base font-bold text-slate-400">
              <span>What we learned</span>
              <span className="w-12" />
              <span>What we changed</span>
            </div>
            <Heard icon={ClipboardList} heard="Drivers lost track of rides they accepted" changed="Requests and trips on one screen" />
            <Heard icon={CalendarCheck} heard="Staff wanted to know a driver was available before booking" changed="The booking form shows matching drivers" />
            <Heard icon={Undo2} heard="People needed to fix mistakes and change plans" changed="Rides can be edited, and steps undone" />
            <Heard icon={Bus} heard="When no driver was free, there was nothing to do next" changed="A printable bus slip, with any transfers" />
          </div>
        </Slide>
      )}
      {id === 'thanks' && (
        <Slide title="Next Steps">
          <div className="grid gap-5 sm:grid-cols-2">
            <List
              heading="Built since user testing"
              items={['A shared database and an Android app', 'Drive times and route previews for drivers', 'Live hospital wait times when booking']}
            />
            <List
              heading="Next"
              icon={ArrowRight}
              items={['A pilot at Belkin House, then Richmond House and Grace Mansion', 'Start with professional drivers', 'Text updates when a ride is booked']}
            />
          </div>
        </Slide>
      )}
    </div>
  )
}

function Wordmark() {
  return (
    <h1 className="mt-4 font-display text-7xl font-black tracking-tight md:text-8xl">
      <span className="text-ink">Care</span>
      <span className="text-brand-gradient">Ride</span>
    </h1>
  )
}

// The slide's kicker sits in the deck's header
function Slide({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="m-auto w-full max-w-6xl py-2">
      <h2 className="mx-auto max-w-5xl text-balance text-center text-5xl font-black leading-[1.1] md:text-6xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Points({ items }: { items: { icon: LucideIcon; tone: Tone; title: string }[] }) {
  return (
    <div className={`grid gap-4 ${items.length === 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      {items.map(({ icon: Icon, tone, title }, i) => (
        <div
          key={title}
          className="flex animate-fade-up flex-col items-center rounded-xl border border-slate-200/80 bg-white p-5 text-center"
          style={{ animationDelay: `${0.15 + i * 0.12}s` }}
        >
          <span className={`flex h-16 w-16 items-center justify-center rounded-xl ${tones[tone].tile}`} aria-hidden>
            <Icon className="h-8 w-8" />
          </span>
          <h3 className="mt-4 text-balance text-3xl font-extrabold leading-snug">{title}</h3>
        </div>
      ))}
    </div>
  )
}

function Heard({ icon: Icon, heard, changed }: { icon: LucideIcon; heard: string; changed: string }) {
  return (
    <div className="grid animate-fade-up grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-xl border border-slate-200/80 bg-white px-7 py-4">
      <p className="text-2xl font-semibold text-slate-600">{heard}</p>
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones.brand.tile}`} aria-hidden>
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-2xl font-extrabold">{changed}</p>
    </div>
  )
}

// `bare` drops the card, for a list inside a card of its own
function List({ heading, items, icon: Icon = Check, bare = false }: { heading: string; items: string[]; icon?: LucideIcon; bare?: boolean }) {
  return (
    <div className={bare ? '' : 'rounded-xl border border-slate-200/80 bg-white p-6'}>
      <h3 className="text-xl font-extrabold text-slate-400">{heading}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-2xl font-bold">
            <Icon className="mt-1 h-6 w-6 shrink-0 text-brand-600" aria-hidden /> {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
