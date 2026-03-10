import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../services/api'

interface Greeting {
  name: string
  avatar: string
  streak: number
  greeting_message: string
}

const avatarEmojis: Record<string, string> = {
  fox: '🦊', owl: '🦉', panda: '🐼', dolphin: '🐬',
  cat: '🐱', turtle: '🐢', penguin: '🐧', rabbit: '🐰',
}

const subjects = [
  {
    id: 'mathe', label: 'Mathe', letter: 'M',
    color: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
    bubble: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    hasBlast: true,
  },
  {
    id: 'deutsch', label: 'Deutsch', letter: 'D',
    color: 'bg-green-100 hover:bg-green-200 border-green-300',
    bubble: 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    hasBlast: false,
  },
  {
    id: 'englisch', label: 'Englisch', letter: 'E',
    color: 'bg-red-100 hover:bg-red-200 border-red-300',
    bubble: 'bg-gradient-to-br from-rose-400 via-red-500 to-orange-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]',
    hasBlast: false,
  },
]

export function AppPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [greeting, setGreeting] = useState<Greeting | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user?.wizard_completed) {
      navigate('/app/wizard')
      return
    }
    apiFetch<Greeting>('/api/greeting').then(setGreeting).catch(console.error)
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
          <span className="text-xl font-bold text-primary">LUMI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/wizard')}
            title="Profil bearbeiten"
            className="text-dark/40 hover:text-primary transition-colors text-2xl"
          >
            ⚙️
          </button>
          <button
            onClick={logout}
            className="text-dark/50 hover:text-dark font-semibold transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Greeting */}
      <div className="max-w-2xl mx-auto px-6 pt-10 text-center">
        <div className="text-6xl mb-4">{avatarEmoji}</div>
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
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-16">
        <h2 className="text-xl font-bold text-dark mb-6 text-center">Waehle ein Fach</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/app/kurs/${s.id}/chat`)}
              className={`${s.color} border-2 rounded-3xl p-8 text-center transition-all hover:shadow-lg hover:scale-105`}
            >
              <div className={`w-20 h-20 mx-auto mb-3 rounded-full ${s.bubble} flex items-center justify-center ring-2 ring-white/30`}>
                <span className="text-3xl font-extrabold text-white drop-shadow-md">{s.letter}</span>
              </div>
              <p className="text-xl font-bold text-dark">{s.label}</p>
              {s.hasBlast && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/app/blast') }}
                  className="mt-3 bg-orange text-white text-sm font-bold px-4 py-1.5 rounded-full hover:bg-orange/80 transition-colors"
                >
                  🚀 Blast!
                </button>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
