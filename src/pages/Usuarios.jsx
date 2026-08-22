import { useEffect, useState } from 'react'
import { onSnapshot, doc, updateDoc, deleteDoc } from '../data'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { barCol, barDoc, usuarioDoc } from '../bar'
import Dialog from '../components/Dialog'
import Switch from '../components/Switch'
import { TrashIcon } from '../components/icons'
import Avatar from '../components/Avatar'

/* Quién trabaja en este bar. Con la entrada libre prendida, cualquiera que
   abra el link y entre con Google queda anotado — apagado, hasta que un admin
   lo habilite desde acá. */

/* dev es un rol de mantenimiento: puede lo mismo que un admin, pero lo que
   registra queda afuera de los reportes y de la caja de la noche. Solo un dev
   puede nombrar a otro dev, así un admin no puede ascenderse a sí mismo. */
const ROLES = [
  { id: 'dev', label: 'Dev' },
  { id: 'admin', label: 'Admin' },
  { id: 'staff', label: 'Staff' },
]


function fecha(ts) {
  const d = ts?.toDate ? ts.toDate() : null
  if (!d) return ''
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function Usuarios() {
  const { user, isAdmin, isDev, barId } = useAuth()
  const [users, setUsers] = useState([])
  const [dialog, setDialog] = useState(null)
  const [bar, setBar] = useState(null)

  useEffect(() => {
    if (!barId) return
    return onSnapshot(barCol(barId, 'equipo'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [barId])

  // La puerta abierta: mientras esté prendida, cualquiera que entre con Google
  // desde el link de esta web se suma solo como staff, sin que nadie lo invite.
  useEffect(() => {
    if (!barId) return
    return onSnapshot(doc(db, 'bares', barId), (snap) => {
      setBar(snap.exists() ? snap.data() : null)
    })
  }, [barId])

  const togglePuerta = async () => {
    await updateDoc(doc(db, 'bares', barId), { autoJoin: !bar?.autoJoin })
  }

  const setRole = async (u, role) => {
    if (u.role === role) return
    await updateDoc(barDoc(barId, 'equipo', u.id), { role })
  }

  const toggleActive = async (u) => {
    await updateDoc(barDoc(barId, 'equipo', u.id), { active: u.active === false })
  }

  const handleRemove = async () => {
    const u = dialog.user
    setDialog(null)
    await deleteDoc(barDoc(barId, 'equipo', u.id))
    // También del índice, si no queda apuntando a un bar donde ya no está
    await deleteDoc(usuarioDoc(u.id))
  }

  const soyYo = (u) => u.id === (user?.email || '').toLowerCase()
  const manda = (u) => u.role === 'admin' || u.role === 'dev'

  // No dejamos que el último que puede administrar se degrade o se borre:
  // quedaría un equipo sin nadie a cargo, y eso solo se arregla desde la
  // consola de Firebase.
  const conMando = users.filter(manda).length
  const ultimoAdmin = (u) => manda(u) && conMando <= 1

  // Nombrar o destituir devs es cosa de devs.
  const puedeTocarRol = (u, rol) => {
    if (!isAdmin) return false
    if (rol === 'dev' || u.role === 'dev') return isDev
    return !ultimoAdmin(u) || manda({ role: rol })
  }

  return (
    <div>
      <div className="section-title">Equipo ({users.length})</div>

      {!isAdmin && (
        <div className="notice">
          Solo un admin puede cambiar roles o dar de baja.
        </div>
      )}

      {isAdmin && (
        <div className="form-card">
          <div className="puerta">
            <div className="puerta-main">
              <div className="puerta-title">Entrada libre</div>
              <div className="puerta-sub">
                {bar?.autoJoin
                  ? 'Cualquiera que abra el link y entre con Google queda como staff.'
                  : 'Solo entra quien esté en la lista de abajo.'}
              </div>
            </div>
            <Switch
              checked={!!bar?.autoJoin}
              label="Entrada libre"
              onChange={togglePuerta}
            />
          </div>
        </div>
      )}

      <div className="user-list">
        {users.map((u) => {
          const inactivo = u.active === false
          return (
            <div className={'user-card' + (inactivo ? ' off' : '')} key={u.id}>
              <div className="user-head">
                <Avatar src={u.photo} name={u.name} email={u.email || u.id} size={44} />
                <div className="user-main">
                  <div className="user-name">
                    {u.name || u.email}
                    {soyYo(u) && <span className="you">vos</span>}
                  </div>
                  <div className="user-mail">{u.email || u.id}</div>
                  {u.createdAt && <div className="user-fechas">Entró: {fecha(u.createdAt)}</div>}
                </div>
              </div>

              <div className="user-actions">
                <div className="role-switch">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      className={'role-btn' + ((u.role || 'staff') === r.id ? ' selected' : '')}
                      disabled={!puedeTocarRol(u, r.id)}
                      onClick={() => setRole(u, r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <Switch
                  checked={!inactivo}
                  disabled={!isAdmin || ultimoAdmin(u) || (u.role === 'dev' && !isDev)}
                  label={inactivo ? 'Suspendido' : 'Activo'}
                  onChange={() => toggleActive(u)}
                />

                <button
                  className="icon-btn danger"
                  disabled={!isAdmin || ultimoAdmin(u) || (u.role === 'dev' && !isDev)}
                  onClick={() => setDialog({ user: u })}
                  aria-label="Sacar del equipo"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          )
        })}

        {users.length === 0 && (
          <div className="empty-state">Todavía no entró nadie con su cuenta de Google.</div>
        )}
      </div>

      {dialog && (
        <Dialog
          title={`¿Sacar a ${dialog.user.name || dialog.user.email}?`}
          sub="Pierde el acceso al bar. Si vuelve a entrar por el link, queda otra vez a la espera de que la habilites."
          confirmLabel="Sacar del equipo"
          danger
          onConfirm={handleRemove}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
