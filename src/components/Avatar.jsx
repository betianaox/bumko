import { useState } from 'react'

/* La foto de Google de la persona. Si no tiene, o si el pedido falla —pasa:
   la URL de Google a veces devuelve 403 desde otro dominio—, cae en la
   inicial del nombre, que es lo que había antes. */
export default function Avatar({ src, name = '', email = '', size = 34 }) {
  const [falló, setFalló] = useState(false)
  const inicial = (name || email || '?').trim().charAt(0).toUpperCase()

  const estilo = { width: size, height: size, fontSize: Math.round(size * 0.42) }

  if (!src || falló) {
    return <span className="avatar" style={estilo}>{inicial}</span>
  }

  return (
    <img
      className="avatar"
      style={estilo}
      src={src}
      alt={name || email}
      referrerPolicy="no-referrer"
      onError={() => setFalló(true)}
    />
  )
}
