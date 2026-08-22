import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc } from '../data'
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

  // Corta la escucha del registro propio al cambiar de sesión
  const cortar = useRef(null)
  // Marca que esta sesión ya dejó registrada su visita
  const fichado = useRef(false)

  // Solo en demo: mirar la app como si fueras staff, para probar los permisos.
  // No se guarda en ningún lado; recargando volvés a admin.
  const [verComoStaff, setVerComoStaff] = useState(false)

  useEffect(() => {
    // En modo demo no hay login: entrás directo para poder ver la app.
    if (DEMO) return

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setError('')
      cortar.current?.()
      cortar.current = null
      fichado.current = false

      if (!fbUser) {
        setUser(null)
        setAuthorized(false)
        setRole(null)
        setBarId(null)
        setPendiente(false)
        setLoading(false)
        return
      }

      // Hay sesión pero todavía no sabemos a qué bar entra ni con qué rol.
      // Sin esto, el hueco entre que Google responde y que resolvemos el bar
      // se ve como un parpadeo de la pantalla de login.
      setLoading(true)

      try {
        const email = fbUser.email.toLowerCase()
        const indice = await getDoc(usuarioDoc(email))

        let bar = indice.exists() ? indice.data().barId : null

        /* No pertenece a ningún bar todavía. Si el bar tiene la puerta abierta
           se suma solo como staff: el equipo entra por el link, sin que nadie
           los cargue de a uno.

           A qué bar entra sale de VITE_BAR_ID; si esa variable falta —pasó una
           vez y dejó gente afuera en la puerta— y hay un único bar en la base,
           se usa ese. Con más de uno no se adivina: ahí la variable es la que
           decide, y sin ella la persona no entra a ninguno. */
        let destino = BAR_ID
        if (!bar && !destino) {
          const bares = await getDocs(query(collection(db, 'bares'), limit(2)))
          if (bares.docs.length === 1) destino = bares.docs[0].id
        }

        if (!bar && destino) {
          const puerta = await getDoc(doc(db, 'bares', destino))
          if (puerta.exists() && puerta.data().autoJoin) {
            await setDoc(barDoc(destino, 'equipo', email), {
              email,
              name: fbUser.displayName || email,
              role: 'staff',
              // Entra a la lista, pero apagado: poder anotarse solo no es lo
              // mismo que poder vender. Un admin lo habilita desde Equipo.
              active: false,
              createdAt: serverTimestamp(),
            })
            await setDoc(usuarioDoc(email), { barId: destino })
            bar = destino
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

        /* El registro se escucha, no se lee una vez: si un admin suspende a
           alguien en plena noche, la app se le bloquea en el momento, sin que
           tenga que cerrar sesión ni recargar. Y si lo vuelve a habilitar,
           se desbloquea igual de rápido. */
        cortar.current?.()
        cortar.current = onSnapshot(barDoc(bar, 'equipo', email), (miembro) => {
          const data = miembro.exists() ? miembro.data() : {}

          /* El nombre y la foto los pone Google, no la app: si el registro se
             creó a mano o la persona cambió su cuenta, acá se ponen al día.

             Una sola vez por sesión: esto corre dentro del onSnapshot, así que
             escribir vuelve a disparar el callback y sin el freno serían dos
             escrituras por cada entrada. */
          if (miembro.exists() && !fichado.current) {
            fichado.current = true
            setDoc(
              barDoc(bar, 'equipo', email),
              {
                name: fbUser.displayName || data.name || email,
                photo: fbUser.photoURL || null,
              },
              { merge: true },
            ).catch(() => {})
          }
          setUser({ ...fbUser, teamData: data })
          setBarId(bar)
          setRole(data.role || 'staff')
          // Suspendido entra igual: la app se muestra bloqueada por dentro,
          // que se entiende mucho mejor que un cartel en la puerta.
          setPendiente(miembro.exists() && data.active === false)
          setAuthorized(miembro.exists())
          setLoading(false)
        })
      } catch (e) {
        console.error(e)
        setUser(fbUser)
        setAuthorized(false)
        setBarId(null)
        setRole(null)
        setLoading(false)
      }
      /* Nada de apagar el "cargando" acá: onSnapshot devuelve enseguida pero
         el primer dato llega después, y en ese intervalo la app se creía sin
         sesión y mostraba el botón de Google. Cada rama lo apaga cuando de
         verdad terminó. */
    })
    return () => {
      cortar.current?.()
      unsub()
    }
  }, [])

  const signIn = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError('No se pudo iniciar sesión. Probá de nuevo.')
      setLoading(false)
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
