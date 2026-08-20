import { useEffect, useRef, useState } from 'react'

const GIFT_REASONS = ['Invitación del dueño', 'Cortesía a cliente', 'Error de cobro', 'Staff']

export default function SaleModal({ product, onConfirm, onClose }) {
  const [mode, setMode] = useState('regular') // regular | custom | gift
  const [customPrice, setCustomPrice] = useState('')
  const [reason, setReason] = useState(GIFT_REASONS[0])
  const [who, setWho] = useState('')
  const openedAt = useRef(Date.now())

  // Si llegaste acá manteniendo apretado, al soltar el dedo el click cae sobre el
  // overlay recién montado y cerraría la hoja al instante. Ese primero se ignora.
  const handleOverlayClick = () => {
    if (Date.now() - openedAt.current < 400) return
    onClose()
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canConfirm =
    mode === 'regular' ||
    (mode === 'custom' && customPrice !== '' && Number(customPrice) >= 0) ||
    mode === 'gift'

  const handleConfirm = () => {
    if (!canConfirm) return
    if (mode === 'regular') {
      onConfirm({ mode, amount: product.salePrice })
    } else if (mode === 'custom') {
      onConfirm({ mode, amount: Number(customPrice) })
    } else {
      onConfirm({ mode, amount: 0, reason, who: who.trim() })
    }
  }

  return (
    <div className="overlay" onClick={handleOverlayClick}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-title">{product.name}</div>
        <div className="sheet-sub">Quedan {product.stock} · Precio regular ${product.salePrice}</div>

        <div className="mode-row">
          <button
            className={'mode-btn regular' + (mode === 'regular' ? ' selected' : '')}
            onClick={() => setMode('regular')}
          >
            <span className="m-icon">💵</span>
            Precio regular
          </button>
          <button
            className={'mode-btn custom' + (mode === 'custom' ? ' selected' : '')}
            onClick={() => setMode('custom')}
          >
            <span className="m-icon">🏷️</span>
            Otro precio
          </button>
          <button
            className={'mode-btn gift' + (mode === 'gift' ? ' selected' : '')}
            onClick={() => setMode('gift')}
          >
            <span className="m-icon">🎁</span>
            Regalar
          </button>
        </div>

        {mode === 'custom' && (
          <>
            <div className="field-label">Precio cobrado</div>
            <input
              className="price-input"
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="0"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
          </>
        )}

        {mode === 'gift' && (
          <>
            <div className="field-label">Motivo</div>
            <div className="reason-grid">
              {GIFT_REASONS.map((r) => (
                <button
                  key={r}
                  className={'reason-btn' + (reason === r ? ' selected' : '')}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              className="who-input"
              placeholder="¿A quién? (opcional)"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            />
          </>
        )}

        <button className="confirm-btn" disabled={!canConfirm} onClick={handleConfirm}>
          {mode === 'gift' ? 'Registrar regalo' : `Confirmar $${mode === 'regular' ? product.salePrice : (customPrice || 0)}`}
        </button>
        <button className="cancel-btn" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}
