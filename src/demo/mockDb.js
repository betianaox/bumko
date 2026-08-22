/* ============================================================
   Base de datos falsa, en memoria (+ localStorage).
   Existe sólo para poder ver y probar la interfaz sin Firebase.
   Imita la parte de la API de Firestore que usa la app, así las
   páginas no saben si están hablando con Firestore o con esto.
   ============================================================ */

// Subir el número descarta lo guardado en el navegador y vuelve a sembrar.
const STORAGE_KEY = 'bumko-demo-db-v3'

// ---------- Timestamps ----------
// Firestore devuelve objetos con .toDate(); acá lo replicamos.
function makeTs(date) {
  return {
    __ts: date.toISOString(),
    seconds: Math.floor(date.getTime() / 1000),
    toDate: () => date,
  }
}

function rehydrate(value) {
  if (Array.isArray(value)) return value.map(rehydrate)
  if (value && typeof value === 'object') {
    if (value.__ts) return makeTs(new Date(value.__ts))
    const out = {}
    for (const k of Object.keys(value)) out[k] = rehydrate(value[k])
    return out
  }
  return value
}

// ---------- Datos de arranque ----------

const SEED_PRODUCTS = [
  { name: 'Fernet', costPrice: 3200, salePrice: 8000, stock: 37, lowStockThreshold: 6 },
  { name: 'Cerveza', costPrice: 1400, salePrice: 4000, stock: 52, lowStockThreshold: 10 },
  { name: 'Gin', costPrice: 3800, salePrice: 9000, stock: 12, lowStockThreshold: 5 },
  { name: 'Vodka', costPrice: 3500, salePrice: 8500, stock: 4, lowStockThreshold: 5 },
  { name: 'Coca', costPrice: 800, salePrice: 2500, stock: 40, lowStockThreshold: 8 },
  { name: 'Sprite', costPrice: 800, salePrice: 2500, stock: 22, lowStockThreshold: 8 },
  { name: 'Agua', costPrice: 500, salePrice: 2000, stock: 30, lowStockThreshold: 8 },
  { name: 'Red Bull', costPrice: 2200, salePrice: 6000, stock: 18, lowStockThreshold: 6 },
]

const SEED_TEAM = {
  'demo@bumko.app': { email: 'demo@bumko.app', name: 'Usuario demo', role: 'admin', active: true },
  'sofia@bumko.app': { email: 'sofia@bumko.app', name: 'Sofía Ramírez', role: 'staff', active: true },
  'juan@bumko.app': { email: 'juan@bumko.app', name: 'Juan Pérez', role: 'staff', active: true },
  'pedro@bumko.app': { email: 'pedro@bumko.app', name: 'Pedro Molina', role: 'staff', active: false },
}

// El bar de la demo. Todo cuelga de acá, igual que en Firestore.
export const DEMO_BAR = 'bar-demo'

const bajo = (sub) => `bares/${DEMO_BAR}/${sub}`

/* Un mes de ventas inventadas, para poder mirar cómo quedan los reportes sin
   esperar a que pase una noche de verdad. Los números salen de una secuencia
   fija, no de Math.random: así la demo se ve igual en todos los teléfonos y
   dos capturas de pantalla se pueden comparar. */
