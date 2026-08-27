import { useEffect, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, serverTimestamp } from '../data'
import { useAuth } from '../context/AuthContext'
import { barCol, barDoc } from '../bar'
import { useBar } from '../store'
import Dialog from '../components/Dialog'
import { PlayIcon, StopIcon, TrashIcon } from '../components/icons'

const money = (n) => '$' + (n || 0).toLocaleString('es-AR')

/* Borrar el evento no borra sus ventas, así que el cartel lo dice: lo que se
   pierde es la agrupación, no la plata. */
function textoBorrar(n) {
  if (n === 0) return 'No tiene ventas registradas: se borra solo el evento.'
  if (n === 1) return 'Su única venta queda en el historial, suelta y sin evento. La plata registrada no cambia.'
  return `Sus ${n} ventas quedan en el historial, sueltas y sin evento. La plata registrada no cambia.`
}

const CAJA_SUGERIDA = 0   // arranca en cero: el número lo pone quien cuenta la caja

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// "Sábado 23/08". Alcanza para distinguir una noche de otra, y si el evento
// tiene nombre propio se escribe encima.
function nombreSugerido(d = new Date()) {
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${DIAS[d.getDay()]} ${dia}/${mes}`
}

export default function Eventos({ activeEvent }) {
  const { barId, isAdmin } = useAuth()
  const [newName, setNewName] = useState(nombreSugerido)
  const [openingCash, setOpeningCash] = useState(String(CAJA_SUGERIDA))
  const [editingCash, setEditingCash] = useState(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [borrar, setBorrar] = useState(null)   // evento cerrado que se está por borrar

  const { items: events } = useBar((e) => e.eventos)
  const { items: ventas } = useBar((e) => e.ventas)

  // Lo de esta noche. Las pruebas de un dev no cuentan para la caja.
  const liveSales = activeEvent
    ? ventas.filter((s) => s.eventId === activeEvent.id && !s.dev)
    : []

  /* Si el bar tiene una caja guardada, gana sobre la sugerida: es la real.
     Se escribe en el campo para verla y poder cambiarla. */
  const guardada = useBar((e) => e.caja)
  const savedCash = guardada || 0

  useEffect(() => {
    if (!guardada) return
    setOpeningCash((actual) => (actual === String(CAJA_SUGERIDA) ? String(guardada) : actual))
  }, [guardada])

  const handleStart = async () => {
    const name = newName.trim() || nombreSugerido()
    await addDoc(barCol(barId, 'events'), {
      name,
      status: 'live',
      // Lo que hay en la caja antes de vender nada: sin esto, al cerrar
      // la noche no sabés si la plata que hay es la que tiene que haber.
      openingCash: openingCash === '' ? savedCash : Number(openingCash),
      startedAt: serverTimestamp(),
      endedAt: null,
    })
    setNewName(nombreSugerido())
    setOpeningCash(String(savedCash || CAJA_SUGERIDA))
  }

  /* El arqueo: al cerrar se cuenta la caja y se guarda lo contado junto a lo
     esperado. Sin esto, la app te dice cuánto debería haber pero nadie se
     entera nunca de cuánto había — que es la mitad que importa.

     Los totales quedan congelados en el evento, no se recalculan después: si
     mañana alguien corrige un precio, la noche cerrada no cambia. */
  const handleStop = async (contado) => {
    if (!activeEvent) return
    setConfirmStop(false)

    const contadoNum = contado === '' || contado == null ? null : Number(contado)

    await updateDoc(barDoc(barId, 'events', activeEvent.id), {
      status: 'closed',
      endedAt: serverTimestamp(),
      expectedCash: esperado,
      countedCash: contadoNum,
      cashDiff: contadoNum == null ? null : contadoNum - esperado,
      resumen: {
        vendido: recaudado,
        costo: costoTotal,
        resultado: recaudado - costoTotal,
        unidades,
        regalados,
      },
    })
  }

  /* Borrar un evento cerrado. Las ventas no se tocan: son plata que entró y
     mercadería que salió, y el reporte del mes tiene que seguir cerrando igual.
     Lo que se limpia es la referencia — quedan como ventas sueltas, "Sin
     evento" — para no dejar apuntando a un documento que ya no existe. */
  const handleDelete = async () => {
    const ev = borrar
    setBorrar(null)

    const suyas = ventas.filter((s) => s.eventId === ev.id)
    await Promise.all(
      suyas.map((s) => updateDoc(barDoc(barId, 'sales', s.id), { eventId: null }))
    )
    await deleteDoc(barDoc(barId, 'events', ev.id))
  }

  const handleSaveCash = async () => {
    await updateDoc(barDoc(barId, 'events', activeEvent.id), {
      openingCash: editingCash === '' ? 0 : Number(editingCash),
    })
    setEditingCash(null)
  }

  const recaudado = liveSales.reduce((sum, s) => sum + (s.amount || 0), 0)
  const costoTotal = liveSales.reduce((sum, s) => sum + (s.costPrice || 0), 0)

  // Un 2x1 son dos unidades en un solo registro: lo que se cuenta son unidades
  const cuantas = (s) => s.qty || 1
  const unidades = liveSales.reduce((sum, s) => sum + cuantas(s), 0)
  const regalados = liveSales
    .filter((s) => s.mode === 'gift')
    .reduce((sum, s) => sum + cuantas(s), 0)
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
              <div className="lbl">Total</div>
            </div>
          </div>

          <div className="event-meta" style={{ marginTop: 10 }}>
            {unidades} salieron · {regalados} regalados
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
            <button className="btn-stop" onClick={() => setConfirmStop(true)}><StopIcon /> Cerrar evento</button>
          </div>
        </div>
      ) : (
        <div className="form-card">
          <div className="form-title">Iniciar un evento</div>

          {/* Los dos campos vienen completos: el nombre con el día de hoy y la
              caja con lo último que se guardó. Así arrancar la noche es tocar
              un botón, y cambiar algo es opcional. */}
          <div className="field-label">Nombre</div>
          <div className="form-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="field-label">Caja inicial</div>
          <div className="form-row">
            <input
              type="number"
              inputMode="numeric"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <button className="btn-start" onClick={handleStart}><PlayIcon /> Iniciar evento</button>
        </div>
      )}

      {confirmStop && activeEvent && (
        <Dialog
          title="Cerrar la noche"
          sub={`Cuenta la caja y escribe cuánto hay. Según lo registrado tendría que haber ${money(esperado)}.`}
          input={{ type: 'number', inputMode: 'numeric', initial: String(esperado) }}
          confirmLabel="Cerrar evento"
          danger
          onConfirm={handleStop}
          onClose={() => setConfirmStop(false)}
        />
      )}

      {borrar && (
        <Dialog
          title={`¿Borrar ${borrar.name}?`}
          sub={textoBorrar(ventas.filter((s) => s.eventId === borrar.id).length)}
          confirmLabel="Borrar evento"
          danger
          onConfirm={handleDelete}
          onClose={() => setBorrar(null)}
        />
      )}

      <div className="section-title">Eventos anteriores</div>
      {events.filter((e) => e.status === 'closed').map((e) => {
        // La diferencia solo existe si alguien contó la caja al cerrar
        const dif = typeof e.cashDiff === 'number' ? e.cashDiff : null

        return (
          <div className="event-card" key={e.id}>
            <div className="event-name">{e.name}</div>
            <div className="event-meta">
              {e.startedAt?.toDate ? e.startedAt.toDate().toLocaleDateString('es-AR') : ''}
              {e.openingCash ? ` · arrancó con ${money(e.openingCash)}` : ''}
            </div>

            {e.resumen && (
              <>
                <div className="event-stats">
                  <div className="stat-box">
                    <div className="val">{money(e.resumen.vendido)}</div>
                    <div className="lbl">Vendido</div>
                  </div>
                  <div className="stat-box">
                    <div className="val">{money(e.resumen.costo)}</div>
                    <div className="lbl">Costo</div>
                  </div>
                  <div className="stat-box">
                    <div className={'val' + (e.resumen.resultado < 0 ? ' malo' : ' bueno')}>
                      {money(e.resumen.resultado)}
                    </div>
                    <div className="lbl">Resultado</div>
                  </div>
                </div>

                <div className="event-meta" style={{ marginTop: 10 }}>
                  {e.resumen.unidades} salieron · {e.resumen.regalados} regalados
                </div>
              </>
            )}

            {/* El arqueo (qué había contra qué tenía que haber) y el borrar
                comparten renglón: el pie de la tarjeta es la zona de cierre,
                y el tacho no se cruza con los números. */}
            <div className="event-foot">
              {dif !== null && (
                <div className={'arqueo' + (dif === 0 ? ' ok' : dif > 0 ? ' sobra' : ' falta')}>
                  {dif === 0
                    ? `Caja total: ${money(e.countedCash)}`
                    : dif > 0
                      ? `Sobraron ${money(dif)} — contaste ${money(e.countedCash)} de ${money(e.expectedCash)}`
                      : `Faltaron ${money(-dif)} — contaste ${money(e.countedCash)} de ${money(e.expectedCash)}`}
                </div>
              )}
              {isAdmin && (
                <button
                  className="icon-btn danger"
                  onClick={() => setBorrar(e)}
                  aria-label={`Borrar ${e.name}`}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>
        )
      })}
      {events.filter((e) => e.status === 'closed').length === 0 && (
        <div className="empty-state">Todavía no cerraste ningún evento.</div>
      )}
    </div>
  )
}
