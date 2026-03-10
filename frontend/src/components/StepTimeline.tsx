interface Props {
  currentStep: number // 1, 2, or 3
}

const steps = [
  { label: 'Grundlagen', emoji: '📐' },
  { label: 'Vertiefung', emoji: '🔍' },
  { label: 'Übung', emoji: '🎯' },
]

export function StepTimeline({ currentStep }: Props) {
  return (
    <div className="flex flex-col items-center gap-0">
      {steps.map((s, i) => {
        const n = i + 1
        const done = n < currentStep
        const active = n === currentStep

        return (
          <div key={n} className="flex items-center gap-2">
            {/* Vertical line above (not for first) */}
            <div className="flex flex-col items-center">
              {n > 1 && (
                <div className={`w-0.5 h-4 ${done || active ? 'bg-mint' : 'bg-gray-200'}`} />
              )}
              {/* Dot */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done  ? 'bg-mint border-mint text-white' :
                active ? 'bg-primary border-primary text-white ring-2 ring-primary/30' :
                         'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? '✓' : n}
              </div>
              {/* Vertical line below (not for last) */}
              {n < 3 && (
                <div className={`w-0.5 h-4 ${done ? 'bg-mint' : 'bg-gray-200'}`} />
              )}
            </div>
            {/* Label */}
            <span className={`text-xs font-semibold whitespace-nowrap ${
              active ? 'text-primary' : done ? 'text-mint' : 'text-gray-400'
            }`}>
              {s.emoji} {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
