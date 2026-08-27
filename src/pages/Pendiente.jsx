import { useAuth } from '../context/AuthContext'
import { LockIcon } from '../components/icons'

/* Lo que ve alguien que está en el equipo pero todavía no lo habilitaron.
   Entra a la app y la ve entera — las cinco pestañas, la marca, el tema —
   pero nada responde. Se entiende mucho mejor "esto es tuyo y todavía no
   está abierto" que un cartel en la puerta. */
export default function Pendiente() {
  const { user, signOut } = useAuth()

  return (
    <div className="pendiente">
      <span className="pendiente-ico"><LockIcon /></span>

      <div className="pendiente-title">Todavía no estás habilitado</div>

      <p className="pendiente-sub">
        Entraste como <strong>{user?.email}</strong> y ya quedaste en la lista del
        equipo. Pide a quien administra el bar que te habilite: hasta entonces
        no vas a poder registrar ventas ni ver el resto.
      </p>

      <button className="btn-primary" onClick={() => window.location.reload()}>
        Ya me habilitaron
      </button>

      <button className="link-btn" onClick={signOut}>Entrar con otra cuenta</button>
    </div>
  )
}
