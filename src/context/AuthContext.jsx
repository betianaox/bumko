import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { getDoc } from '../data'
import { auth, googleProvider, DEMO } from '../firebase'
import { barDoc, usuarioDoc } from '../bar'
import { DEMO_BAR } from '../demo/mockDb'

/* Quién entra, a qué bar, y con qué rol.

   Al iniciar sesión se resuelve en dos pasos:
     usuarios/{email}             -> a qué bar pertenece
     bares/{barId}/equipo/{email} -> su rol y si sigue habilitado

   Sin el primero, la persona no pertenece a ningún bar: la app no la deja
   pasar y le dice que pida que la inviten. Nadie se agrega solo, porque
   agregarse solo significaría meterse en el bar de otro. */

const AuthContext = createContext(null)

const DEMO_USER = {
  email: 'demo@bumko.app',
  displayName: 'Usuario demo',
  teamData: { name: 'Usuario demo', role: 'admin' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO ? DEMO_USER : null)
  const [authorized, setAuthorized] = useState(DEMO)
  const [role, setRole] = useState(DEMO ? 'admin' : null)
  const [barId, setBarId] = useState(DEMO ? DEMO_BAR : null)
  const [loading, setLoading] = useState(!DEMO)
  const [error, setError] = useState('')

  // Solo en demo: mirar la app como si fueras staff, para probar los permisos.
  // No se guarda en ningún lado; recargando volvés a admin.
  const [verComoStaff, setVerComoStaff] = useState(false)

  useEffect(() => {
    // En modo demo no hay login: entrás directo para poder ver la app.
    if (DEMO) return

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setError('')
      if (!fbUser) {
        setUser(null)
        setAuthorized(false)
        setRole(null)
        setBarId(null)
        setLoading(false)
        return
      }

      try {
        const email = fbUser.email.toLowerCase()
        const indice = await getDoc(usuarioDoc(email))

        if (!indice.exists()) {
          // Entró con Google pero nadie la invitó a ningún bar
          setUser(fbUser)
          setAuthorized(false)
          setBarId(null)
          setLoading(false)
          return
        }

        const bar = indice.data().barId
        const miembro = await getDoc(barDoc(bar, 'equipo', email))
        const data = miembro.exists() ? miembro.data() : {}

        setUser({ ...fbUser, teamData: data })
        setBarId(bar)
        setRole(data.role || 'staff')
        setAuthorized(miembro.exists() && data.active !== false)
      } catch (e) {
        console.error(e)
        setUser(fbUser)
        setAuthorized(false)
        setBarId(null)
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
      value={{
        user,
        barId,
        authorized,
        role: verComoStaff ? 'staff' : role,
        isAdmin: role === 'admin' && !verComoStaff,
        loading,
        error,
        signIn,
        signOut,
        demo: DEMO,
        verComoStaff,
        setVerComoStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
