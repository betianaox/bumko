import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, query, orderBy, addDoc, doc, setDoc,
  updateDoc, deleteDoc, increment,
} from '../data'
import { db } from '../firebase'
import { toneOf } from '../productTone'
import TonePicker from '../components/TonePicker'
import Dialog from '../components/Dialog'
import { TrashIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { resetDemoData } from '../demo/mockDb'

const money = (n) => '$' + (n || 0).toLocaleString('es-AR')

export default function CargaInicial({ activeEvent }) {
  const { demo } = useAuth()
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [threshold, setThreshold] = useState('')
  const [tone, setTone] = useState(null)
  const [editingTone, setEditingTone] = useState(null)
  const [dialog, setDialog] = useState(null)      // { kind: 'restock' | 'delete', product }

  const [cash, setCash] = useState('')
  const [savedCash, setSavedCash] = useState(0)   // caja guardada para la próxima noche

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'))
    return onSnapshot(q, (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  // Sin evento en curso la caja queda guardada acá y la toma el próximo evento.
  useEffect(() => {
    return onSnapshot(collection(db, 'settings'), (snap) => {
      const s = snap.docs.find((d) => d.id === 'caja')
      setSavedCash(s ? s.data().openingCash || 0 : 0)
    })
  }, [])

  const cajaActual = activeEvent ? (activeEvent.openingCash || 0) : savedCash

  const handleSaveCash = async () => {
    const n = cash === '' ? 0 : Number(cash)
    if (Number.isNaN(n)) return
    if (activeEvent) {
      await updateDoc(doc(db, 'events', activeEvent.id), { openingCash: n })
    } else {
      await setDoc(doc(db, 'settings', 'caja'), { openingCash: n }, { merge: true })
    }
    setCash('')
  }

  const canAdd = name.trim() && price !== '' && stock !== ''

  const handleAdd = async () => {
    if (!canAdd) return
    await addDoc(collection(db, 'products'), {
      name: name.trim(),
      costPrice: cost === '' ? 0 : Number(cost),
      salePrice: Number(price),
      stock: Number(stock),
      lowStockThreshold: threshold === '' ? 5 : Number(threshold),
      tone,
    })
    setName(''); setCost(''); setPrice(''); setStock(''); setThreshold(''); setTone(null)
  }

  const handleRestock = async (value) => {
    const p = dialog.product
    const n = Number(value)
    setDialog(null)
    if (value === '' || Number.isNaN(n)) return
    // increment y no stock + n: si otro está vendiendo al mismo tiempo, sumar
    // sobre el número que leímos hace un rato le pisaría las ventas.
    await updateDoc(doc(db, 'products', p.id), { stock: increment(n) })
  }

  const handleDelete = async () => {
    const p = dialog.product
    setDialog(null)
    await deleteDoc(doc(db, 'products', p.id))
  }

  const handleTone = async (p, t) => {
    await updateDoc(doc(db, 'products', p.id), { tone: t })
    setEditingTone(null)
  }

  return (
    <div>
      <div className="section-title">Caja inicial</div>
      <div className="form-card">
        <div className="cash-now">
          <span className="cash-val">{money(cajaActual)}</span>
          <span className="cash-lbl">
            {activeEvent ? `en ${activeEvent.name}` : 'para la próxima noche'}
          </span>
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Cambio con el que arrancás"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '0 22px', marginTop: 0 }}
            disabled={cash === ''}
            onClick={handleSaveCash}
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="section-title">Nuevo producto</div>
      <div className="form-card">
        <div className="form-row">
          <input placeholder="Nombre (ej. Cerveza)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <input className="small" placeholder="Costo $" type="number" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
          <input className="small" placeholder="Venta $" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="form-row">
          <input className="small" placeholder="Stock inicial" type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
          <input className="small" placeholder="Alerta stock bajo (ej. 5)" type="number" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>

        <div className="field-label">Color del botón</div>
        <TonePicker value={tone} name={name} onChange={setTone} />

        <button className="btn-primary" disabled={!canAdd} onClick={handleAdd}><span>＋</span> Agregar producto</button>
      </div>

      <div className="section-title">Productos cargados ({products.length})</div>
      <div className="product-list">
        {products.map((p) => (
          <div key={p.id}>
            <div className="product-row">
              <button
                className={'row-sw ' + toneOf(p)}
                onClick={() => setEditingTone(editingTone === p.id ? null : p.id)}
                title="Cambiar color"
              />
              <div className="row-main">
                <div className="name">{p.name}</div>
                <div className="meta">
                  {p.stock} en stock · ${p.salePrice.toLocaleString('es-AR')} · costo ${p.costPrice.toLocaleString('es-AR')}
                </div>
              </div>
              <div className="row-actions">
                <button className="icon-btn" onClick={() => setDialog({ kind: 'restock', product: p })}>＋</button>
                <button
                  className="icon-btn danger"
                  aria-label={`Borrar ${p.name}`}
                  onClick={() => setDialog({ kind: 'delete', product: p })}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {editingTone === p.id && (
              <div className="tone-editor">
                <TonePicker value={p.tone || null} name={p.name} onChange={(t) => handleTone(p, t)} />
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <div className="empty-state">
            <span className="em">📦</span>
            Todavía no hay productos cargados.
          </div>
        )}
      </div>

      {demo && (
        <button className="reset-link" onClick={() => setDialog({ kind: 'reset' })}>
          Resetear datos de ejemplo
        </button>
      )}

      {dialog?.kind === 'reset' && (
        <Dialog
          title="¿Volver a los datos de ejemplo?"
          sub="Se borra todo lo que registraste mientras probabas."
          confirmLabel="Resetear"
          danger
          onConfirm={() => { resetDemoData(); setDialog(null) }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'restock' && (
        <Dialog
          title={`Sumar a ${dialog.product.name}`}
          sub={`Ahora hay ${dialog.product.stock}. ¿Cuántas unidades entran?`}
          input={{ type: 'number', inputMode: 'numeric', initial: '10' }}
          confirmLabel="Sumar"
          onConfirm={handleRestock}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'delete' && (
        <Dialog
          title={`¿Borrar ${dialog.product.name}?`}
          sub="Desaparece de la pantalla de venta. Las ventas ya registradas quedan como están."
          confirmLabel="Borrar"
          danger
          onConfirm={handleDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
