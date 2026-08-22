import { create } from 'zustand'
import { onSnapshot, orderBy, query } from './data'
import { barCol } from './bar'

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

export const useBar = create((set, get) => ({
  barId: null,
  productos: vacio,
  eventos: vacio,
  ventas: vacio,

  // Las bajas de cada escucha, para cortarlas al cambiar de bar o cerrar sesión
  _cortar: [],

  conectar: (barId) => {
    if (get().barId === barId) return
    get().desconectar()

    if (!barId) return

    const escuchar = (sub, campo, orden) => onSnapshot(
      query(barCol(barId, sub), orderBy(orden.campo, orden.dir)),
      (snap) => set({
        [campo]: { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), listo: true },
      }),
    )

    set({
      barId,
      productos: vacio,
      eventos: vacio,
      ventas: vacio,
      _cortar: [
        escuchar('products', 'productos', { campo: 'name', dir: 'asc' }),
        escuchar('events', 'eventos', { campo: 'startedAt', dir: 'desc' }),
        escuchar('sales', 'ventas', { campo: 'createdAt', dir: 'desc' }),
      ],
    })
  },

  desconectar: () => {
    get()._cortar.forEach((cortar) => cortar())
    set({ barId: null, productos: vacio, eventos: vacio, ventas: vacio, _cortar: [] })
  },
}))
