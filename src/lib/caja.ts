/** Reglas de la caja que la interfaz necesita conocer. La base las vuelve a validar. */
import type { Database } from './tipos-db'

export type MedioPago = Database['public']['Enums']['medio_pago']

/** Como en la planilla del día: EFE y MP. */
export const NOMBRE_MEDIO: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  mercadopago: 'Mercado Pago',
}
export const NOMBRE_MEDIO_CORTO: Record<MedioPago, string> = { efectivo: 'EFE', mercadopago: 'MP' }

export const MINUTOS_ANULACION_CAJERO = 10

export interface VentaParaAnular {
  registrada_por: string | null
  registrada_en: string
  anulada: boolean
}

/**
 * El admin anula cualquier venta de un día abierto. Un cajero, solo las que
 * cargó su cuenta hace menos de 10 minutos.
 */
export function puedeAnular(
  venta: VentaParaAnular,
  usuario: { id: string; esAdmin: boolean },
  ahora: Date = new Date(),
): boolean {
  if (venta.anulada) return false
  if (usuario.esAdmin) return true
  if (venta.registrada_por !== usuario.id) return false
  const minutos = (ahora.getTime() - new Date(venta.registrada_en).getTime()) / 60_000
  return minutos < MINUTOS_ANULACION_CAJERO
}

/** Un importe por encima del tope pide confirmación (evita ceros de más). */
export function necesitaConfirmacion(importe: number, tope: number): boolean {
  return importe > tope
}

export const NOMBRE_MOTIVO_SALIDA = {
  proveedor: 'Pago a proveedor',
  retiro: 'Retiro del dueño',
  gasto: 'Gasto del local',
  otro: 'Otro',
} as const satisfies Record<'proveedor' | 'retiro' | 'gasto' | 'otro', string>

export type EstadoArqueo = 'coincide' | 'sobra' | 'falta'

export interface Arqueo {
  esperado: number
  contado: number
  diferencia: number
  estado: EstadoArqueo
}

/**
 * Efectivo esperado = fondo inicial + ventas en efectivo − salidas de caja.
 * Diferencia = contado − esperado.
 */
export function calcularArqueo(
  fondoInicial: number,
  ventasEfectivo: number,
  contado: number,
  salidas = 0,
): Arqueo {
  const esperado = redondear(fondoInicial + ventasEfectivo - salidas)
  const diferencia = redondear(contado - esperado)
  return {
    esperado,
    contado,
    diferencia,
    estado: diferencia === 0 ? 'coincide' : diferencia > 0 ? 'sobra' : 'falta',
  }
}

/** Variación porcentual contra el período anterior. null si no hay con qué comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
