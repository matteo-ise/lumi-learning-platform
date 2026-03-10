import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../services/api'
import { SubjectSelectionModal } from '../components/SubjectSelectionModal'

interface Greeting {
  name: string
  avatar: string
  streak: number
  greeting_message: string
}

interface Subject {
  id: string
  label: string
  emoji: string
  color: string
}

const avatarEmojis: Record<string, string> = {
  fox: '🦊', owl: '🦉', panda: '🐼', dolphin: '🐬',
  cat: '🐱', turtle: '🐢', penguin: '🐧', rabbit: '🐰',
}

const colorMap: Record<string, { card: string; bubble: string }> = {
  blue:   { card: 'bg-blue-100 hover:bg-blue-200 border-blue-300',   bubble: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600' },
  green:  { card: 'bg-green-100 hover:bg-green-200 border-green-300', bubble: 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600' },
  red:    { card: 'bg-red-100 hover:bg-red-200 border-red-300',       bubble: 'bg-gradient-to-br from-rose-400 via-red-500 to-orange-500' },
  amber:  { card: 'bg-amber-100 hover:bg-amber-200 border-amber-300', bubble: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500' },
  purple: { card: 'bg-purple-100 hover:bg-purple-200 border-purple-300', bubble: 'bg-gradient-to-br from-purple-400 via-violet-500 to-fuchsia-600' },
  pink:   { card: 'bg-pink-100 hover:bg-pink-200 border-pink-300',   bubble: 'bg-gradient-to-br from-pink-400 via-rose-500 to-red-500' },
  teal:   { card: 'bg-teal-100 hover:bg-teal-200 border-teal-300',   bubble: 'bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500' },
  indigo: { card: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300', bubble: 'bg-gradient-to-br from-indigo-400 via-blue-500 to-violet-600' },
}

export function AppPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [greeting, setGreeting] = useState<Greeting | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [subjectModalInitial, setSubjectModalInitial] = useState<string[]>([])

  const openSubjectModal = () => {
    apiFetch<{ selected_subjects?: string[] } | null>('/api/profile')
      .then((p) => setSubjectModalInitial(p?.selected_subjects ?? []))
      .catch(() => setSubjectModalInitial([]))
    setSubjectModalOpen(true)
  }

  useEffect(() => {
    if (loading) return
    if (!user?.wizard_completed) {
      navigate('/app/wizard')
      return
    }
    apiFetch<Greeting>('/api/greeting').then(setGreeting).catch(console.error)
    apiFetch<Subject[]>('/api/subjects').then(setSubjects).catch(console.error)
  }, [user, loading, navigate])

  if (!greeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Laden...</p>
      </div>
    )
  }

  const avatarEmoji = avatarEmojis[greeting.avatar] || '🦊'

  return (
    <div className="min-h-screen bg-gray">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{avatarEmoji}</span>
          <span className="text-xl font-extrabold text-primary tracking-tight">LUMI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openSubjectModal}
            title="Fächer anpassen"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-xl hover:bg-primary/20 transition-all"
          >
            +
          </button>
          <button
            onClick={() => navigate('/app/wizard')}
            title="Einstellungen"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-gray-200 hover:border-primary hover:text-primary text-dark/50 font-semibold text-sm transition-all"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Einstellungen</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:text-red-500 text-dark/50 font-semibold text-sm transition-all"
          >
            <span>↪️</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Greeting */}
      <div className="max-w-2xl mx-auto px-6 pt-10 text-center">
        <h1 className="text-3xl font-extrabold text-dark mb-2">
          Hallo {greeting.name}! 🌟
        </h1>
        <p className="text-lg text-dark/70 mb-3 italic">
          "{greeting.greeting_message}"
        </p>
        <div className="inline-flex items-center gap-2 bg-orange/10 text-orange px-4 py-2 rounded-full font-bold text-lg">
          🔥 Streak: {greeting.streak} {greeting.streak === 1 ? 'Tag' : 'Tage'}
        </div>
      </div>

      {/* Subject Bubbles */}
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <div className="flex items-center justify-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-dark">Wähle ein Fach</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map((s) => {
            const colors = colorMap[s.color] || colorMap.blue
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/app/fach/${s.id}`)}
                className={`${colors.card} border-2 rounded-3xl p-6 text-center transition-all hover:shadow-lg hover:scale-105`}
              >
                <div className={`w-16 h-16 mx-auto mb-2 rounded-full ${colors.bubble} flex items-center justify-center ring-2 ring-white/30 shadow-lg`}>
                  <span className="text-2xl">{s.emoji}</span>
                </div>
                <p className="text-base font-bold text-dark">{s.label}</p>
                {s.id === 'mathe' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/app/blast') }}
                    className="mt-2 bg-orange text-white text-xs font-bold px-3 py-1 rounded-full hover:bg-orange/80 transition-colors"
                  >
                    🚀 Blast!
                  </button>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {subjectModalOpen && (
        <SubjectSelectionModal
          initialSelected={subjectModalInitial}
          onSave={() => {
            apiFetch<Subject[]>('/api/subjects').then(setSubjects).catch(console.error)
          }}
          onClose={() => setSubjectModalOpen(false)}
          standalone
        />
      )}
    </div>
  )
}
