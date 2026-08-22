/* Crea el bar inicial, su primer admin y el índice de usuarios.
   Se corre una sola vez, con la clave de servicio:

     node scripts/bootstrap.mjs tu@mail.com [barId] [nombre del bar]

   Usa el SDK de administrador, que pasa por encima de las reglas de
   Firestore: por eso puede crear el primer admin, que desde la app no se
   podría (nadie puede darse permisos a sí mismo). */

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const [email, barId = 'casa', barName = 'Mi bar'] = process.argv.slice(2)

if (!email || !email.includes('@')) {
  console.error('Falta el mail del admin.\n  node scripts/bootstrap.mjs tu@mail.com [barId] [nombre]')
  process.exit(1)
}

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))
initializeApp({ credential: cert(key) })
const db = getFirestore()

const mail = email.toLowerCase()

await db.doc(`bares/${barId}`).set({
  name: barName,
  ownerEmail: mail,
  autoJoin: true,          // puerta abierta: se apaga desde la pestaña Equipo
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true })

await db.doc(`bares/${barId}/equipo/${mail}`).set({
  email: mail,
  name: mail.split('@')[0],
  role: 'admin',
  active: true,
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true })

await db.doc(`usuarios/${mail}`).set({ barId }, { merge: true })

console.log(`Bar "${barName}" (${barId}) listo, con ${mail} como admin.`)
