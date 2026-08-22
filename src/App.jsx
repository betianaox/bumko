import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { onSnapshot, query, where, limit } from './data'
import { barCol } from './bar'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Nav from './components/Nav'
import Venta from './pages/Venta'
import CargaInicial from './pages/CargaInicial'
import Eventos from './pages/Eventos'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import Pendiente from './pages/Pendiente'

/* El tab deshabilitado evita el clic, pero la URL se puede escribir a mano:
   la restricción de verdad va acá. Las reglas de Firestore son la tercera
   capa, y la única que no se puede saltar desde el navegador. */
function SoloAdmin({ isAdmin }) {
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  const { authorized, loading, isAdmin, barId, pendiente } = useAuth()
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    if (!authorized || !barId) return
    const q = query(barCol(barId, 'events'), where('status', '==', 'live'), limit(1))
    return onSnapshot(q, (snap) => {
      if (snap.empty) setActiveEvent(null)
      else setActiveEvent({ id: snap.docs[0].id, ...snap.docs[0].data() })
    })
  }, [authorized, barId])

  // Mientras resuelve, la misma pantalla con el logo y nada más: así el paso
  // por Google no parpadea entre el login y la app.
  if (loading || !authorized) return <Login />

  return (
    <div className="app-shell">
      <Nav activeEvent={activeEvent} />
      <div className="main">
        {pendiente ? <Pendiente /> : (
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
        )}
      </div>
    </div>
  )
}
