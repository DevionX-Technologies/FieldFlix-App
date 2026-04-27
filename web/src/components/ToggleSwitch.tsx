type ToggleSwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
  id?: string
  /** Track color when on (default matches screenshots ~ #2ecc71 / green-500) */
  onColor?: string
}

export default function ToggleSwitch({ checked, onChange, id, onColor = '#22C55E' }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22C55E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050A0E]"
      style={{ backgroundColor: checked ? onColor : 'rgba(148,163,184,0.45)' }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[left] duration-200"
        style={{ left: checked ? '26px' : '4px' }}
      />
    </button>
  )
}
