import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { collection, onSnapshot, query, where, limit } from './data'
import { db } from './firebase'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Nav from './components/Nav'
import Venta from './pages/Venta'
import CargaInicial from './pages/CargaInicial'
import Eventos from './pages/Eventos'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'

export default function App() {
  const { authorized, loading } = useAuth()
  const [activeEvent, setActiveEvent] = useState(null)

  useEffect(() => {
    if (!authorized) return
    const q = query(collection(db, 'events'), where('status', '==', 'live'), limit(1))
    return onSnapshot(q, (snap) => {
      if (snap.empty) setActiveEvent(null)
      else setActiveEvent({ id: snap.docs[0].id, ...snap.docs[0].data() })
    })
  }, [authorized])

  if (loading) return null
  if (!authorized) return <Login />

  return (
    <div className="app-shell">
      <Nav activeEvent={activeEvent} />
      <div className="main">
        <Routes>
          <Route path="/" element={<Venta activeEvent={activeEvent} />} />
          <Route path="/eventos" element={<Eventos activeEvent={activeEvent} />} />
          <Route path="/productos" element={<CargaInicial activeEvent={activeEvent} />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </div>
    </div>
  )
}
