/* Color de cada producto: 8 tonos planos. En la oscuridad el color es lo
   que te deja encontrar el botón sin llegar a leer la etiqueta.
   Si el producto no tiene color elegido a mano, se le asigna uno a partir
   del nombre — el mismo nombre cae siempre en el mismo tono. */

export const TONES = ['tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5', 'tone-6', 'tone-7', 'tone-8']

export function toneFor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973
  return TONES[h % TONES.length]
}

// El color elegido a mano gana; si no hay, se deduce del nombre.
export function toneOf(product) {
  return product?.tone || toneFor(product?.name || '')
}
