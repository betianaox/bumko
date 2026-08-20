import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from '../data'
import { auth, googleProvider, db, DEMO } from '../firebase'

const AuthContext = createContext(null)

const DEMO_USER = {
  email: 'demo@stokki.app',
  displayName: 'Usuario demo',
  teamData: { name: 'Usuario demo', role: 'admin' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO ? DEMO_USER : null)
  const [authorized, setAuthorized] = useState(DEMO)
  const [role, setRole] = useState(DEMO ? 'admin' : null)
  const [loading, setLoading] = useState(!DEMO)
  const [error, setError] = useState('')

  useEffect(() => {
    // En modo demo no hay login: entrás directo para poder ver la app.
    if (DEMO) return

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setError('')
      if (!fbUser) {
        setUser(null)
        setAuthorized(false)
        setRole(null)
        setLoading(false)
        return
      }
      try {
        const email = fbUser.email.toLowerCase()
        const ref = doc(db, 'equipo_autorizado', email)
        let snap = await getDoc(ref)

        // Primera vez que entra: se registra solo, siempre como staff.
        // Un admin después lo promueve o le corta el acceso desde Usuarios.
        if (!snap.exists()) {
          await setDoc(ref, {
            email,
            name: fbUser.displayName || email,
            role: 'staff',
            active: true,
            createdAt: serverTimestamp(),
          })
          snap = await getDoc(ref)
        }

        const data = snap.data() || {}
        setUser({ ...fbUser, teamData: data })
        setRole(data.role || 'staff')
        setAuthorized(data.active !== false)   // suspendido = entra pero no pasa
      } catch (e) {
        console.error(e)
        setUser(fbUser)
        setAuthorized(false)
        setRole(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async () => {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError('No se pudo iniciar sesión. Probá de nuevo.')
    }
  }

  const signOut = () => {
    if (DEMO) return
    return fbSignOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{ user, authorized, role, isAdmin: role === 'admin', loading, error, signIn, signOut, demo: DEMO }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
