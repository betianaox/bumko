import { collection, doc } from './data'
import { db } from './firebase'

/* Todo lo que produce un bar cuelga de su propio documento:

     bares/{barId}/products
     bares/{barId}/sales
     bares/{barId}/events
     bares/{barId}/settings
     bares/{barId}/equipo

   y un índice suelto para saber a qué bar entra cada persona:

     usuarios/{email} -> { barId }

   Así dos bares nunca se ven entre sí, y cuando exista la app nativa cada
   quien que la instale arma su bar sin tocar los demás. Las pantallas no
   escriben rutas a mano: piden barCol / barDoc y no saben cómo está armado. */

export const barCol = (barId, sub) => collection(db, 'bares', barId, sub)
export const barDoc = (barId, sub, id) => doc(db, 'bares', barId, sub, id)

// El índice de personas es global, no de un bar: por eso va aparte.
export const usuarioDoc = (email) => doc(db, 'usuarios', email.toLowerCase())
