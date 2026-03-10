import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Always try to get a fresh token from Firebase if a user is logged in
  let token = localStorage.getItem('lumi_token')
  
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken(false) // Get fresh token, but only network if expired
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

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unbekannter Fehler' }))
    throw new Error(error.detail || `HTTP ${res.status}`)
  }

  return res.json()
}
