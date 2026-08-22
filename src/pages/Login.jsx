import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const { user, authorized, pendiente, loading, error, signIn, signOut } = useAuth()

  /* Cuatro situaciones, una sola pantalla: cargando, sin sesión, esperando
     que lo habiliten, y con sesión abierta pero fuera de todo bar.
     Solo cambia lo que va debajo del logo. */
  return (
    <div className="login-screen">
      <Logo className="login-logo" />

      {loading ? null : !user ? (
        <>
          <p className="login-sub">Control de stock. Entrá con tu cuenta de Google del equipo.</p>
          <button className="google-btn" onClick={signIn}>
            <GoogleIcon />
            Iniciar sesión con Google
          </button>
          {error && <p className="login-error">{error}</p>}
        </>
      ) : pendiente ? (
        <>
          <div className="wait-badge">Esperando aprobación</div>
          <p className="login-sub">
            Ya quedaste anotado como <strong>{user.email}</strong>. Pedile a quien
            administra el bar que te habilite: hasta entonces no vas a poder
            registrar nada.
          </p>
          <button className="google-btn" onClick={() => window.location.reload()}>
            Ya me habilitaron
          </button>
          <button className="link-btn" onClick={signOut}>Entrar con otra cuenta</button>
        </>
      ) : !authorized ? (
        <>
          <p className="login-sub">
            Entraste como <strong>{user.email}</strong>, pero ese mail no está en
            ningún bar. Pedile a quien administra el tuyo que te sume con esa
            misma dirección.
          </p>
          <button className="google-btn" onClick={signOut}>Probar con otra cuenta</button>
        </>
      ) : null}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.71a5.4 5.4 0 010-3.42V4.96H.96a9 9 0 000 8.08l2.99-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"/>
    </svg>
  )
}
