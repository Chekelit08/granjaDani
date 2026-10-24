const PALABRAS = [
  'pollo',
  'pechuga',
  'milanesa',
  'chorizo',
  'asado',
  'vacio',
  'matambre',
  'carre',
  'bondiola',
  'huevo',
  'ala',
  'muslo',
  'balanza',
  'mostrador',
  'cuchillo',
  'parrilla',
]

/** Contraseña temporal fácil de dictar: "pollo-asado-4821". Se cambia en el primer ingreso. */
export function claveTemporal(): string {
  const azar = new Uint32Array(3)
  crypto.getRandomValues(azar)
  const a = PALABRAS[(azar[0] ?? 0) % PALABRAS.length]
  const b = PALABRAS[(azar[1] ?? 1) % PALABRAS.length]
  const n = String((azar[2] ?? 0) % 10000).padStart(4, '0')
  return `${a}-${b}-${n}`
}
