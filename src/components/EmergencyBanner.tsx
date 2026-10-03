import { PhoneCall } from 'lucide-react'

export function EmergencyBanner() {
  return (
    <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white" aria-hidden>
        <PhoneCall className="h-4 w-4" />
      </span>
      <p className="text-sm">
        <strong>Medical emergency? Call 911.</strong> CareRide is not an ambulance or emergency service.
      </p>
    </div>
  )
}