function seedVentas(store) {
  let semilla = 7
  const azar = (n) => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648
    return semilla % n
  }

  const productos = SEED_PRODUCTS.map((p, i) => ({ id: `demo-p${i}`, ...p }))
  const gente = [
    { email: 'sofia@bumko.app', name: 'Sofía Ramírez' },
    { email: 'juan@bumko.app', name: 'Juan Pérez' },
    { email: 'demo@bumko.app', name: 'Usuario demo' },
  ]
  const motivos = ['Invitación del dueño', 'Cortesía a cliente', 'Staff', 'Error de cobro']

  // Tres noches: dos cerradas y la del último fin de semana
  const noches = [
    { dias: 22, nombre: 'Viernes', caja: 15000, ventas: 74 },
    { dias: 15, nombre: 'Sábado', caja: 20000, ventas: 118 },
    { dias: 8, nombre: 'Sábado', caja: 20000, ventas: 96 },
  ]

  noches.forEach((noche, n) => {
    const inicio = new Date()
    inicio.setDate(inicio.getDate() - noche.dias)
    inicio.setHours(22, 0, 0, 0)

    const eventId = `demo-ev${n}`
    let vendido = 0
    let costo = 0
    let regalados = 0

    for (let i = 0; i < noche.ventas; i++) {
      const p = productos[azar(productos.length)]
      const quien = gente[azar(gente.length)]

      // La noche arranca floja, explota a las 2 y se apaga a las 5
      const cuando = new Date(inicio.getTime() + (i / noche.ventas) * 7 * 3600 * 1000 + azar(600000))

      const tirada = azar(100)
      const modo = tirada < 8 ? 'gift' : tirada < 16 ? 'custom' : 'regular'
      const monto = modo === 'gift' ? 0
        : modo === 'custom' ? Math.round((p.salePrice * (60 + azar(30))) / 100 / 500) * 500
          : p.salePrice

      vendido += monto
      costo += p.costPrice
      if (modo === 'gift') regalados += 1

      store[bajo('sales')][`demo-s${n}-${i}`] = {
        productId: p.id,
        productName: p.name,
        mode: modo,
        amount: monto,
        costPrice: p.costPrice,
        reason: modo === 'gift' ? motivos[azar(motivos.length)] : null,
        who: null,
        eventId,
        dev: null,
        userEmail: quien.email,
        userName: quien.name,
        createdAt: makeTs(cuando),
      }
    }

    const cierre = new Date(inicio.getTime() + 7 * 3600 * 1000)
    // La última noche cerró con la caja justa; las otras dos, no tanto
    const diferencia = [-2500, 0, 1500][n]

    store[bajo('events')][eventId] = {
      name: `${noche.nombre} ${String(inicio.getDate()).padStart(2, '0')}/${String(inicio.getMonth() + 1).padStart(2, '0')}`,
      status: 'closed',
      openingCash: noche.caja,
      startedAt: makeTs(inicio),
      endedAt: makeTs(cierre),
      expectedCash: noche.caja + vendido,
      countedCash: noche.caja + vendido + diferencia,
      cashDiff: diferencia,
      resumen: { vendido, costo, resultado: vendido - costo, unidades: noche.ventas, regalados },
    }
  })
}

function freshStore() {
  const store = {
    bares: { [DEMO_BAR]: { name: 'Bar de ejemplo', ownerEmail: 'demo@bumko.app', autoJoin: true } },
    usuarios: {},
    [bajo('products')]: {},
    [bajo('sales')]: {},
    [bajo('events')]: {},
    [bajo('settings')]: {},
    [bajo('equipo')]: {},
  }

  SEED_PRODUCTS.forEach((p, i) => {
    store[bajo('products')][`demo-p${i}`] = { ...p }
  })

  for (const [id, u] of Object.entries(SEED_TEAM)) {
    store[bajo('equipo')][id] = { ...u }
    store.usuarios[id] = { barId: DEMO_BAR }
  }

  seedVentas(store)

  return store
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return rehydrate(JSON.parse(raw))
  } catch { /* localStorage bloqueado o json roto: arrancamos de cero */ }
  return freshStore()
}

let store = load()

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* ignorar */ }
}

export function resetDemoData() {
  store = freshStore()
  persist()
  // Avisa a todo el que esté escuchando, sea cual sea la colección
  listeners.forEach((l) => l.run())
}

// ---------- Suscripciones ----------

const listeners = []   // { col, run }

function notify(col) {
  listeners.filter((l) => l.col === col).forEach((l) => l.run())
}

// ---------- Referencias y constraints ----------

/* Rutas anidadas, igual que Firestore: collection(db, 'bares', id, 'products')
   y doc(db, 'bares', id, 'products', prodId). Acá la ruta de la colección se
   guarda como una clave plana ('bares/xxx/products'), que para una base falsa
   alcanza y sobra. */
export const collection = (_db, ...segs) => ({ __col: segs.join('/') })

export const doc = (_db, ...segs) => ({
  __col: segs.slice(0, -1).join('/'),
  __id: segs[segs.length - 1],
})

export const orderBy = (field, dir = 'asc') => ({ __c: 'orderBy', field, dir })
export const where = (field, op, value) => ({ __c: 'where', field, op, value })
export const limit = (n) => ({ __c: 'limit', n })

