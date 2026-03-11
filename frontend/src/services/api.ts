import { auth } from './firebase'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Get a fresh token from Firebase
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

  // Ensure endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const fullUrl = `${API_URL}${cleanEndpoint}`

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Server-Fehler' }))
      throw new Error(error.detail || `HTTP ${res.status}`)
    }

    return res.json()
  } catch (err) {
    console.error(`Fetch error for ${fullUrl}:`, err)
    throw err
  }
}
