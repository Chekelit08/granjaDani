import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import { es } from 'date-fns/locale'

export type TipoPeriodo = 'dia' | 'semana' | 'mes'

export interface Rango {
  desde: string
  hasta: string
}

export interface Periodo extends Rango {
  tipo: TipoPeriodo
  titulo: string
  anterior: Rango
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
/** Las fechas de trabajo son strings aaaa-mm-dd; se leen como fecha local sin hora. */
export const leerFecha = (f: string) => parseISO(f)

export function periodo(tipo: TipoPeriodo, referencia: string): Periodo {
  const ref = leerFecha(referencia)
  if (tipo === 'dia') {
    return {
      tipo,
      desde: referencia,
      hasta: referencia,
      titulo: format(ref, "EEEE d 'de' MMMM", { locale: es }),
      anterior: { desde: iso(subDays(ref, 1)), hasta: iso(subDays(ref, 1)) },
    }
  }
  if (tipo === 'semana') {
    const inicio = startOfWeek(ref, { weekStartsOn: 1 })
    const fin = endOfWeek(ref, { weekStartsOn: 1 })
    const prev = addWeeks(inicio, -1)
    return {
      tipo,
      desde: iso(inicio),
      hasta: iso(fin),
      titulo: `Semana del ${format(inicio, 'dd/MM')} al ${format(fin, 'dd/MM')}`,
      anterior: { desde: iso(prev), hasta: iso(endOfWeek(prev, { weekStartsOn: 1 })) },
    }
  }
  const inicio = startOfMonth(ref)
  const prev = addMonths(inicio, -1)
  return {
    tipo,
    desde: iso(inicio),
    hasta: iso(endOfMonth(ref)),
    titulo: format(inicio, "MMMM 'de' yyyy", { locale: es }),
    anterior: { desde: iso(prev), hasta: iso(endOfMonth(prev)) },
  }
}

/** Mueve la referencia un período para atrás (-1) o para adelante (+1). */
export function moverPeriodo(tipo: TipoPeriodo, referencia: string, pasos: number): string {
  const ref = leerFecha(referencia)
  if (tipo === 'dia') return iso(addDays(ref, pasos))
  if (tipo === 'semana') return iso(addWeeks(ref, pasos))
  return iso(addMonths(ref, pasos))
}

export function ultimosDias(hoy: string, dias: number): Rango {
  return { desde: iso(subDays(leerFecha(hoy), dias - 1)), hasta: hoy }
}

export function nombreMes(fecha: string): string {
  return format(leerFecha(fecha), 'MMM yy', { locale: es })
}

export function fechaCorta(fecha: string): string {
  return format(leerFecha(fecha), 'dd/MM')
}

export function fechaLarga(fecha: string): string {
  return format(leerFecha(fecha), 'dd/MM/yyyy')
}

export function diaSemanaCorto(fecha: string): string {
  return format(leerFecha(fecha), 'EEE dd/MM', { locale: es })
}

export const NOMBRES_DIA_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

/**
 * Si el período todavía no terminó (por ejemplo, este mes), lo corta en hoy y compara
 * contra el mismo tramo del período anterior: del 1 al 17 contra del 1 al 17.
 */
export function hastaHoy(per: Periodo, hoy: string): Periodo & { recortado: boolean } {
  if (per.hasta <= hoy) return { ...per, recortado: false }
  const dias = differenceInCalendarDays(leerFecha(hoy), leerFecha(per.desde))
  const finAnterior = iso(addDays(leerFecha(per.anterior.desde), dias))
  return {
    ...per,
    hasta: hoy,
    anterior: {
      desde: per.anterior.desde,
      hasta: finAnterior < per.anterior.hasta ? finAnterior : per.anterior.hasta,
    },
    recortado: true,
  }
}
