import { Plus } from 'lucide-react'

// Answers repeat what the rest of the app already promises. Keep them in step with it.
const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Is CareRide really free?',
    a: "Yes. Rides are free for the people being driven, and joining is free for organizations and drivers. When there's a choice, free options always come before paid ones.",
  },
  {
    q: 'Does the rider need a phone or an app?',
    a: 'No. Staff at the house book the ride, and the driver meets the client in the lobby. No phone, app, or money needed.',
  },
  {
    q: 'Who can book a ride?',
    a: 'Staff at partner housing and social service organizations book rides for the people they serve. Register your organization to get started.',
  },
  {
    q: "What if no driver can take the ride?",
    a: 'We ask suitable drivers one at a time. If nobody can go, the house knows right away and sees other options.',
  },
  {
    q: 'How are drivers checked?',
    a: 'Every driver and organization is reviewed before their first ride.',
  },
  {
    q: 'Can I use CareRide in an emergency?',
    a: 'No. CareRide is not an ambulance or emergency service. In a medical emergency, always call 911.',
  },
]

// Native <details>, so it opens with a tap, Enter, or Space and works with screen readers.
export function Faq() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {QUESTIONS.map(({ q, a }) => (
        <details
          key={q}
          className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition open:shadow-md open:ring-1 open:ring-brand-100"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-display text-lg font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 [&::-webkit-details-marker]:hidden">
            {q}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-open:rotate-45 group-open:bg-brand-600 group-open:text-white"
              aria-hidden
            >
              <Plus className="h-4 w-4" />
            </span>
          </summary>
          <p className="px-5 pb-5 text-slate-600">{a}</p>
        </details>
      ))}
    </div>
  )
}
