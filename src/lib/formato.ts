import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pesosEnteros = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** `$ 1.234.567,89`. Con `sinCentavos`, `$ 1.234.568`. */
export function formatearPesos(monto: number, { sinCentavos = false } = {}): string {
  // Intl pone un espacio duro (U+00A0) entre el signo y el número: así el monto no se corta.
  return (sinCentavos ? pesosEnteros : pesos).format(monto)
}

/** `1.234.567`, sin signo. Para el visor y lugares donde el `$` va aparte. */
export function formatearMiles(entero: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(entero)
}

function enArgentina(fecha: Date): TZDate {
  return new TZDate(fecha, ZONA_HORARIA)
}

/** `17/10/2026`, siempre en hora de Buenos Aires. */
export function formatearFecha(fecha: Date): string {
  return format(enArgentina(fecha), 'dd/MM/yyyy')
}

/** `18:42`, siempre en hora de Buenos Aires. */
export function formatearHora(fecha: Date): string {
  return format(enArgentina(fecha), 'HH:mm')
}

/** `sáb 17/10`, para encabezados. */
export function formatearDiaCorto(fecha: Date): string {
  return format(enArgentina(fecha), 'EEE dd/MM', { locale: es })
}

/** Fecha de trabajo `aaaa-mm-dd` en Buenos Aires (lo que se guarda en `jornadas.fecha`). */
export function fechaDeTrabajo(fecha: Date): string {
  return format(enArgentina(fecha), 'yyyy-MM-dd')
}

const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })

/** `$ 1,2 M`, `$ 850 mil`. Para ejes y tarjetas chicas. */
export function formatearPesosCompacto(monto: number): string {
  return `$ ${compacto.format(monto)}`
}

/** `+6,2 %` / `−3,0 %`. */
export function formatearPorcentaje(valor: number, { conSigno = true } = {}): string {
  const texto = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(valor))
  const signo = !conSigno || valor === 0 ? '' : valor > 0 ? '+' : '−'
  return `${signo}${texto} %`
}

/** "1 venta", "3 ventas". */
export function cantidadVentas(n: number): string {
  return `${n} ${n === 1 ? 'venta' : 'ventas'}`
}

const kilos = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })

/** `1,25 kg`, `12 u.`. Para la planilla y las ventas por producto. */
export function formatearCantidad(cantidad: number, unidad: 'kg' | 'unidad' = 'kg'): string {
  return `${kilos.format(cantidad)} ${unidad === 'kg' ? 'kg' : 'u.'}`
}
