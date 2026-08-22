import { useEffect, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useTheme } from '../context/ThemeContext'

/* Los gráficos de Reportes.

   Recharts necesita colores concretos, no variables de CSS, así que los tokens
   del tema se leen del documento y se vuelven a leer cuando el tema cambia.
   De esa forma los gráficos siguen saliendo de la misma paleta que el resto de
   la app y no hay una segunda lista de colores que mantener. */

const money = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR')
const corto = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

function useTokens() {
  const { theme } = useTheme()
  const [t, setT] = useState({})

  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    const leer = (n) => css.getPropertyValue(n).trim()
    setT({
      accent: leer('--accent'),
      c1: leer('--c1'),
      c2: leer('--c2'),
      c3: leer('--c3'),
      texto: leer('--text'),
      tenue: leer('--text-faint'),
      linea: leer('--line'),
      superficie: leer('--surface'),
      superficie2: leer('--surface-2'),
    })
  }, [theme])

  return t
}

/* El cartelito que sigue al dedo. El de fábrica viene con estilos de página
   web; este usa las superficies y las tipografías de la app. */
function Globo({ active, payload, label, format = money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      <div className="tip-lbl">{label ?? payload[0]?.payload?.label}</div>
      {payload.map((p) => (
        <div className="tip-val" key={p.name}>
          <span className="tip-dot" style={{ background: p.color || p.fill }} />
          {p.name !== 'value' && <span className="tip-name">{p.name}</span>}
          <strong>{format(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

/* ---------- Cómo viene el período ---------- */

export function Columnas({ title, data, format = money }) {
  const t = useTokens()
  if (data.length === 0 || !t.accent) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div className="chart-title">{title}</div>
        <div className="chart-total">{format(total)}</div>
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
          <defs>
            {/* El relleno se desvanece hacia abajo: la línea es el dato, el
                área solo ayuda a leer el volumen. */}
            <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.accent} stopOpacity={0.45} />
              <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={t.linea} vertical={false} />
          <XAxis
            dataKey="short"
            tick={{ fill: t.tenue, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={18}
          />
          <YAxis
            tick={{ fill: t.tenue, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={46}
            tickFormatter={corto}
          />
          <Tooltip content={<Globo format={format} />} cursor={{ stroke: t.tenue, strokeDasharray: 4 }} />

          <Area
            type="monotone"
            dataKey="value"
            name="value"
            stroke={t.accent}
            strokeWidth={2.5}
            fill="url(#gradAccent)"
            dot={false}
            activeDot={{ r: 5, stroke: t.superficie, strokeWidth: 2 }}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Ranking ---------- */

export function Barras({ title, data, format = (n) => n, empty }) {
  const t = useTokens()

  if (data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-title">{title}</div>
        <div className="chart-empty">{empty}</div>
      </div>
    )
  }
  if (!t.accent) return null

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>

      <ResponsiveContainer width="100%" height={data.length * 38 + 10}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 34, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: t.tenue, fontSize: 13 }}
            tickLine={false}
            axisLine={false}
            width={92}
          />
          <Tooltip content={<Globo format={format} />} cursor={{ fill: t.superficie2 }} />

          <Bar
            dataKey="value"
            name="value"
            radius={[0, 6, 6, 0]}
            barSize={16}
            animationDuration={500}
            label={{ position: 'right', fill: t.texto, fontSize: 13, fontWeight: 700, formatter: format }}
          >
            {/* El primero destacado: en un ranking lo que importa es quién gana */}
            {data.map((d, i) => (
              <Cell key={d.label} fill={i === 0 ? t.accent : t.superficie2} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Cómo salió cada unidad ---------- */

export function Composicion({ title, parts }) {
  const t = useTokens()
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total === 0 || !t.c1) return null

  const color = { c1: t.c1, c2: t.c2, c3: t.c3 }

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>

      {/* Una sola barra partida: la pregunta es qué proporción se llevó cada
          forma de salir, y la barra lo contesta sin hacer comparar ángulos. */}
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

      <div className="legend">
        {parts.map((p) => (
          <div className="legend-item" key={p.label}>
            <span className="dot" style={{ background: color[p.tone] }} />
            {p.label}
            <strong>{p.value}</strong>
            <span className="pct">{Math.round((p.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
