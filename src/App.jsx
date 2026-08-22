import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useBar } from './store'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Nav from './components/Nav'
import Venta from './pages/Venta'
import CargaInicial from './pages/CargaInicial'
import Eventos from './pages/Eventos'
import Usuarios from './pages/Usuarios'
import Pendiente from './pages/Pendiente'

/* Reportes se carga aparte: es la única pantalla que usa la librería de
   gráficos, y son 117 KB que no tiene por qué bajar quien solo va a vender.
   Se descarga la primera vez que se abre esa pestaña. */
const Reportes = lazy(() => import('./pages/Reportes'))

/* El tab deshabilitado evita el clic, pero la URL se puede escribir a mano:
   la restricción de verdad va acá. Las reglas de Firestore son la tercera
   capa, y la única que no se puede saltar desde el navegador. */
function SoloAdmin({ isAdmin }) {
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  const { authorized, loading, isAdmin, barId, pendiente } = useAuth()

  /* Las escuchas se abren una vez, acá, y viven mientras dure la sesión: las
     pantallas leen del store y cambiar de pestaña no vuelve a pedir nada. */
  const conectar = useBar((e) => e.conectar)
  const desconectar = useBar((e) => e.desconectar)
  const eventos = useBar((e) => e.eventos.items)

  useEffect(() => {
    if (authorized && barId) conectar(barId)
    else desconectar()
  }, [authorized, barId, conectar, desconectar])

  const activeEvent = eventos.find((e) => e.status === 'live') || null

  // Mientras resuelve, la misma pantalla con el logo y nada más: así el paso
  // por Google no parpadea entre el login y la app.
  if (loading || !authorized) return <Login />

  return (
    <div className="app-shell">
      <Nav activeEvent={activeEvent} />
      <div className="main">
        {pendiente ? <Pendiente /> : (
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Venta activeEvent={activeEvent} />} />
          <Route element={<SoloAdmin isAdmin={isAdmin} />}>
            <Route path="/eventos" element={<Eventos activeEvent={activeEvent} />} />
            <Route path="/productos" element={<CargaInicial />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        )}
      </div>
    </div>
  )
}
