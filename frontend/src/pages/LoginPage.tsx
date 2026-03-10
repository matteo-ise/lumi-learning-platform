import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      await loginWithGoogle()
      // Redirect happens automatically via useAuth's onAuthStateChanged
      navigate('/app')
    } catch (err: any) {
      setError('Login mit Google fehlgeschlagen. Bitte versuche es erneut. 🛠️')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
      <div className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce delay-75">✨</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-20 animate-pulse">🌟</div>

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-primary/5 p-10 w-full max-w-md border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-mint to-primary/50"></div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-4 transition-transform hover:scale-110 duration-300">
            <span className="text-5xl">🐬</span>
          </div>
          <h1 className="text-4xl font-black text-dark tracking-tight mb-2">
            Willkommen bei <span className="text-primary">LUMI</span>
          </h1>
          <p className="text-dark/40 font-medium">Melde dich einfach mit Google an!</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-4 rounded-2xl text-lg font-bold text-dark hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
                <span>Mit Google anmelden</span>
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-2xl px-5 py-4 text-sm font-bold border border-red-100 animate-shake">
              {error}
            </div>
          )}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-50 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-dark/30 hover:text-dark/60 font-bold text-sm transition-colors"
          >
            <span>←</span> Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
