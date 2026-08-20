import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from '../data'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import Dialog from '../components/Dialog'
import Switch from '../components/Switch'
import { TrashIcon } from '../components/icons'

/* Quién puede usar la app. Cada persona que entra con Google queda registrada
   sola como staff; desde acá un admin le cambia el rol o le corta el acceso.
   Las restricciones concretas del staff todavía no están aplicadas: por ahora
   el rol se guarda, se muestra y se edita. */

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'staff', label: 'Staff' },
]

const initial = (u) => (u.name || u.email || '?').trim().charAt(0).toUpperCase()

function fecha(ts) {
  const d = ts?.toDate ? ts.toDate() : null
  if (!d) return ''
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Usuarios() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'equipo_autorizado'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const setRole = async (u, role) => {
    if (u.role === role) return
    await updateDoc(doc(db, 'equipo_autorizado', u.id), { role })
  }

  const toggleActive = async (u) => {
    await updateDoc(doc(db, 'equipo_autorizado', u.id), { active: u.active === false })
  }

  const handleRemove = async () => {
    const u = dialog.user
    setDialog(null)
    await deleteDoc(doc(db, 'equipo_autorizado', u.id))
  }

  const admins = users.filter((u) => u.role === 'admin').length
  const soyYo = (u) => u.id === (user?.email || '').toLowerCase()

  // No dejamos que el último admin se degrade o se borre: quedaría un equipo
  // sin nadie que pueda administrar, y solo se arregla desde la consola de Firebase.
  const ultimoAdmin = (u) => u.role === 'admin' && admins <= 1

  return (
    <div>
      <div className="section-title">Equipo ({users.length})</div>

      {!isAdmin && (
        <div className="notice">
          Solo un admin puede cambiar roles o dar de baja. Vos entrás como staff.
        </div>
      )}

      <div className="user-list">
        {users.map((u) => {
          const inactivo = u.active === false
          return (
            <div className={'user-card' + (inactivo ? ' off' : '')} key={u.id}>
              <div className="user-head">
                <span className="avatar">{initial(u)}</span>
                <div className="user-main">
                  <div className="user-name">
                    {u.name || u.email}
                    {soyYo(u) && <span className="you">vos</span>}
                  </div>
                  <div className="user-mail">{u.email || u.id}</div>
                  {u.createdAt && <div className="user-mail">Entró el {fecha(u.createdAt)}</div>}
                </div>
              </div>

              <div className="user-actions">
                <div className="role-switch">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      className={'role-btn' + ((u.role || 'staff') === r.id ? ' selected' : '')}
                      disabled={!isAdmin || (r.id === 'staff' && ultimoAdmin(u))}
                      onClick={() => setRole(u, r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <Switch
                  checked={!inactivo}
                  disabled={!isAdmin || ultimoAdmin(u)}
                  label={inactivo ? 'Suspendido' : 'Activo'}
                  onChange={() => toggleActive(u)}
                />

                <button
                  className="icon-btn danger"
                  disabled={!isAdmin || ultimoAdmin(u)}
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
          sub="Pierde el acceso a la app. Si vuelve a entrar con Google se registra de nuevo como staff."
          confirmLabel="Sacar del equipo"
          danger
          onConfirm={handleRemove}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
