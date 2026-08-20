import { useEffect, useState } from 'react'

const Chevron = ({ open }) => (
  <svg
    className={'chevron' + (open ? ' open' : '')}
    width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 9l7 7 7-7" />
  </svg>
)

const Check = () => (
  <svg
    width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="3.2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 12.5l5.5 5.5L20 6.5" />
  </svg>
)

/* Selector propio. El <select> del sistema no se puede maquillar por dentro:
   la lista la dibuja el sistema operativo y queda de otra app. Este abre una
   hoja desde abajo con opciones grandes, que además es más fácil de acertar
   con el pulgar que una lista de 20px de alto.
   options: [{ value, label, hint }] */
export default function Picker({ value, options, onChange, placeholder = 'Elegir', title }) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        className={'picker-trigger' + (value ? ' filled' : '')}
        onClick={() => setOpen(true)}
      >
        <span className="pt-label">{selected ? selected.label : placeholder}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="sheet picker-sheet" onClick={(e) => e.stopPropagation()}>
            {title && <div className="sheet-title">{title}</div>}

            <div className="picker-list">
              {options.map((o) => (
                <button
                  key={o.value}
                  className={'picker-opt' + (o.value === value ? ' selected' : '')}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                >
                  <span className="po-main">
                    <span className="po-label">{o.label}</span>
                    {o.hint && <span className="po-hint">{o.hint}</span>}
                  </span>
                  {o.value === value && <Check />}
                </button>
              ))}
            </div>

            <button className="cancel-btn" onClick={() => setOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}
