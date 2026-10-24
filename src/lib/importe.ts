/**
 * Importe que se tipea en la caja con el teclado, en pesos enteros (sin centavos, ver DECISIONES.md).
 * Hasta 7 dígitos: el máximo es $ 9.999.999.
 */
export const DIGITOS_MAXIMOS = 7
export const IMPORTE_MAXIMO = 10 ** DIGITOS_MAXIMOS - 1

/** Deja solo los dígitos de lo que se tipeó o pegó ("12.500", "$ 12500") y corta en 7. */
export function normalizarImporte(texto: string): number {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, DIGITOS_MAXIMOS)
  return digitos ? Number(digitos) : 0
}

/** Cómo se ve mientras se tipea: "12.500". Vacío si es 0, para que se vea el placeholder. */
export function formatearImporteEnCurso(importe: number): string {
  return importe > 0 ? new Intl.NumberFormat('es-AR').format(importe) : ''
}

export type AccionTecla = 'efectivo' | 'mercadopago' | 'salida' | 'borrar' | null

/**
 * Teclas de la caja: Enter = Efectivo, + = Mercado Pago (también el + del teclado numérico),
 * − = sacar efectivo, Esc = borrar. Sirven con una sola mano sobre el teclado numérico.
 */
export function accionDeTecla(e: { key: string; code?: string }): AccionTecla {
  if (e.key === 'Enter' || e.code === 'NumpadEnter') return 'efectivo'
  if (e.key === '+' || e.code === 'NumpadAdd') return 'mercadopago'
  if (e.key === '-' || e.code === 'NumpadSubtract') return 'salida'
  if (e.key === 'Escape') return 'borrar'
  return null
}
