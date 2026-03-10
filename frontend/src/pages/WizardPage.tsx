import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../services/api'

const AVATARS = [
  { id: 'fox',     emoji: '🦊', label: 'Fuchs',        color: 'bg-orange-100 border-orange-400' },
  { id: 'owl',     emoji: '🦉', label: 'Eule',         color: 'bg-amber-100 border-amber-400' },
  { id: 'panda',   emoji: '🐼', label: 'Panda',        color: 'bg-gray-100 border-gray-400' },
  { id: 'dolphin', emoji: '🐬', label: 'Delfin',       color: 'bg-blue-100 border-blue-400' },
  { id: 'cat',     emoji: '🐱', label: 'Katze',        color: 'bg-yellow-100 border-yellow-400' },
  { id: 'turtle',  emoji: '🐢', label: 'Schildkröte',  color: 'bg-green-100 border-green-400' },
  { id: 'penguin', emoji: '🐧', label: 'Pinguin',      color: 'bg-slate-100 border-slate-400' },
  { id: 'rabbit',  emoji: '🐰', label: 'Hase',         color: 'bg-pink-100 border-pink-400' },
]

const FEDERAL_STATES = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
]

const LEARNING_TYPES = [
  { id: 'kurz',      label: 'Kurz & knapp',     emoji: '⚡', desc: 'Direkt auf den Punkt' },
  { id: 'ausfuehrlich', label: 'Ausführlich',   emoji: '📚', desc: 'Alles genau erklärt' },
  { id: 'beispiele', label: 'Viele Beispiele',  emoji: '💡', desc: 'Am Beispiel lernen' },
]

const LEARNING_GOALS = [
  { id: 'noten',    label: 'Bessere Noten', emoji: '📊' },
  { id: 'pruefung', label: 'Prüfung bestehen', emoji: '✅' },
  { id: 'neugier',  label: 'Aus Neugier', emoji: '🔍' },
]

interface WizardData {
  name: string
  avatar: string
  grade: number
  federal_state: string
  learning_type: string
  learning_goal: string
}

export function WizardPage() {
  const navigate = useNavigate()
  const { updateWizardCompleted } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState<WizardData>({
    name: '',
    avatar: '',
    grade: 2,
    federal_state: '',
    learning_type: '',
    learning_goal: '',
  })

  const canNext = () => {
    if (step === 1) return data.name.trim().length > 0
    if (step === 2) return data.avatar !== ''
    if (step === 3) return data.federal_state !== ''
    if (step === 4) return data.learning_type !== '' && data.learning_goal !== ''
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await apiFetch('/api/profile/wizard', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      updateWizardCompleted()
      navigate('/app')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Name', 'Tier', 'Klasse', 'Lerntyp']

  return (
    <div className="min-h-screen bg-gray flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg p-8">

        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {stepLabels.map((label, i) => {
            const n = i + 1
            const active = n === step
            const done = n < step
            return (
              <div key={n} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done  ? 'bg-mint border-mint text-white' :
                  active ? 'bg-primary border-primary text-white' :
                           'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
              </div>
            )
          })}
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="text-center">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-2xl font-extrabold text-dark mb-2">Wie heißt du?</h2>
            <p className="text-dark/60 mb-6">Damit ich dich persönlich ansprechen kann!</p>
            <input
              type="text"
              placeholder="Dein Vorname..."
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && canNext() && setStep(2)}
              className="w-full border-2 border-gray-200 rounded-2xl px-5 py-3 text-xl font-semibold text-center focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Avatar */}
        {step === 2 && (
          <div className="text-center">
            <div className="text-5xl mb-4">🐾</div>
            <h2 className="text-2xl font-extrabold text-dark mb-2">Wähle dein Tier!</h2>
            <p className="text-dark/60 mb-6">Dein persönlicher Lern-Buddy 🌟</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setData({ ...data, avatar: a.id })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all hover:scale-105 ${
                    data.avatar === a.id
                      ? `${a.color} scale-105 shadow-md`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl">{a.emoji}</span>
                  <span className="text-xs font-bold text-dark/70">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Grade + Federal State */}
        {step === 3 && (
          <div className="text-center">
            <div className="text-5xl mb-4">🏫</div>
            <h2 className="text-2xl font-extrabold text-dark mb-2">Deine Schule</h2>
            <p className="text-dark/60 mb-6">Damit ich die richtigen Inhalte für dich habe!</p>

            <div className="mb-5">
              <label className="block text-left text-sm font-bold text-dark/70 mb-2">Welche Klasse?</label>
              <div className="flex gap-2 flex-wrap justify-center">
                {[1, 2, 3, 4].map((g) => (
                  <button
                    key={g}
                    onClick={() => setData({ ...data, grade: g })}
                    className={`w-12 h-12 rounded-xl font-extrabold text-lg border-2 transition-all hover:scale-105 ${
                      data.grade === g
                        ? 'bg-primary border-primary text-white shadow-md'
                        : 'border-gray-200 text-dark/60 hover:border-primary'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-left text-sm font-bold text-dark/70 mb-2">Bundesland</label>
              <select
                value={data.federal_state}
                onChange={(e) => setData({ ...data, federal_state: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-primary transition-colors bg-white"
              >
                <option value="">Bitte wählen...</option>
                {FEDERAL_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Learning type + goal */}
        {step === 4 && (
          <div>
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🎯</div>
              <h2 className="text-2xl font-extrabold text-dark">Wie lernst du?</h2>
              <p className="text-dark/60 text-sm mt-1">Ich passe mich an deinen Stil an!</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-bold text-dark/70 mb-2">Lerntyp</label>
              <div className="grid grid-cols-2 gap-2">
                {LEARNING_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setData({ ...data, learning_type: t.id })}
                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${
                      data.learning_type === t.id
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className="font-bold text-dark text-sm">{t.label}</p>
                      <p className="text-dark/50 text-xs">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-dark/70 mb-2">Lernziel</label>
              <div className="flex gap-2">
                {LEARNING_GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setData({ ...data, learning_goal: g.id })}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all hover:scale-[1.02] ${
                      data.learning_goal === g.id
                        ? 'bg-mint/10 border-mint shadow-sm'
                        : 'border-gray-200 hover:border-mint/50'
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-xs font-bold text-dark/70 text-center">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-red-500 text-sm text-center font-semibold">{error}</p>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-dark/70 font-bold text-lg hover:border-gray-300 transition-colors"
            >
              ← Zurück
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Weiter →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext() || loading}
              className="flex-1 py-3 rounded-2xl bg-mint text-white font-bold text-lg hover:bg-mint/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Speichern...' : 'Los geht\'s! 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
