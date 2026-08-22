/* Los gráficos de Reportes.

   Todo se dibuja con divs y un poco de SVG: son cuatro formas simples y no
   justifican una librería de 300 KB en una app que se abre desde el celular
   en un bar. Los colores salen de tokens, así funcionan en los dos temas.

   Cada barra lleva su número escrito al lado: el color ubica, el número
   informa. Nada depende de poder distinguir dos tonos parecidos. */

const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR')

/* ---------- Serie en el tiempo ---------- */

export function Columnas({ title, data, format = money }) {
  if (data.length === 0) return null

  const max = Math.max(...data.map((d) => d.value), 1)
  const pico = data.find((d) => d.value === max)

  /* Con un mes entero cada columna mide unos 7px: ahí no entra ninguna
     etiqueta y ponerlas igual solo ensucia. Se etiqueta cuando son pocas;
     si no, el pie del gráfico dice desde dónde hasta dónde va. */
  const conEtiquetas = data.length <= 10

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>

      <div className="cols">
        {data.map((d) => (
          <div className="col" key={d.label} title={`${d.label}: ${format(d.value)}`}>
            <div className="col-track">
              <div
                className={'col-bar' + (d.value === max ? ' peak' : '')}
                style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
              />
            </div>
            {conEtiquetas && <div className="col-lbl">{d.short}</div>}
          </div>
        ))}
      </div>

      <div className="chart-foot">
        <span>{data[0].label} → {data[data.length - 1].label}</span>
        <span>pico {format(max)}{pico && data.length > 10 ? ` · ${pico.label}` : ''}</span>
      </div>
    </div>
  )
}

/* ---------- Ranking ---------- */

export function Barras({ title, data, format = (n) => n, empty }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  if (data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-title">{title}</div>
        <div className="chart-empty">{empty}</div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div className="hbars">
        {data.map((d) => (
          <div className="hbar" key={d.label}>
            <div className="hbar-lbl">{d.label}</div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <div className="hbar-val">{format(d.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Cómo salió cada unidad ---------- */

export function Composicion({ title, parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total === 0) return null

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>

      <div className="stack">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div
            key={p.label}
            className={'stack-seg ' + p.tone}
            style={{ flexGrow: p.value }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>

      {/* La leyenda lleva el número: el color agrupa, el texto es el dato */}
      <div className="legend">
        {parts.map((p) => (
          <div className="legend-item" key={p.label}>
            <span className={'dot ' + p.tone} />
            {p.label}
            <strong>{p.value}</strong>
            <span className="pct">{Math.round((p.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
