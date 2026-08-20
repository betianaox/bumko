import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Estas variables viven en tu archivo .env (no se sube al repo).
// Sacalas de: Firebase Console -> Configuración del proyecto -> Tus apps -> SDK setup.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Sin .env no hay Firebase posible: en vez de reventar al arrancar
// (auth/invalid-api-key) la app entra en modo demo con datos locales.
export const DEMO = !firebaseConfig.apiKey || !firebaseConfig.projectId

export const app = DEMO ? null : initializeApp(firebaseConfig)
export const auth = DEMO ? null : getAuth(app)
export const db = DEMO ? null : getFirestore(app)
export const googleProvider = DEMO ? null : new GoogleAuthProvider()

if (DEMO) {
  console.warn(
    '[Bumko] Modo demo: falta el archivo .env con las credenciales de Firebase. ' +
    'Los datos se guardan sólo en este navegador.',
  )
}