export const query = (ref, ...constraints) => ({ __col: ref.__col, constraints })

// ---------- Sentinelas de escritura ----------

export const increment = (n) => ({ __op: 'increment', n })
export const serverTimestamp = () => ({ __op: 'serverTimestamp' })

function resolveWrites(current, patch) {
  const out = { ...current }
  for (const [k, v] of Object.entries(patch)) {
    if (v && v.__op === 'increment') out[k] = (out[k] || 0) + v.n
    else if (v && v.__op === 'serverTimestamp') out[k] = makeTs(new Date())
    else out[k] = v
  }
  return out
}

// ---------- Lectura ----------

function compare(a, b) {
  const av = a?.toDate ? a.toDate().getTime() : a
  const bv = b?.toDate ? b.toDate().getTime() : b
  if (av == null && bv == null) return 0
  if (av == null) return -1
  if (bv == null) return 1
  if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv, 'es')
  return av < bv ? -1 : av > bv ? 1 : 0
}

function matches(data, c) {
  const v = data[c.field]
  switch (c.op) {
    case '==': return v === c.value
    case '!=': return v !== c.value
    case '>': return v > c.value
    case '>=': return v >= c.value
    case '<': return v < c.value
    case '<=': return v <= c.value
    default: return true
  }
}

function runQuery(q) {
  const col = store[q.__col] || {}
  const constraints = q.constraints || []
  let rows = Object.entries(col).map(([id, data]) => ({ id, data }))

  for (const c of constraints.filter((c) => c.__c === 'where')) {
    rows = rows.filter((r) => matches(r.data, c))
  }
  for (const c of constraints.filter((c) => c.__c === 'orderBy')) {
    rows.sort((a, b) => compare(a.data[c.field], b.data[c.field]) * (c.dir === 'desc' ? -1 : 1))
  }
  const lim = constraints.find((c) => c.__c === 'limit')
  if (lim) rows = rows.slice(0, lim.n)

  return {
    empty: rows.length === 0,
    docs: rows.map((r) => ({ id: r.id, data: () => ({ ...r.data }) })),
  }
}

export function onSnapshot(refOrQuery, cb) {
  // Escuchar un documento suelto devuelve el documento; escuchar una colección
  // devuelve la lista. Firestore distingue por el tipo de referencia y acá
  // alcanza con mirar si la referencia trae id.
  const esDoc = refOrQuery.__id !== undefined
  const q = refOrQuery.constraints ? refOrQuery : { __col: refOrQuery.__col, constraints: [] }

  const run = esDoc
    ? () => {
      const data = store[refOrQuery.__col]?.[refOrQuery.__id]
      cb({ exists: () => !!data, data: () => ({ ...data }), id: refOrQuery.__id })
    }
    : () => cb(runQuery(q))

  const entry = { col: q.__col, run }
  listeners.push(entry)
  run()
  return () => {
    const i = listeners.indexOf(entry)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export async function getDocs(q) {
  return runQuery(q.constraints ? q : { __col: q.__col, constraints: [] })
}

export async function getDoc(ref) {
  const data = store[ref.__col]?.[ref.__id]
  return { exists: () => !!data, data: () => ({ ...data }), id: ref.__id }
}

// ---------- Escritura ----------

export async function addDoc(ref, data) {
  const id = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  if (!store[ref.__col]) store[ref.__col] = {}
  store[ref.__col][id] = resolveWrites({}, data)
  persist()
  notify(ref.__col)
  return { id }
}

export async function setDoc(ref, data, options) {
  if (!store[ref.__col]) store[ref.__col] = {}
  const base = options?.merge ? store[ref.__col][ref.__id] || {} : {}
  store[ref.__col][ref.__id] = resolveWrites(base, data)
  persist()
  notify(ref.__col)
}

export async function updateDoc(ref, patch) {
  const col = store[ref.__col]
  if (!col || !col[ref.__id]) return
  col[ref.__id] = resolveWrites(col[ref.__id], patch)
  persist()
  notify(ref.__col)
}

export async function deleteDoc(ref) {
  if (store[ref.__col]) delete store[ref.__col][ref.__id]
  persist()
  notify(ref.__col)
}
