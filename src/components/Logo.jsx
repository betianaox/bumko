/* El logo en un solo lugar. Si cambia el archivo, el formato o las medidas,
   se toca acá y no en cada pantalla que lo muestra. */
export default function Logo({ className = '' }) {
  return (
    <img
      className={className}
      src="/logo.png"
      alt="Stokki"
      width="800"
      height="230"
    />
  )
}
