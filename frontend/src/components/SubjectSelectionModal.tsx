import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'

export interface SubjectOption {
  id: string
  label: string
  emoji: string
  color: string
}

interface Props {
  grade?: number
  initialSelected: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
  /** If true, modal saves directly via PUT /api/profile/subjects and then calls onSave(ids). */
  standalone?: boolean
}

export function SubjectSelectionModal({
  grade,
  initialSelected,
  onSave,
  onClose,
  standalone = false,
}: Props) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selected, setSelected] = useState<string[]>(initialSelected)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = grade != null ? `/api/subjects/all?grade=${grade}` : '/api/subjects/all'
    apiFetch<SubjectOption[]>(url)
      .then(setSubjects)
      .catch(() => setError('Fächer konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [grade])

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (standalone) {
      setSaving(true)
      setError('')
      try {
        await apiFetch('/api/profile/subjects', {
          method: 'PUT',
          body: JSON.stringify({ selected_subjects: selected }),
        })
        onSave(selected)
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      } finally {
        setSaving(false)
      }
    } else {
      onSave(selected)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold text-dark mb-1">Fächer auswählen</h2>
        <p className="text-dark/50 text-sm mb-5">
          Wähle die Fächer, die du auf der Startseite sehen möchtest. Leer = alle anzeigen.
        </p>

        {loading ? (
          <p className="text-dark/50 py-6 text-center">Laden...</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
            {subjects.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-primary/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-2xl">{s.emoji}</span>
                <span className="font-bold text-dark">{s.label}</span>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3 font-semibold">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-dark/70 font-bold hover:border-gray-300 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
