import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from '../data'
import { auth, googleProvider, db, DEMO, BAR_ID } from '../firebase'
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
  // Está en el equipo pero todavía no lo habilitaron
  const [pendiente, setPendiente] = useState(false)
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

        let bar = indice.exists() ? indice.data().barId : null

        // No pertenece a ningún bar todavía. Si esta instalación de la web
        // apunta a un bar con la puerta abierta, se suma solo como staff:
        // el equipo entra escaneando el link, sin que nadie los cargue de a uno.
        if (!bar && BAR_ID) {
          const puerta = await getDoc(doc(db, 'bares', BAR_ID))
          if (puerta.exists() && puerta.data().autoJoin) {
            await setDoc(barDoc(BAR_ID, 'equipo', email), {
              email,
              name: fbUser.displayName || email,
              role: 'staff',
              // Entra a la lista, pero apagado: poder anotarse solo no es lo
              // mismo que poder vender. Un admin lo habilita desde Equipo.
              active: false,
              createdAt: serverTimestamp(),
            })
            await setDoc(usuarioDoc(email), { barId: BAR_ID })
            bar = BAR_ID
          }
        }

        if (!bar) {
          // Ni invitado ni puerta abierta: no entra a ningún lado
          setUser(fbUser)
          setAuthorized(false)
          setBarId(null)
          setLoading(false)
          return
        }

        const miembro = await getDoc(barDoc(bar, 'equipo', email))
        const data = miembro.exists() ? miembro.data() : {}

        setUser({ ...fbUser, teamData: data })
        setBarId(bar)
        setRole(data.role || 'staff')
        // Suspendido entra igual: la app se muestra bloqueada por dentro, que
        // se entiende mucho mejor que un cartel en la puerta.
        setPendiente(miembro.exists() && data.active === false)
        setAuthorized(miembro.exists())
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
        pendiente,
        role: verComoStaff ? 'staff' : role,
        // dev puede lo mismo que admin: es un rol de mantenimiento, no de negocio.
        // Suspendido no puede nada, sea cual sea su rol.
        isAdmin: (role === 'admin' || role === 'dev') && !verComoStaff && !pendiente,
        isDev: role === 'dev' && !verComoStaff && !pendiente,
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
