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
      className={`w-full rounded-xl p-5 text-xl font-bold ${
        available ? 'bg-green-700 text-white' : 'bg-slate-200 text-slate-800'
      }`}
    >
      {available ? "I'm available ✓" : "I'm not available"}
    </button>
  )
}
