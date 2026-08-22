/* Cambia el rol de alguien del equipo, sin pasar por la app.

     node scripts/set-role.mjs tu@mail.com dev [barId]

   Hace falta para el primer dev y el primer admin: desde la app, nombrar a un
   dev es cosa de devs, y al principio no hay ninguno. */

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const [email, role, barId = 'casa'] = process.argv.slice(2)

if (!email || !['dev', 'admin', 'staff'].includes(role)) {
  console.error('Uso: node scripts/set-role.mjs mail@ejemplo.com dev|admin|staff [barId]')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))) })
const db = getFirestore()

const ref = db.doc(`bares/${barId}/equipo/${email.toLowerCase()}`)
if (!(await ref.get()).exists) {
  console.error(`${email} no está en el equipo de ${barId}.`)
  process.exit(1)
}

await ref.update({ role })
console.log(`${email} ahora es ${role} en ${barId}.`)
process.exit(0)
