/* Habilita o suspende a alguien del equipo, sin pasar por la app.

     node scripts/set-active.mjs mail@ejemplo.com off [barId]
     node scripts/set-active.mjs mail@ejemplo.com on  [barId]

   Sirve para probar la pantalla de "esperando aprobación" y para rescatar
   un bar donde no quedó nadie habilitado. */

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const [email, estado, barId = 'casa'] = process.argv.slice(2)

if (!email || !['on', 'off'].includes(estado)) {
  console.error('Uso: node scripts/set-active.mjs mail@ejemplo.com on|off [barId]')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))) })
await getFirestore().doc(`bares/${barId}/equipo/${email.toLowerCase()}`).update({ active: estado === 'on' })

console.log(`${email} quedó ${estado === 'on' ? 'habilitado' : 'suspendido'} en ${barId}.`)
process.exit(0)
