import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { SunIcon, MoonIcon, PowerIcon, LockIcon } from './icons'
import Logo from './Logo'

/* Iconos de línea, un solo color, heredando el del tab. Los emoji traían su
   propia paleta y cada sistema los dibuja distinto. */
const svg = (paths) => (
  <svg
    className="tab-icon"
    width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

/* adminOnly: el staff solo registra ventas. Las demás pestañas se muestran
   deshabilitadas en vez de esconderse, así se entiende que existen y que
   hay que pedirle acceso a un admin. */
const TABS = [
  {
    to: '/', label: 'Vender', end: true,
    icon: svg(<path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />),
  },
  {
    to: '/eventos', label: 'Eventos', adminOnly: true,
    icon: svg(<>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>),
  },
  {
    to: '/productos', label: 'Stock', adminOnly: true,
    icon: svg(<>
      <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>),
  },
  {
    to: '/reportes', label: 'Reportes', adminOnly: true,
    icon: svg(<path d="M5 21V11M12 21V4M19 21v-6" />),
  },
  {
    to: '/usuarios', label: 'Equipo', adminOnly: true,
    icon: svg(<>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>),
  },
]

export default function Nav({ activeEvent }) {
  const { signOut, demo, isAdmin, pendiente, verComoStaff, setVerComoStaff } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <>
      {/* Dos renglones: arriba la marca y los controles, abajo el evento.
          En una sola línea, un nombre de evento largo empujaba los botones
          fuera de la pantalla en el celular. */}
      <header className="topbar">
        <div className="topbar-row">
          <Logo className="brand-logo" />

          {/* Solo en demo: para poder ver la app con los permisos del staff */}
          {demo && (
            <button
              className={'role-peek' + (verComoStaff ? ' staff' : '')}
              onClick={() => setVerComoStaff(!verComoStaff)}
            >
              {verComoStaff ? 'staff' : 'admin'}
            </button>
          )}

          <button
            className="icon-btn"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* En demo no hay sesión que cerrar. El reset vive en Stock, abajo de todo:
              un ↺ acá arriba se lee como "deshacer" y no lo es. */}
          {!demo && (
            <button className="icon-btn" onClick={signOut} aria-label="Cerrar sesión">
              <PowerIcon />
            </button>
          )}
        </div>

        {activeEvent ? (
          <div className="event-chip live">
            <span className="pulse" />
            {activeEvent.name}
          </div>
        ) : (
          <div className="event-chip">Sin evento</div>
        )}
      </header>

      {/* La navegación va abajo: es donde llega el pulgar con el celular en una mano */}
      <nav className="tabbar">
        {TABS.map((t) => {
          // Suspendido no entra a ninguna pestaña, ni siquiera a vender
          if (pendiente || (t.adminOnly && !isAdmin)) {
            return (
              <span key={t.to} className="tab locked" aria-disabled="true" title="Solo para administradores">
                <span className="tab-lock-wrap">
                  {t.icon}
                  <span className="tab-lock"><LockIcon /></span>
                </span>
                {t.label}
              </span>
            )
          }
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
            >
              {t.icon}
              {t.label}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
