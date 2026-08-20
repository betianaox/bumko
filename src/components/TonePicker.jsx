import { TONES, toneFor } from '../productTone'

/* Paleta del producto. "A" (valor null) deja que el color salga del nombre,
   que es lo que hace todo lo que ya está cargado. */
export default function TonePicker({ value, name = '', onChange }) {
  const auto = toneFor(name)

  return (
    <div className="tone-picker">
      <button
        type="button"
        className={'sw auto ' + auto + (value ? '' : ' selected')}
        onClick={() => onChange(null)}
        title="Elegir automáticamente por el nombre"
      >
        A
      </button>
      {TONES.map((t) => (
        <button
          type="button"
          key={t}
          className={'sw ' + t + (value === t ? ' selected' : '')}
          onClick={() => onChange(t)}
          title={t}
        />
      ))}
    </div>
  )
}
