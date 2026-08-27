import { useEffect, useState } from 'react'
import { addDoc, updateDoc, deleteDoc, increment } from '../data'
import { barCol, barDoc } from '../bar'
import { toneOf } from '../productTone'
import { useBar } from '../store'
import TonePicker from '../components/TonePicker'
import Dialog from '../components/Dialog'
import { TrashIcon, PlusIcon, BoxIcon, EyeIcon, EyeOffIcon, PencilIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { resetDemoData } from '../demo/mockDb'

export default function CargaInicial() {
  const { demo, barId } = useAuth()
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [threshold, setThreshold] = useState('')
  const [promo, setPromo] = useState('')
  const [tone, setTone] = useState(null)
  const [editingTone, setEditingTone] = useState(null)
  const [dialog, setDialog] = useState(null)      // { kind, product }
  const [edicion, setEdicion] = useState(null)    // campos del producto que se está editando

  const { items: products, listo } = useBar((e) => e.productos)

  const canAdd = name.trim() && price !== '' && stock !== ''

  const handleAdd = async () => {
    if (!canAdd) return
    await addDoc(barCol(barId, 'products'), {
      name: name.trim(),
      costPrice: cost === '' ? 0 : Number(cost),
      salePrice: Number(price),
      stock: Number(stock),
      lowStockThreshold: threshold === '' ? 5 : Number(threshold),
      // Precio de los dos juntos. Sin precio no hay 2x1: el botón de la
      // pantalla de venta aparece solo si este número existe.
      promoPrice: promo === '' ? null : Number(promo),
      tone,
      visible: true,
    })
    setName(''); setCost(''); setPrice(''); setStock(''); setThreshold(''); setPromo(''); setTone(null)
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

  /* La promo es el precio: sin precio no hay 2x1, así que vaciar el campo la
     apaga y no hace falta un interruptor aparte. */
  const handlePromo = async (value) => {
    const p = dialog.product
    const n = value === '' ? null : Number(value)
    setDialog(null)
    if (n !== null && Number.isNaN(n)) return
    await updateDoc(barDoc(barId, 'products', p.id), { promoPrice: n })
  }

  /* Editar un producto ya cargado. Antes solo se podía corregir el stock: un
     precio mal tipeado obligaba a borrarlo y volver a crearlo. */
  const abrirEdicion = (p) => {
    setEdicion({
      id: p.id,
      name: p.name,
      cost: String(p.costPrice ?? ''),
      price: String(p.salePrice ?? ''),
      threshold: String(p.lowStockThreshold ?? ''),
      promo: p.promoPrice ? String(p.promoPrice) : '',
    })
  }

  const guardarEdicion = async () => {
    const e = edicion
    setEdicion(null)
    if (!e.name.trim() || e.price === '') return

    await updateDoc(barDoc(barId, 'products', e.id), {
      name: e.name.trim(),
      costPrice: e.cost === '' ? 0 : Number(e.cost),
      salePrice: Number(e.price),
      lowStockThreshold: e.threshold === '' ? 5 : Number(e.threshold),
      promoPrice: e.promo === '' ? null : Number(e.promo),
    })
  }

  // El stock no se edita acá: se suma con el + o baja vendiendo. Escribirlo a
  // mano pisaría lo que otro vendió mientras tanto.
  const campo = (k) => (v) => setEdicion((e) => ({ ...e, [k]: v }))

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
        <div className="form-row">
          <input placeholder="2x1 $ (los dos juntos, opcional)" type="number" inputMode="decimal" value={promo} onChange={(e) => setPromo(e.target.value)} />
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
                {/* El 2x1 se prende y se apaga durante la noche, así que se
                    edita desde acá y no hay que volver a cargar el producto. */}
                <button
                  className={'promo-tag' + (p.promoPrice ? ' on' : '')}
                  aria-label={`Precio 2x1 de ${p.name}`}
                  onClick={() => setDialog({ kind: 'promo', product: p })}
                >
                  2×1
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Sumar stock a ${p.name}`}
                  onClick={() => setDialog({ kind: 'restock', product: p })}
                >
                  <PlusIcon />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Editar ${p.name}`}
                  onClick={() => abrirEdicion(p)}
                >
                  <PencilIcon />
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
        {listo && products.length === 0 && (
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

      {edicion && (
        <Dialog
          title="Editar producto"
          confirmLabel="Guardar"
          onConfirm={guardarEdicion}
          onClose={() => setEdicion(null)}
        >
          <div className="field-label">Nombre</div>
          <div className="form-row">
            <input value={edicion.name} onChange={(e) => campo('name')(e.target.value)} />
          </div>

          <div className="form-row">
            <label className="campo">
              <span className="field-label">Costo $</span>
              <input
                type="number"
                inputMode="decimal"
                value={edicion.cost}
                onChange={(e) => campo('cost')(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <label className="campo">
              <span className="field-label">Venta $</span>
              <input
                type="number"
                inputMode="decimal"
                value={edicion.price}
                onChange={(e) => campo('price')(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </label>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label className="campo">
              <span className="field-label">Alerta stock</span>
              <input
                type="number"
                inputMode="numeric"
                value={edicion.threshold}
                onChange={(e) => campo('threshold')(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <label className="campo">
              <span className="field-label">2x1 $</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="sin promo"
                value={edicion.promo}
                onChange={(e) => campo('promo')(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </label>
          </div>
        </Dialog>
      )}

      {dialog?.kind === 'promo' && (
        <Dialog
          title={`2x1 de ${dialog.product.name}`}
          sub={`¿Cuánto se cobran los dos juntos? Sueltos salen $${dialog.product.salePrice.toLocaleString('es-AR')} cada uno. Vacío saca la promo.`}
          input={{
            type: 'number',
            inputMode: 'decimal',
            initial: dialog.product.promoPrice ? String(dialog.product.promoPrice) : '',
          }}
          confirmLabel="Guardar"
          onConfirm={handlePromo}
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
