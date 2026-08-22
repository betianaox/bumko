import { useEffect, useState } from 'react'
import {
  onSnapshot, query, orderBy, addDoc,
  updateDoc, deleteDoc, increment,
} from '../data'
import { barCol, barDoc } from '../bar'
import { toneOf } from '../productTone'
import TonePicker from '../components/TonePicker'
import Dialog from '../components/Dialog'
import { TrashIcon, PlusIcon, BoxIcon, EyeIcon, EyeOffIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { resetDemoData } from '../demo/mockDb'

export default function CargaInicial() {
  const { demo, barId } = useAuth()
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [threshold, setThreshold] = useState('')
  const [tone, setTone] = useState(null)
  const [editingTone, setEditingTone] = useState(null)
  const [dialog, setDialog] = useState(null)      // { kind: 'restock' | 'delete', product }

  useEffect(() => {
    if (!barId) return
    const q = query(barCol(barId, 'products'), orderBy('name'))
    return onSnapshot(q, (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [barId])

  const canAdd = name.trim() && price !== '' && stock !== ''

  const handleAdd = async () => {
    if (!canAdd) return
    await addDoc(barCol(barId, 'products'), {
      name: name.trim(),
      costPrice: cost === '' ? 0 : Number(cost),
      salePrice: Number(price),
      stock: Number(stock),
      lowStockThreshold: threshold === '' ? 5 : Number(threshold),
      tone,
      visible: true,
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
    await updateDoc(barDoc(barId, 'products', p.id), { stock: increment(n) })
  }

  const handleDelete = async () => {
    const p = dialog.product
    setDialog(null)
    await deleteDoc(barDoc(barId, 'products', p.id))
  }

  const toggleVisible = async (p) => {
    await updateDoc(barDoc(barId, 'products', p.id), { visible: p.visible === false })
  }

  const handleTone = async (p, t) => {
    await updateDoc(barDoc(barId, 'products', p.id), { tone: t })
    setEditingTone(null)
  }

  return (
    <div>
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
          <input className="small" placeholder="Alerta stock" type="number" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>

        <div className="field-label">Color del botón</div>
        <TonePicker value={tone} onChange={setTone} />

        <button className="btn-primary" disabled={!canAdd} onClick={handleAdd}><PlusIcon /> Agregar producto</button>
      </div>

      <div className="section-title">Productos cargados ({products.length})</div>
      <div className="product-list">
        {products.map((p) => (
          <div key={p.id}>
            <div className={'product-row' + (p.visible === false ? ' oculto' : '')}>
              <button
                className={'row-sw ' + toneOf(p)}
                onClick={() => setEditingTone(editingTone === p.id ? null : p.id)}
                title="Cambiar color"
              />
              <div className="row-main">
                <div className="name">
                  {p.name}
                  {/* El ojo saca el producto de la pantalla de venta sin borrarlo:
                      lo que no hay esta noche, o lo que todavía no salió a la venta.
                      El stock y las ventas viejas quedan intactos. */}
                  <button
                    className={'eye' + (p.visible === false ? ' off' : '')}
                    onClick={() => toggleVisible(p)}
                    aria-pressed={p.visible !== false}
                    title={p.visible === false ? 'Oculto en la pantalla de venta' : 'A la venta'}
                    aria-label={p.visible === false ? `Mostrar ${p.name} en la pantalla de venta` : `Ocultar ${p.name} de la pantalla de venta`}
                  >
                    {p.visible === false ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className="meta">
                  {p.visible === false
                    ? 'Oculto en la pantalla de venta'
                    : `${p.stock} en stock · $${p.salePrice.toLocaleString('es-AR')} · costo $${p.costPrice.toLocaleString('es-AR')}`}
                </div>
              </div>
              <div className="row-actions">
                <button
                  className="icon-btn"
                  aria-label={`Sumar stock a ${p.name}`}
                  onClick={() => setDialog({ kind: 'restock', product: p })}
                >
                  <PlusIcon />
                </button>
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
                <TonePicker value={p.tone || null} onChange={(t) => handleTone(p, t)} />
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <div className="empty-state">
            <span className="em"><BoxIcon /></span>
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
