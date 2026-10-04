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
      <div className="relative rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
        <img src={logoMark} alt="" className="mx-auto h-36 w-36 animate-float sm:h-48 sm:w-48" />

        {/* Highlights sit in their own row so they never cover the logo */}
        <div className="mt-5 hidden grid-cols-2 gap-3 sm:mt-6 sm:grid">
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones.brand.tile}`}>
              <Accessibility className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-bold leading-tight text-ink">Wheelchair ready</p>
              <p className="mt-0.5 text-xs leading-tight text-slate-500">Matched to needs</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones.teal.tile}`}>
              <Navigation className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-500" />
              </span>
            </span>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-bold leading-tight text-ink">On the way</p>
              <p className="mt-0.5 text-xs leading-tight text-slate-500">Maya · 5 min away</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 sm:mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="whitespace-nowrap text-sm font-semibold text-slate-600">Scheduled · 9:15 am</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 py-0.5 pl-2 pr-2.5 text-xs font-bold text-emerald-900">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              Driver confirmed
            </span>
          </div>
          <div className="mt-3 space-y-0.5">
            <p className="relative flex items-center gap-2.5 text-sm text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand-600 bg-white" aria-hidden />
              <span className="absolute -bottom-2.5 left-1 top-[15px] w-0.5 bg-brand-200" aria-hidden />
              Belkin House
            </p>
            <p className="flex items-center gap-2.5 font-display text-lg font-extrabold text-ink">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
              St. Paul's Hospital
            </p>
          </div>
          <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
            <Car className="mt-0.5 h-4 w-4 shrink-0" /> Maya · White sedan · Meets in the lobby
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
                      done ? 'bg-teal-700 text-white' : 'border-2 border-slate-200 bg-white'
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
