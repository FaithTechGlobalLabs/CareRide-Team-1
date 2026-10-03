import { Link } from 'react-router-dom'

interface Props {
  to?: string
  size?: 'sm' | 'md'
}

// The heart-road mark with the CareRide wordmark, matching the logo's colours.
export function Logo({ to = '/', size = 'md' }: Props) {
  const mark = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const text = size === 'sm' ? 'text-xl' : 'text-2xl'
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
      aria-label="CareRide home"
    >
      <img src="/assets/logo-mark.png" alt="" className={mark} />
      <span className={`font-display font-black tracking-tight ${text}`}>
        <span className="text-ink">Care</span>
        <span className="text-brand-gradient">Ride</span>
      </span>
    </Link>
  )
}
