/* Interruptor de dos estados. Reemplaza al par de botones con texto
   ("Suspender" / "Activar"), que en mobile no entraban en la fila y además
   obligaban a leer para saber en qué estado estabas. */
export default function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      className={'switch' + (checked ? ' on' : '')}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="knob" />
    </button>
  )
}
