import { Accessibility, Car, Check, Navigation } from 'lucide-react'
import logoMark from '../../assets/logo-mark.png'
import { tones } from '../ui'

// Where the example ride is: the first two steps are done.
const TRACK = ['Booked', 'Confirmed', 'Picked up', 'Arrived']
const TRACK_DONE = 2

// Illustrative product preview beside the hero. Fictional example data.
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none" aria-hidden>
      <div className="absolute inset-6 rounded-[3rem] bg-brand-gradient opacity-20 blur-3xl" />
      <div className="absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-coral-300/40 blur-3xl" />
      <div className="absolute -left-8 top-1/3 h-36 w-36 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="relative rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-2xl sm:rounded-[2.5rem] sm:p-8 shadow-brand-900/10 backdrop-blur">
        <img src={logoMark} alt="" className="mx-auto h-36 w-36 animate-float sm:h-48 sm:w-48" />

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
