import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, isFirebaseConfigured } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) {
      return
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })
  }, [])

  async function signInWithGoogle() {
    if (!auth) {
      setError('Firebase is not configured. Add the VITE_FIREBASE values to enable sign-in.')
      return false
    }

    setError('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      return true
    } catch {
      setError('Google sign-in could not be completed. Confirm the provider and domain are enabled in Firebase Auth.')
      return false
    }
  }

  async function signOutUser() {
    if (!auth) {
      return false
    }

    setError('')
    try {
      await signOut(auth)
      return true
    } catch {
      setError('Could not sign out. Please try again.')
      return false
    }
  }

  return { user, isLoading, error, signInWithGoogle, signOutUser }
}
