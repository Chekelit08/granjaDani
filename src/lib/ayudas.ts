/** Ayudas para el mostrador: vuelto, conteo de billetes y saludo. Sin dependencias de React. */

/** Billetes y monedas que circulan, de mayor a menor. */
export const BILLETES = [20_000, 10_000, 2_000, 1_000, 500, 200, 100] as const

/** Con cuánto suele pagar la gente: el próximo billete "redondo" arriba del importe. */
export function pagosSugeridos(importe: number): number[] {
  if (importe <= 0) return []
  const candidatos = [1_000, 2_000, 5_000, 10_000, 20_000, 30_000, 40_000, 50_000, 100_000]
  return candidatos.filter((c) => c > importe).slice(0, 4)
}

/** Vuelto = lo que pagó − el importe. null si pagó menos de lo que salía. */
export function calcularVuelto(importe: number, pago: number): number | null {
  if (pago < importe) return null
  return pago - importe
}

/** Suma del conteo de billetes: { 20000: 3, 1000: 5 } + monedas → total. */
export function totalContado(cantidades: Partial<Record<number, number>>, monedas = 0): number {
  let total = Math.max(0, Math.round(monedas))
  for (const billete of BILLETES) {
    const n = Math.max(0, Math.floor(cantidades[billete] ?? 0))
    total += billete * n
  }
  return total
}

/** "Buen día", "Buenas tardes" o "Buenas noches" según la hora en Buenos Aires. */
export function saludo(hora: number): string {
  if (hora >= 5 && hora < 13) return 'Buen día'
  if (hora >= 13 && hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Hora (0–23) en Buenos Aires. */
export function horaArgentina(fecha: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('es-AR', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(fecha),
  )
}
