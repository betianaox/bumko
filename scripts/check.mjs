/* Muestra qué hay guardado, con la clave de servicio.
   Sirve para revisar el estado real de la base sin pasar por la app. */
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: cert(JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))) })
const db = getFirestore()

const bar = await db.doc('bares/casa').get()
console.log('bares/casa →', bar.exists ? bar.data() : 'NO EXISTE')

for (const sub of ['equipo', 'products', 'sales', 'events']) {
  const snap = await db.collection(`bares/casa/${sub}`).get()
  console.log(`${sub}: ${snap.size}`)
  snap.forEach((d) => console.log('   ', d.id, JSON.stringify(d.data())))
}

const us = await db.collection('usuarios').get()
console.log(`usuarios: ${us.size}`)
us.forEach((d) => console.log('   ', d.id, JSON.stringify(d.data())))
process.exit(0)
