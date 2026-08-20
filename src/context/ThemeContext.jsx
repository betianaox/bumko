import { createContext, useContext, useEffect, useState } from 'react'

/* Tema claro / oscuro.

   Hay tres valores posibles: 'dark', 'light' y 'system' (seguir al teléfono).
   Se guarda en localStorage, así la elección sobrevive a cerrar la app.
   Lo único que hace acá es poner data-theme en el <html>; de ahí en adelante
   todo el color sale de los tokens de global.css.

   El primer pintado lo resuelve un script en index.html, para que no se vea
   un destello del tema equivocado antes de que React arranque. */

const STORAGE_KEY = 'stokki-theme'
const ThemeContext = createContext(null)

// Colores de la barra del navegador en Android, uno por tema.
const BROWSER_BAR = { dark: '#0b0b10', light: '#f4f4f7' }

const prefersLight = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: light)').matches

const resolve = (pref) => (pref === 'system' ? (prefersLight() ? 'light' : 'dark') : pref)

function apply(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR[theme])
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'system' } catch { return 'system' }
  })

  const theme = resolve(preference)

  useEffect(() => { apply(theme) }, [theme])

  // Si eligió "seguir al sistema", el cambio de tema del teléfono se aplica solo.
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => apply(resolve('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  const setTheme = (pref) => {
    try { localStorage.setItem(STORAGE_KEY, pref) } catch { /* modo incógnito */ }
    setPreference(pref)
  }

  // El botón alterna entre claro y oscuro; deja de seguir al sistema.
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
