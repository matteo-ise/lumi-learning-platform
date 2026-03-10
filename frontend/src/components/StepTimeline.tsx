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
    <div className="flex flex-col items-start pl-4 gap-0 w-full relative">
      {steps.map((s, i) => {
        const n = i + 1
        const done = n < currentStep
        const active = n === currentStep

        return (
          <div key={n} className="flex items-stretch relative h-20">
            {/* Connecting Line (drawn underneath) */}
            {n < 3 && (
              <div 
                className={`absolute left-4 top-8 bottom-[-24px] w-0.5 z-0 ${done ? 'bg-mint' : 'bg-gray-200'}`} 
              />
            )}

            {/* Icon Column */}
            <div className="flex flex-col items-center w-8 z-10 pt-2">
              {/* Dot */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all bg-white ${
                done  ? 'bg-mint border-mint text-white' :
                active ? 'border-primary text-primary shadow-md ring-4 ring-primary/10' :
                         'border-gray-200 text-gray-400 bg-gray-50'
              }`}>
                {done ? '✓' : n}
              </div>
            </div>

            {/* Content Column */}
            <div className="flex flex-col pt-3 pl-3">
              <span className={`text-sm font-bold ${
                active ? 'text-primary' : done ? 'text-dark' : 'text-gray-400'
              }`}>
                {s.emoji} {s.label}
              </span>
              {active && <span className="text-xs font-semibold text-primary/60 mt-0.5">Aktueller Schritt</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
