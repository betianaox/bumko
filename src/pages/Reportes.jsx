import { useMemo, useState } from 'react'
import { useBar } from '../store'
import Picker from '../components/Picker'
import { ArrowRightIcon, CloseIcon, ListIcon, ChartIcon } from '../components/icons'
import { Columnas, Barras, Composicion } from '../components/Charts'

// "Por evento" dejó de ser una agrupación: ahora el evento es un filtro más,
// y elegido uno podés seguir mirándolo por día o por mes.
const VISTAS = [
  { id: 'lista', label: 'Listado', icon: <ListIcon /> },
  { id: 'graficos', label: 'Gráficos', icon: <ChartIcon /> },
]

const MODES = [
  { id: 'dia', label: 'Por día' },
  { id: 'mes', label: 'Por mes' },
]

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const pad = (n) => String(n).padStart(2, '0')

// Cada venta cae en un grupo con una etiqueta para mostrar y una clave para ordenar.
// Lo que no tiene fecha o evento no se descarta: va a su propio grupo al final.
function bucketFor(sale, mode, eventsById) {
  const d = sale.createdAt?.toDate ? sale.createdAt.toDate() : null

  if (mode === 'evento') {
    const ev = sale.eventId ? eventsById[sale.eventId] : null
    if (!ev) return { key: '__sin-evento', label: 'Sin evento', sort: '', sub: 'Ventas sueltas, fuera de un evento' }
    const start = ev.startedAt?.toDate ? ev.startedAt.toDate() : null
    return {
      key: sale.eventId,
      label: ev.name,
      sort: start ? String(start.getTime()) : '0',
      sub: start ? `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}` : '',
    }
  }

  if (!d) return { key: '__sin-fecha', label: 'Sin fecha', sort: '', sub: '' }

  if (mode === 'mes') {
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
      sort: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      sub: '',
    }
  }

  return {
    key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    sort: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    sub: '',
  }
}

// Clave comparable de un día, en hora local — la misma forma que usa <input type="date">
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Al entrar mostramos el mes en curso, que es lo que casi siempre se viene a ver.
// La ✕ lo limpia y ahí sí aparece todo el historial.
const mesActual = () => {
  const hoy = new Date()
  return [dayKey(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), dayKey(hoy)]
}

