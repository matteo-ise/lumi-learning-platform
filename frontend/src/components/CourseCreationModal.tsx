import { useState } from 'react'
import { apiFetch } from '../services/api'

interface Props {
  subject: string
  subjectLabel: string
  onCreated: (courseId: number) => void
  onClose: () => void
}

export function CourseCreationModal({ subject, subjectLabel, onCreated, onClose }: Props) {
  const [topic, setTopic] = useState('')
  const [goalType, setGoalType] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const goalTypes = [
    { id: 'uebung', label: 'Übung', emoji: '📝' },
    { id: 'hausaufgabe', label: 'Hausaufgabe', emoji: '📖' },
    { id: 'pruefung', label: 'Prüfung', emoji: '📋' },
  ]

  const handleSubmit = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch<{ id: number }>('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          topic: topic.trim(),
          goal_type: goalType,
          goal_deadline: goalDeadline,
        }),
      })
      onCreated(res.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Erstellen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold text-dark mb-1">Neuer Kurs</h2>
        <p className="text-dark/50 mb-5">Fach: <span className="font-bold text-primary">{subjectLabel}</span></p>

        {/* Lückentext-Prompt */}
        <div className="bg-gray rounded-2xl p-4 mb-5 text-dark/80">
          <p className="text-base leading-relaxed">
            Ich möchte für eine{' '}
            <span className="inline-flex gap-1 flex-wrap">
              {goalTypes.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoalType(g.id)}
                  className={`px-2 py-0.5 rounded-lg text-sm font-bold border transition-all ${
                    goalType === g.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary'
                  }`}
                >
                  {g.emoji} {g.label}
                </button>
              ))}
            </span>
            {' '}lernen.
          </p>
          <p className="text-base leading-relaxed mt-3">
            Im Fach <span className="font-bold">{subjectLabel}</span> zum Thema:
          </p>
        </div>

        <input
          type="text"
          placeholder="z.B. Einmaleins, Brüche, Geometrie..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && topic.trim() && handleSubmit()}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-primary transition-colors mb-3"
          autoFocus
        />

        <input
          type="text"
          placeholder="Bis wann? (z.B. nächste Woche, Freitag...)"
          value={goalDeadline}
          onChange={(e) => setGoalDeadline(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors mb-4"
        />

        {error && <p className="text-red-500 text-sm mb-3 font-semibold">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-dark/70 font-bold hover:border-gray-300 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!topic.trim() || loading}
            className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Erstellen...' : 'Los geht\'s! 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}
