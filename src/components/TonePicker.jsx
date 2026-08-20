import { TONES } from '../productTone'

/* Paleta del producto. "Auto" (valor null) deja que el color salga del nombre,
   que es lo que hace todo lo que ya está cargado. Va como pastilla con texto y
   no como muestra de color: si mostrara el color que le tocaría, se confundiría
   con la muestra de ese mismo color que está al lado. */
export default function TonePicker({ value, onChange }) {
  return (
    <div className="tone-picker">
      <button
        type="button"
        className={'sw-auto' + (value ? '' : ' selected')}
        onClick={() => onChange(null)}
      >
        Auto
      </button>
      {TONES.map((t) => (
        <button
          type="button"
          key={t}
          className={'sw ' + t + (value === t ? ' selected' : '')}
          onClick={() => onChange(t)}
          aria-label={'Color ' + t.replace('tone-', '')}
        />
      ))}
    </div>
  )
}
