import { useEffect, useState } from 'react'
import { onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from '../data'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { barCol, barDoc, usuarioDoc } from '../bar'
import Dialog from '../components/Dialog'
import Switch from '../components/Switch'
import { TrashIcon } from '../components/icons'

/* Quién trabaja en este bar. El admin invita por mail; esa persona entra con
   su cuenta de Google y ya queda adentro, como staff. Nadie se suma solo:
   sumarse solo sería meterse en el bar de otro. */

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
  const { user, isAdmin, barId } = useAuth()
  const [users, setUsers] = useState([])
  const [dialog, setDialog] = useState(null)
  const [nuevo, setNuevo] = useState('')
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

  // Invitar es anotar el mail: cuando esa persona entre con Google, la app
  // lo encuentra y la deja pasar a este bar. Sin esto no entra a ningún lado.
  const handleInvite = async () => {
    const email = nuevo.trim().toLowerCase()
    if (!email.includes('@')) return
    await setDoc(barDoc(barId, 'equipo', email), {
      email,
      name: email.split('@')[0],
      role: 'staff',
      active: true,
      createdAt: serverTimestamp(),
    })
    await setDoc(usuarioDoc(email), { barId })
    setNuevo('')
  }

  const handleRemove = async () => {
    const u = dialog.user
    setDialog(null)
    await deleteDoc(barDoc(barId, 'equipo', u.id))
    // También del índice, si no queda apuntando a un bar donde ya no está
    await deleteDoc(usuarioDoc(u.id))
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
          Solo un admin puede invitar gente, cambiar roles o dar de baja.
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

          <div className="form-row" style={{ marginBottom: 0, marginTop: 14 }}>
            <input
              type="email"
              inputMode="email"
              placeholder="O sumar un mail a mano"
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
            />
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '0 22px', marginTop: 0 }}
              disabled={!nuevo.includes('@')}
              onClick={handleInvite}
            >
              Sumar
            </button>
          </div>
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
          <div className="empty-state">Todavía no invitaste a nadie.</div>
        )}
      </div>

      {dialog && (
        <Dialog
          title={`¿Sacar a ${dialog.user.name || dialog.user.email}?`}
          sub="Pierde el acceso al bar. Para que vuelva, hay que invitarla de nuevo."
          confirmLabel="Sacar del equipo"
          danger
          onConfirm={handleRemove}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
