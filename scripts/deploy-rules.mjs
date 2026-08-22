/* Publica firestore.rules usando la clave de servicio.

   El CLI de Firebase no sirve acá: antes de deployar quiere verificar que la
   API de Firestore esté habilitada, y para eso pide un permiso que la cuenta
   de servicio del Admin SDK no tiene. La API de reglas sí la puede usar.

     node scripts/deploy-rules.mjs */

import { readFileSync } from 'node:fs'
import { GoogleAuth } from 'google-auth-library'

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))
const source = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
const project = key.project_id

const auth = new GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})
const client = await auth.getClient()

const call = async (url, method, body) => {
  const res = await client.request({ url, method, data: body })
  return res.data
}

// 1. Subir el texto de las reglas como un "ruleset"
const ruleset = await call(
  `https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`,
  'POST',
  { source: { files: [{ name: 'firestore.rules', content: source }] } },
)
console.log('Ruleset creado:', ruleset.name)

// 2. Apuntar Firestore a ese ruleset
const release = `projects/${project}/releases/cloud.firestore`
try {
  await call(`https://firebaserules.googleapis.com/v1/projects/${project}/releases`, 'POST', {
    name: release,
    rulesetName: ruleset.name,
  })
  console.log('Reglas publicadas.')
} catch (e) {
  if (e.response?.status !== 409) throw e
  // Ya había reglas publicadas: se reemplaza la versión vigente
  await call(`https://firebaserules.googleapis.com/v1/${release}`, 'PATCH', {
    release: { name: release, rulesetName: ruleset.name },
  })
  console.log('Reglas actualizadas.')
}
