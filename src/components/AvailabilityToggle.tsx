interface Props {
  available: boolean
  onChange: (available: boolean) => void
}

export function AvailabilityToggle({ available, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      onClick={() => onChange(!available)}
      className={`w-full rounded-xl p-5 text-xl font-bold transition ${
        available ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-lg shadow-emerald-700/20' : 'bg-slate-200 text-slate-800'
      }`}
    >
      {available ? 'Taking ride requests ✓' : 'Paused: not taking requests'}
    </button>
  )
}
