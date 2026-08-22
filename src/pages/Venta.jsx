import { useEffect, useRef, useState } from 'react'
import {
  onSnapshot, query, orderBy, addDoc, updateDoc,
  increment, serverTimestamp, deleteDoc,
} from '../data'
import { useAuth } from '../context/AuthContext'
import { barCol, barDoc } from '../bar'
import SaleModal from '../components/SaleModal'
import { toneOf } from '../productTone'
import { BoxIcon, UndoIcon, CloseIcon } from '../components/icons'

const LONG_PRESS_MS = 450   // a partir de acá es "quiero una variante", no una venta
const RECENT_MAX = 5
const RECENT_TTL_MS = 10000   // el chip vive 10s: tiempo de darte cuenta, no de olvidarte
const CONFIRM_MS = 3000

function buzz(pattern) {
  try { navigator.vibrate?.(pattern) } catch { /* iOS y escritorio no vibran */ }
}

export default function Venta({ activeEvent }) {
  const { user, barId, isDev } = useAuth()
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [recent, setRecent] = useState([])
  const [confirmUndo, setConfirmUndo] = useState(null)
  const [flashes, setFlashes] = useState([])

  const pressTimer = useRef(null)
  const longFired = useRef(false)

  useEffect(() => {
    if (!barId) return
    const q = query(barCol(barId, 'products'), orderBy('name'))
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [barId])

  // Los movimientos viejos se caen solos: deshacer algo de hace 5 minutos es peor que no deshacerlo
  useEffect(() => {
    if (recent.length === 0) return
    const t = setInterval(() => {
      setRecent((prev) => prev.filter((r) => Date.now() - r.at < RECENT_TTL_MS))
    }, 500)
    return () => clearInterval(t)
  }, [recent.length])

  // El "¿anular?" se cancela solo si no lo confirmás
  useEffect(() => {
    if (!confirmUndo) return
    const t = setTimeout(() => setConfirmUndo(null), CONFIRM_MS)
    return () => clearTimeout(t)
  }, [confirmUndo])

  useEffect(() => () => clearTimeout(pressTimer.current), [])

  const flash = (productId, label) => {
    const id = `${productId}-${Date.now()}`
    setFlashes((prev) => [...prev, { id, productId, label }])
    setTimeout(() => setFlashes((prev) => prev.filter((f) => f.id !== id)), 750)
  }

  const registerSale = async (product, saleData) => {
    flash(product.id, saleData.mode === 'gift' ? 'REGALO' : '−1')

    // El stock primero: es lo que ve el resto del equipo en sus pantallas
    await updateDoc(barDoc(barId, 'products', product.id), { stock: increment(-1) })

    const saleDoc = await addDoc(barCol(barId, 'sales'), {
      productId: product.id,
      productName: product.name,
      mode: saleData.mode,
      amount: saleData.amount,
      reason: saleData.reason || null,
      who: saleData.who || null,
      eventId: activeEvent ? activeEvent.id : null,
      // Lo que registra un dev es prueba, no venta: queda marcado para que
      // los reportes y los totales del evento no lo cuenten.
      dev: isDev ? true : null,
      userEmail: user?.email || null,
      userName: user?.displayName || null,
      createdAt: serverTimestamp(),
    })

    setRecent((prev) => [
      {
        saleId: saleDoc.id,
        productId: product.id,
        productName: product.name,
        mode: saleData.mode,
        amount: saleData.amount,
        at: Date.now(),
      },
      ...prev,
    ].slice(0, RECENT_MAX))
  }

  // Un toque = venta al precio regular. El 90% de la noche pasa por acá.
  const handleQuickSale = (product) => {
    buzz(30)
    registerSale(product, { mode: 'regular', amount: product.salePrice })
  }

  const handleConfirmSale = (saleData) => {
    const product = selected
    setSelected(null)
    buzz(30)
    registerSale(product, saleData)
  }

  const handleUndo = async (entry) => {
    setConfirmUndo(null)
    setRecent((prev) => prev.filter((r) => r.saleId !== entry.saleId))
    buzz([20, 40, 20])
    await updateDoc(barDoc(barId, 'products', entry.productId), { stock: increment(1) })
    await deleteDoc(barDoc(barId, 'sales', entry.saleId))
  }

  const startPress = (product) => {
    longFired.current = false
    clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      longFired.current = true
      buzz(15)
      setSelected(product)
    }, LONG_PRESS_MS)
  }

  const endPress = () => clearTimeout(pressTimer.current)

  return (
    <div>
      {products.length === 0 && (
        <div className="empty-state">
          <span className="em"><BoxIcon /></span>
          <div className="big">Todavía no cargaste productos</div>
          <div>Andá a la pestaña Stock para empezar.</div>
        </div>
      )}

      {products.length > 0 && (
        <div className="hint-row">
          Un toque vende · mantené apretado para otro precio o regalo
        </div>
      )}

      <div className="punch-grid" style={recent.length > 0 ? { paddingBottom: 64 } : undefined}>
        {products.map((p) => {
          const low = p.lowStockThreshold != null && p.stock <= p.lowStockThreshold && p.stock > 0
          const out = p.stock <= 0
          const mine = flashes.filter((f) => f.productId === p.id)
          return (
            <button
              key={p.id}
              className={'punch ' + (out ? 'out' : `${toneOf(p)}${low ? ' low' : ''}`)}
              onPointerDown={() => !out && startPress(p)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (longFired.current || out) return
                handleQuickSale(p)
              }}
            >
              <span className="stock-badge">{p.stock}</span>
              <span className="name">{p.name}</span>
              <span className="price">${p.salePrice.toLocaleString('es-AR')}</span>
              {mine.map((f) => (
                <span key={f.id} className={'flash' + (f.label === 'REGALO' ? ' gift' : '')}>{f.label}</span>
              ))}
            </button>
          )
        })}
      </div>

      {selected && (
        <SaleModal
          product={selected}
          onConfirm={handleConfirmSale}
          onClose={() => setSelected(null)}
        />
      )}

      {recent.length > 0 && (
        <div className="recent-bar">
          <span className="recent-label"><UndoIcon /> Deshacer</span>
          {recent.map((r) => {
            const confirming = confirmUndo === r.saleId
            return (
              <button
                key={r.saleId}
                className={
                  'recent-chip' +
                  (confirming ? ' confirming' : '') +
                  (r.mode === 'gift' ? ' gift' : r.mode === 'custom' ? ' custom' : '')
                }
                onClick={() => (confirming ? handleUndo(r) : setConfirmUndo(r.saleId))}
              >
                {confirming ? (
                  <span className="rn">Anular <CloseIcon /></span>
                ) : (
                  <>
                    <span className="rn">{r.productName}</span>
                    <span className="rv">{r.mode === 'gift' ? 'regalo' : '−1'}</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
