interface Props {
  onHotkey: (type: string) => void
  disabled?: boolean
  currentStep?: number
}

export function HotKeyButtons({ onHotkey, disabled, currentStep = 1 }: Props) {
  const isFinalStep = currentStep === 3

  const hotkeys = isFinalStep ? [
    { type: 'MORE_EXAMPLE', label: 'Noch ein Beispiel', emoji: '🔄', color: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' },
    { type: 'NEW_TOPIC', label: 'Anderes Thema', emoji: '🚀', color: 'bg-mint/10 text-mint border-mint/30 hover:bg-mint/20' },
  ] : [
    { type: 'NEXT_STEP', label: 'Verstanden, weiter', emoji: '✅', color: 'bg-mint/10 text-mint border-mint/30 hover:bg-mint/20' },
    { type: 'SIMPLIFY', label: 'Nicht verstanden', emoji: '❓', color: 'bg-orange/10 text-orange border-orange/30 hover:bg-orange/20' },
    { type: 'EXAMPLE', label: 'Zeig Beispiel', emoji: '💡', color: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' },
  ]

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {hotkeys.map((h) => (
        <button
          key={h.type}
          onClick={() => onHotkey(h.type)}
          disabled={disabled}
          className={`${h.color} border px-3 py-1.5 rounded-full text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {h.emoji} {h.label}
        </button>
      ))}
    </div>
  )
}
