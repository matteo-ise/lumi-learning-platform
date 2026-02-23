import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login(email, password)
      if (user.wizard_completed) {
        navigate('/app')
      } else {
        navigate('/app/wizard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-mint/10 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🦊</div>
          <h1 className="text-3xl font-extrabold text-primary">LUMI</h1>
          <p className="text-dark/60 mt-1">Melde dich an und lerne los!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-dark mb-1">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lena@demo.de"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray focus:border-primary focus:outline-none text-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray focus:border-primary focus:outline-none text-lg"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white text-lg font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Laden...' : 'Einloggen'}
          </button>
        </form>

        <p className="text-center text-sm text-dark/50 mt-6">
          Demo: <strong>lena@demo.de</strong> / <strong>1234</strong>
        </p>

        <div className="text-center mt-4">
          <Link to="/" className="text-primary font-semibold hover:underline">
            ← Zurueck zur Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
