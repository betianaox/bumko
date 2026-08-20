import { useEffect, useState } from 'react'
import { onSnapshot, query, orderBy, addDoc, updateDoc, serverTimestamp, where } from '../data'
import { useAuth } from '../context/AuthContext'
import { barCol, barDoc } from '../bar'
import Dialog from '../components/Dialog'

const money = (n) => '$' + (n || 0).toLocaleString('es-AR')

export default function Eventos({ activeEvent }) {
  const { barId } = useAuth()
  const [events, setEvents] = useState([])
  const [newName, setNewName] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [liveSales, setLiveSales] = useState([])
  const [editingCash, setEditingCash] = useState(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [savedCash, setSavedCash] = useState(0)

  useEffect(() => {
    if (!barId) return
    const q = query(barCol(barId, 'events'), orderBy('startedAt', 'desc'))
    return onSnapshot(q, (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [barId])

  useEffect(() => {
    if (!activeEvent || !barId) { setLiveSales([]); return }
    const q = query(barCol(barId, 'sales'), where('eventId', '==', activeEvent.id))
    return onSnapshot(q, (snap) => setLiveSales(snap.docs.map((d) => d.data())))
  }, [activeEvent, barId])

  // La caja que se dejó cargada desde Stock es el valor por defecto de la noche.
  useEffect(() => {
    if (!barId) return
    return onSnapshot(barCol(barId, 'settings'), (snap) => {
      const s = snap.docs.find((d) => d.id === 'caja')
      setSavedCash(s ? s.data().openingCash || 0 : 0)
    })
  }, [barId])

  const handleStart = async () => {
    const name = newName.trim() || `Evento ${new Date().toLocaleDateString('es-AR')}`
    await addDoc(barCol(barId, 'events'), {
      name,
      status: 'live',
      // Lo que hay en la caja antes de vender nada: sin esto, al cerrar
      // la noche no sabés si la plata que hay es la que tiene que haber.
      openingCash: openingCash === '' ? savedCash : Number(openingCash),
      startedAt: serverTimestamp(),
      endedAt: null,
    })
    setNewName('')
    setOpeningCash('')
  }

  const handleStop = async () => {
    if (!activeEvent) return
    setConfirmStop(false)
    await updateDoc(barDoc(barId, 'events', activeEvent.id), {
      status: 'closed',
      endedAt: serverTimestamp(),
      expectedCash: esperado,   // lo que tendría que haber en la caja al cerrar
    })
  }

  const handleSaveCash = async () => {
    await updateDoc(barDoc(barId, 'events', activeEvent.id), {
      openingCash: editingCash === '' ? 0 : Number(editingCash),
    })
    setEditingCash(null)
  }

  const recaudado = liveSales.reduce((sum, s) => sum + (s.amount || 0), 0)
  const regalados = liveSales.filter((s) => s.mode === 'gift').length
  const inicial = activeEvent?.openingCash || 0
  const esperado = inicial + recaudado

  return (
    <div>
      {activeEvent ? (
        <div className="event-card active">
          <div className="event-name">{activeEvent.name}</div>
          <div className="event-meta">Evento en curso</div>

          <div className="event-stats">
            <div className="stat-box">
              <div className="val">{money(inicial)}</div>
              <div className="lbl">Caja inicial</div>
            </div>
            <div className="stat-box">
              <div className="val">{money(recaudado)}</div>
              <div className="lbl">Vendido</div>
            </div>
            <div className="stat-box">
              <div className="val">{money(esperado)}</div>
              <div className="lbl">Debe haber</div>
            </div>
          </div>

          <div className="event-meta" style={{ marginTop: 10 }}>
            {liveSales.length} salieron · {regalados} regalados
          </div>

          {editingCash === null ? (
            <button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => setEditingCash(String(inicial))}>
              Ajustar caja inicial
            </button>
          ) : (
            <div className="form-row" style={{ marginTop: 14 }}>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={editingCash}
                onChange={(e) => setEditingCash(e.target.value)}
              />
              <button className="btn-ghost" style={{ width: 'auto', padding: '0 20px' }} onClick={handleSaveCash}>
                Guardar
              </button>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button className="btn-stop" onClick={() => setConfirmStop(true)}><span>⏹</span> Cerrar evento</button>
          </div>
        </div>
      ) : (
        <div className="form-card">
          <div className="form-title">Iniciar un evento</div>
          <div className="form-row">
            <input
              placeholder="Nombre (ej. Fiesta sábado)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <input
              type="number"
              inputMode="numeric"
              placeholder={savedCash ? `Caja inicial — guardada: ${money(savedCash)}` : 'Caja inicial $ (cambio con el que arrancás)'}
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />
          </div>
          <button className="btn-start" onClick={handleStart}><span>▶</span> Iniciar evento</button>
        </div>
      )}

      {confirmStop && activeEvent && (
        <Dialog
          title={`¿Cerrar ${activeEvent.name}?`}
          sub={`Deja de sumar ventas. En la caja tendría que haber ${money(esperado)}.`}
          confirmLabel="Cerrar evento"
          danger
          onConfirm={handleStop}
          onClose={() => setConfirmStop(false)}
        />
      )}

      <div className="section-title">Eventos anteriores</div>
      {events.filter((e) => e.status === 'closed').map((e) => (
        <div className="event-card" key={e.id}>
          <div className="event-name">{e.name}</div>
          <div className="event-meta">
            {e.startedAt?.toDate ? e.startedAt.toDate().toLocaleDateString('es-AR') : ''}
            {e.openingCash ? ` · arrancó con ${money(e.openingCash)} en caja` : ''}
          </div>
        </div>
      ))}
      {events.filter((e) => e.status === 'closed').length === 0 && (
        <div className="empty-state">Todavía no cerraste ningún evento.</div>
      )}
    </div>
  )
}
