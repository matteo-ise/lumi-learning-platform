import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../services/api'

interface User {
  user_id: number
  wizard_completed: boolean
}

interface LoginResponse {
  token: string
  user_id: number
  wizard_completed: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('lumi_token')
    const stored = localStorage.getItem('lumi_user')
    if (token && stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('lumi_token', data.token)
    const u: User = { user_id: data.user_id, wizard_completed: data.wizard_completed }
    localStorage.setItem('lumi_user', JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('lumi_token')
    localStorage.removeItem('lumi_user')
    setUser(null)
  }, [])

  const updateWizardCompleted = useCallback(() => {
    if (user) {
      const updated = { ...user, wizard_completed: true }
      localStorage.setItem('lumi_user', JSON.stringify(updated))
      setUser(updated)
    }
  }, [user])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateWizardCompleted,
  }
}
