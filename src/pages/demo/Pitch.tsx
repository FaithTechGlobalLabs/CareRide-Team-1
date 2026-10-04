import { Bell, CalendarCheck, ClipboardList, HandHeart, Heart, PhoneCall, PhoneOff, Undo2, Unlink, Users, type LucideIcon } from 'lucide-react'
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

export function Pitch({ slide, step, onStep }: Props) {
  const id = SLIDES[slide].id
  return (
    <div key={id} className="flex min-h-0 flex-1 animate-fade-up flex-col">
      {id === 'title' && (
        <section className="m-auto flex flex-col items-center py-6 text-center">
          <img src={logoMark} alt="" className="h-36 w-36 animate-float" />
          <Wordmark />
          <p className="mt-4 max-w-4xl text-balance text-3xl font-bold text-slate-700 md:text-5xl">Helping neighbours get where they need to go.</p>
          <p className="mt-10 text-xl text-slate-500">HACKVAN 2026 · Adi, Noah, Gilbert</p>
        </section>
      )}
      {id === 'story' && (
        <Slide kicker="One morning at Belkin House" title="A resident has an appointment at St. Paul’s.">
          <p className="text-center text-4xl font-bold text-slate-600">They don’t have a smartphone.</p>
          <p className="mt-6 text-center text-4xl font-black text-brand-600">How do they get there?</p>
        </Slide>
      )}
      {id === 'problem' && (
        <Slide kicker="The problem" title="Getting to care shouldn’t depend on having a smartphone.">
          <Points
            items={[
              { icon: PhoneOff, tone: 'coral', title: 'Ride apps assume a smartphone' },
              { icon: Unlink, tone: 'violet', title: 'No shared way to request or track rides' },
              { icon: PhoneCall, tone: 'amber', title: 'Staff arrange rides by hand' },
            ]}
          />
          <p className="mt-8 text-center text-3xl font-bold text-coral-600">Without a ride, people can miss appointments.</p>
        </Slide>
      )}
      {id === 'heard' && (
        <Slide kicker="We ran a user testing session" title="A few big lessons.">
          <div className="mx-auto grid max-w-5xl gap-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-5 px-7 text-base font-bold uppercase tracking-wider text-slate-400">
              <span>What we learned</span>
              <span className="w-12" />
              <span>What we changed</span>
            </div>
            <Heard icon={ClipboardList} heard="Drivers lost track of rides they accepted" changed="Requests and trips on one screen" />
            <Heard icon={CalendarCheck} heard="Staff wanted to know a driver was available before booking" changed="The booking form shows matching drivers" />
            <Heard icon={Undo2} heard="People needed to fix mistakes and change plans" changed="Rides can be edited, and steps undone" />
          </div>
        </Slide>
      )}
      {id === 'live' && <LiveScreens index={step} onChange={onStep} />}
      {id === 'values' && (
        <Slide kicker="What guided us" title="Simple for everyone involved.">
          <Points
            items={[
              { icon: HandHeart, tone: 'coral', title: 'Residents need no phone or app' },
              { icon: Bell, tone: 'brand', title: 'Staff can follow every ride' },
              { icon: Users, tone: 'violet', title: 'Any organization can join' },
            ]}
          />
        </Slide>
      )}
      {id === 'thanks' && (
        <section className="m-auto flex flex-col items-center py-6 text-center">
          <Heart className="h-20 w-20 animate-float fill-coral-500 text-coral-500" aria-hidden />
          <h2 className="mt-6 text-7xl font-black md:text-8xl">Thank you.</h2>
          <p className="mt-6 max-w-4xl text-balance text-3xl font-bold text-slate-700 md:text-4xl">Questions?</p>
          <p className="mt-10 text-xl text-slate-500">Adi, Noah, Gilbert · Inspired by Belkin Communities of Hope</p>
        </section>
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

function Slide({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="m-auto w-full max-w-6xl py-2">
      <div className="text-center text-lg font-bold uppercase tracking-wider text-brand-600">{kicker}</div>
      <h2 className="mx-auto mt-2 max-w-5xl text-balance text-center text-5xl font-black leading-[1.1] md:text-6xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  )
}

function Points({ items }: { items: { icon: LucideIcon; tone: Tone; title: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ icon: Icon, tone, title }, i) => (
        <div
          key={title}
          className="flex animate-fade-up flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm"
          style={{ animationDelay: `${0.15 + i * 0.12}s` }}
        >
          <span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${tones[tone].tile}`} aria-hidden>
            <Icon className="h-8 w-8" />
          </span>
          <h3 className="mt-5 text-balance text-3xl font-extrabold leading-snug">{title}</h3>
        </div>
      ))}
    </div>
  )
}

function Heard({ icon: Icon, heard, changed }: { icon: LucideIcon; heard: string; changed: string }) {
  return (
    <div className="grid animate-fade-up grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-2xl border border-slate-200/80 bg-white px-7 py-4 shadow-sm">
      <p className="text-2xl font-semibold text-slate-600">{heard}</p>
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones.brand.tile}`} aria-hidden>
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-2xl font-extrabold">{changed}</p>
    </div>
  )
}
