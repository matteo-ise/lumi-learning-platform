import { auth, onAuthStateChanged } from './firebase'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function waitForAuthInitialization(timeoutMs = 1500): Promise<void> {
  if (auth.currentUser) return

  await new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }

    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe()
      finish()
    })

    window.setTimeout(() => {
      unsubscribe()
      finish()
    }, timeoutMs)
  })
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await waitForAuthInitialization()
  const currentUser = auth.currentUser
  let token = localStorage.getItem('lumi_token')
  
  if (currentUser) {
    token = await currentUser.getIdToken()
    localStorage.setItem('lumi_token', token)
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
    const res = await fetch(fullUrl, { ...options, headers })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || `Server-Fehler ${res.status}`)
    }
    return res.json()
  } catch (err: any) {
    console.error("Fetch Error:", fullUrl, err)
    if (err instanceof Error) throw err
    throw new Error(`Verbindung fehlgeschlagen zu: ${fullUrl}. Prüfe VITE_API_URL!`)
  }
}
