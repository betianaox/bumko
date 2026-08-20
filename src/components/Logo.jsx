import { useTheme } from '../context/ThemeContext'

/* El logo en un solo lugar. Hay una versión por tema porque el nombre va en
   blanco o en negro según el fondo; el ícono es el mismo rosa en las dos. */
const FILE = {
  dark: '/bumko-dark.png',
  light: '/bumko-light.png',
}

export default function Logo({ className = '' }) {
  const { theme } = useTheme()

  return (
    <img
      className={className}
      src={FILE[theme]}
      alt="Bumko"
      width="1674"
      height="272"
    />
  )
}
