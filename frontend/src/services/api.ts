import { auth } from './firebase'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Wait a tiny bit for Firebase to initialize if needed
  if (!auth.currentUser) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  let token = localStorage.getItem('lumi_token')
  
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
      localStorage.setItem('lumi_token', token)
    } catch (e) {
      console.error("Token refresh error:", e)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const fullUrl = `${API_URL}${cleanEndpoint}`

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || `Server meldet Fehler ${res.status}`)
    }

    return res.json()
  } catch (err: any) {
    console.error(`Fetch error for ${fullUrl}:`, err)
    if (err.message === 'Failed to fetch') {
      throw new Error('Verbindung zum Server fehlgeschlagen. Ist das Backend online?')
    }
    throw err
  }
}
