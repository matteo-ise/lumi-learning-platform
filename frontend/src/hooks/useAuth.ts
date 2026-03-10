import { useState, useEffect, useCallback } from 'react'
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from '../services/firebase'
import { apiFetch } from '../services/api'

interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  wizard_completed: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (fbUser: any) => {
    try {
      // Fetch user profile from OUR backend
      const profile = await apiFetch<{ wizard_completed?: boolean } | null>('/api/profile')
      
      setUser({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        wizard_completed: !!profile?.wizard_completed
      })
    } catch (err) {
      console.error("Profile fetch error:", err)
      // If profile fetch fails (e.g. 401), set base user and wizard not completed
      setUser({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        wizard_completed: false
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Save token immediately for apiFetch to use
        const token = await fbUser.getIdToken()
        localStorage.setItem('lumi_token', token)
        await fetchProfile(fbUser)
      } else {
        setUser(null)
        localStorage.removeItem('lumi_token')
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [fetchProfile])

  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (err) {
      console.error("Google Login Error:", err)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    localStorage.removeItem('lumi_token')
    setUser(null)
  }, [])

  const updateWizardCompleted = useCallback(() => {
    if (user) {
      setUser({ ...user, wizard_completed: true })
    }
  }, [user])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    loginWithGoogle,
    logout,
    updateWizardCompleted,
  }
}