export default function Reportes() {
  const { items: sales, listo } = useBar((e) => e.ventas)
  const { items: events } = useBar((e) => e.eventos)
  const [mode, setMode] = useState('dia')
  const [from, setFrom] = useState(() => mesActual()[0])
  const [to, setTo] = useState(() => mesActual()[1])
  const [eventId, setEventId] = useState('')   // '' = no filtra por evento
  const [vista, setVista] = useState('lista')

  // El filtro corre sobre la fecha real de la venta, incluso cuando estás
  // mirando por evento: "el finde pasado, evento por evento" es una pregunta válida.
  const filtered = useMemo(() => {
    return sales.filter((s) => {
      // Lo registrado por un dev es prueba: nunca entra en los números
      if (s.dev) return false
      // El evento se cruza con las fechas: podés pedir "la fiesta del sábado"
      // y además acotarla, o mirar por día quedándote solo con ese evento.
      if (eventId && s.eventId !== eventId) return false
      if (!from && !to) return true
      const d = s.createdAt?.toDate ? s.createdAt.toDate() : null
      if (!d) return false          // sin fecha no puede entrar en un rango
      const k = dayKey(d)
      if (from && k < from) return false
      if (to && k > to) return false
      return true
    })
  }, [sales, from, to, eventId])

  const groups = useMemo(() => {
    const eventsById = Object.fromEntries(events.map((e) => [e.id, e]))
    const map = {}

    for (const s of filtered) {
      const b = bucketFor(s, mode, eventsById)
      if (!map[b.key]) {
        map[b.key] = {
          label: b.label, sub: b.sub, sort: b.sort,
          total: 0, costo: 0, count: 0, gifts: 0, customs: 0,
          giftReasons: {}, products: {}, users: {},
        }
      }
      const g = map[b.key]
      g.total += s.amount || 0
      // Lo que salió cuesta igual aunque se haya regalado: el costo suma
      // siempre, sin mirar cómo salió la unidad.
      g.costo += s.costPrice || 0
      g.count += 1
      if (s.mode === 'gift') {
        g.gifts += 1
        const r = s.reason || 'Otro'
        g.giftReasons[r] = (g.giftReasons[r] || 0) + 1
      }
      if (s.mode === 'custom') g.customs += 1
      g.products[s.productName] = (g.products[s.productName] || 0) + 1
      const quien = s.userName || s.userEmail || 'Sin identificar'
      g.users[quien] = (g.users[quien] || 0) + 1
    }

    // Más reciente arriba; los grupos sin fecha/evento (sort vacío) van al fondo.
    return Object.values(map).sort((a, b) => b.sort.localeCompare(a.sort))
  }, [filtered, events, mode])

  /* Los gráficos miran todo el período filtrado junto, no grupo por grupo:
     la pregunta ahí es "cómo viene el mes", no "qué pasó el martes". */
  const resumen = useMemo(() => {
    const total = { plata: 0, costo: 0, unidades: 0, regalos: 0, especiales: 0, productos: {}, gente: {} }

    for (const s of filtered) {
      total.plata += s.amount || 0
      total.costo += s.costPrice || 0
      total.unidades += 1
      if (s.mode === 'gift') total.regalos += 1
      if (s.mode === 'custom') total.especiales += 1
      total.productos[s.productName] = (total.productos[s.productName] || 0) + 1
      const quien = s.userName || s.userEmail || 'Sin identificar'
      total.gente[quien] = (total.gente[quien] || 0) + 1
    }

    // La serie va al revés que el listado: en el tiempo se lee de izquierda a derecha
    const serie = [...groups].reverse().map((g) => ({
      label: g.label,
      short: mode === 'mes' ? g.label.split(' ')[0].slice(0, 3) : g.label.slice(0, 5),
      value: g.total,
    }))

    const ranking = (obj, n) => Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, value]) => ({ label, value }))

    return {
      ...total,
      serie,
      topProductos: ranking(total.productos, 8),
      topGente: ranking(total.gente, 8),
      regulares: total.unidades - total.regalos - total.especiales,
    }
  }, [filtered, groups, mode])

  return (
    <div>
      {/* Agrupación y evento en la misma línea: son las dos decisiones gruesas.
          "Sin evento" es el estado limpio del selector, no filtra nada. */}
      <div className="filter-row">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={'seg' + (mode === m.id ? ' selected' : '')}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}

        <div className="picker-slot">
          <Picker
            title="Filtrar por evento"
            value={eventId}
            onChange={setEventId}
            options={[
              { value: '', label: 'Sin evento', hint: 'Todo el historial' },
              ...events.map((e) => {
                const d = e.startedAt?.toDate ? e.startedAt.toDate() : null
                return {
                  value: e.id,
                  label: e.name,
                  hint: [
                    d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : null,
                    e.status === 'live' ? 'en curso' : null,
                  ].filter(Boolean).join(' · '),
                }
              }),
            ]}
          />
        </div>
      </div>

      <div className="date-row">
        <input
          type="date"
          aria-label="Desde"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span className="date-sep"><ArrowRightIcon /></span>
        <input
          type="date"
          aria-label="Hasta"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
        />
        {(from || to) && (
          <button
            className="date-clear"
            title="Ver todo el historial"
            aria-label="Quitar el filtro de fechas"
            onClick={() => { setFrom(''); setTo('') }}
          >
            <CloseIcon />
          </button>
        )}

      </div>

      {listo && groups.length === 0 && (
        <div className="empty-state">
          {from || to || eventId
            ? 'No hay ventas con esos filtros.'
            : 'Todavía no hay ventas registradas.'}
        </div>
      )}

      {vista === 'graficos' && groups.length > 0 && (
        <>
          <div className="event-stats" style={{ marginTop: 0, marginBottom: 14 }}>
            <div className="stat-box">
              <div className="val">${resumen.plata.toLocaleString('es-AR')}</div>
              <div className="lbl">Recaudado</div>
            </div>
            <div className="stat-box">
              <div className="val">{resumen.unidades}</div>
              <div className="lbl">Entregados</div>
            </div>
            <div className="stat-box">
              <div className="val">{resumen.regalos}</div>
              <div className="lbl">Regalos</div>
            </div>
          </div>

          {/* La plata de verdad: lo que costó lo que salió, y lo que quedó.
              Va aparte de los otros tres porque es otra pregunta. */}
          <div className="event-stats dos" style={{ marginTop: 0, marginBottom: 14 }}>
            <div className="stat-box">
              <div className="val">${resumen.costo.toLocaleString('es-AR')}</div>
              <div className="lbl">Costo</div>
            </div>
            <div className="stat-box">
              <div className={'val' + (resumen.plata - resumen.costo < 0 ? ' malo' : ' bueno')}>
                ${(resumen.plata - resumen.costo).toLocaleString('es-AR')}
              </div>
              <div className="lbl">Resultado</div>
            </div>
          </div>

          <Columnas
            title={mode === 'mes' ? 'Recaudado por mes' : 'Recaudado por día'}
            data={resumen.serie}
          />

          <Composicion
            title="Cómo salió cada unidad"
            parts={[
              { label: 'Precio regular', value: resumen.regulares, tone: 'c1' },
              { label: 'Precio especial', value: resumen.especiales, tone: 'c2' },
              { label: 'Regalados', value: resumen.regalos, tone: 'c3' },
            ]}
          />

          <Barras title="Más vendidos" data={resumen.topProductos} empty="Sin ventas" />

          <Barras
            title="Quién registró"
            data={resumen.topGente}
            empty="Sin registros"
          />
        </>
      )}

      {vista === 'lista' && groups.map((g) => {
        const topProducts = Object.entries(g.products).sort((a, b) => b[1] - a[1]).slice(0, 5)
        const topUsers = Object.entries(g.users).sort((a, b) => b[1] - a[1])
        return (
          <div className="event-card" key={g.label + g.sort}>
            <div className="event-name">{g.label}</div>
            {g.sub && <div className="event-meta">{g.sub}</div>}

            <div className="event-stats">
              <div className="stat-box">
                <div className="val">${g.total.toLocaleString('es-AR')}</div>
                <div className="lbl">Recaudado</div>
              </div>
              <div className="stat-box">
                <div className="val">{g.count}</div>
                <div className="lbl">Entregados</div>
              </div>
              <div className="stat-box">
                <div className="val">{g.gifts}</div>
                <div className="lbl">Regalos</div>
              </div>
            </div>

            <div className="event-stats dos">
              <div className="stat-box">
                <div className="val">${g.costo.toLocaleString('es-AR')}</div>
                <div className="lbl">Costo</div>
              </div>
              <div className="stat-box">
                <div className={'val' + (g.total - g.costo < 0 ? ' malo' : ' bueno')}>
                  ${(g.total - g.costo).toLocaleString('es-AR')}
                </div>
                <div className="lbl">Resultado</div>
              </div>
            </div>

            {(g.customs > 0 || g.gifts > 0) && (
              <div className="event-meta" style={{ marginTop: 10, marginBottom: 0 }}>
                {g.count - g.gifts - g.customs} al precio regular
                {g.customs > 0 && ` · ${g.customs} con precio especial`}
                {g.gifts > 0 && ` · ${g.gifts} regaladas`}
              </div>
            )}

            {topProducts.length > 0 && (
              <>
                <div className="section-title">Más vendidos</div>
                {topProducts.map(([name, count]) => (
                  <div className="breakdown-row" key={name}>
                    <span className="n">{name}</span>
                    <span className="v">{count}</span>
                  </div>
                ))}
              </>
            )}

            {Object.keys(g.giftReasons).length > 0 && (
              <>
                <div className="section-title">Regalos por motivo</div>
                {Object.entries(g.giftReasons).map(([reason, count]) => (
                  <div className="breakdown-row" key={reason}>
                    <span className="n">{reason}</span>
                    <span className="v">{count}</span>
                  </div>
                ))}
              </>
            )}

            {topUsers.length > 0 && (
              <>
                <div className="section-title">Quién registró</div>
                {topUsers.map(([name, count]) => (
                  <div className="breakdown-row" key={name}>
                    <span className="n">{name}</span>
                    <span className="v">{count}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )
      })}

      {/* Cambiar de vista no cambia los datos, así que vive aparte de los
          filtros: flota abajo a la derecha, al alcance del pulgar. */}
      <div className="view-toggle">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            className={'view-ico' + (vista === v.id ? ' selected' : '')}
            onClick={() => setVista(v.id)}
            title={v.label}
            aria-label={v.label}
            aria-pressed={vista === v.id}
          >
            {v.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
