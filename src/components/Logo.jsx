import { useTheme } from '../context/ThemeContext'

/* El logo en un solo lugar. Hay una versión por tema porque el nombre va en
   un color que solo se lee sobre su fondo.
   Cuando esté el archivo del tema claro, se cambia acá y nada más. */
const FILE = {
  dark: '/logo.png',
  light: '/logo.png',
}

export default function Logo({ className = '' }) {
  const { theme } = useTheme()

  return (
    <img
      className={className}
      src={FILE[theme]}
      alt="Stokki"
      width="800"
      height="230"
    />
  )
}
