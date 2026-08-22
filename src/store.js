import { create } from 'zustand'
import { doc, onSnapshot, orderBy, query } from './data'
import { barCol } from './bar'
import { db } from './firebase'

/* El estado del bar, en un solo lugar.

   Antes cada pantalla abría su propia escucha: al cambiar de pestaña la
   pantalla se montaba de cero, arrancaba con la lista vacía y hasta que
   llegaba el primer dato mostraba "todavía no hay nada" — un parpadeo que
   además decía algo falso. Y Eventos y Reportes escuchaban las mismas ventas
   por separado.

   Ahora las escuchas viven acá, atadas al bar y no a la pantalla: se abren
   una vez al entrar y siguen vivas mientras la sesión dure. Cambiar de
   pestaña es instantáneo porque los datos ya están.

   `listo` distingue "todavía no llegó nada" de "llegó y está vacío". Es la
   diferencia entre no decir nada y decir algo falso. */

const vacio = { items: [], listo: false }

const limpio = {
  barId: null,
  productos: vacio,
  eventos: vacio,
  ventas: vacio,
  equipo: vacio,
  bar: null,          // el documento del bar: nombre, dueño, entrada libre
  caja: null,         // la caja guardada para la próxima noche
}

export const useBar = create((set, get) => ({
  ...limpio,

  // Las bajas de cada escucha, para cortarlas al cambiar de bar o cerrar sesión
  _cortar: [],

  conectar: (barId) => {
    if (get().barId === barId) return
    get().desconectar()

    if (!barId) return

    const lista = (sub, campo, orden) => onSnapshot(
      query(barCol(barId, sub), orderBy(orden.campo, orden.dir)),
      (snap) => set({
        [campo]: { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), listo: true },
      }),
    )

    set({
      ...limpio,
      barId,
      _cortar: [
        lista('products', 'productos', { campo: 'name', dir: 'asc' }),
        lista('events', 'eventos', { campo: 'startedAt', dir: 'desc' }),
        lista('sales', 'ventas', { campo: 'createdAt', dir: 'desc' }),
        lista('equipo', 'equipo', { campo: 'email', dir: 'asc' }),

        onSnapshot(doc(db, 'bares', barId), (snap) => {
          set({ bar: snap.exists() ? snap.data() : null })
        }),

        onSnapshot(barCol(barId, 'settings'), (snap) => {
          const c = snap.docs.find((d) => d.id === 'caja')
          set({ caja: c ? c.data().openingCash ?? null : null })
        }),
      ],
    })
  },

  desconectar: () => {
    get()._cortar.forEach((cortar) => cortar())
    set({ ...limpio, _cortar: [] })
  },
}))
