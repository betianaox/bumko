import { useEffect, useRef, useState } from 'react'

/* Diálogo propio, en reemplazo de window.confirm / window.prompt.
   Los del navegador en Android son feos, bloquean el hilo y en algunos
   navegadores dentro de una app instalada directamente no aparecen.
   Este es una tarjeta centrada — no ocupa la pantalla entera, así seguís
   viendo abajo lo que estás por tocar. */
export default function Dialog({
  title,
  sub,
  input,                 // { type, inputMode, initial, placeholder }
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(input?.initial ?? '')
  const openedAt = useRef(Date.now())

  const submit = () => onConfirm(input ? value : undefined)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Si el diálogo se abrió con el dedo apoyado, el click de soltar caería
  // sobre el fondo y lo cerraría de una. Ese primero se ignora.
  const handleOverlay = () => {
    if (Date.now() - openedAt.current < 400) return
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={handleOverlay}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        {sub && <div className="dialog-sub">{sub}</div>}

        {input && (
          <input
            className="dialog-input"
            type={input.type || 'text'}
            inputMode={input.inputMode}
            placeholder={input.placeholder}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        )}

        <div className="dialog-actions">
          <button className="dlg-btn ghost" onClick={onClose}>{cancelLabel}</button>
          <button className={'dlg-btn' + (danger ? ' danger' : '')} onClick={submit}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
