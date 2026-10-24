import { formatearCantidad, formatearPesos } from './formato'

/**
 * Número de WhatsApp de Argentina para wa.me: 549 + característica + número (sin 0 ni 15).
 * Acepta "11 2233 4455", "011 2233-4455", "+54 9 11 2233 4455". Devuelve null si no se entiende.
 */
export function normalizarWhatsapp(texto: string): string | null {
  let d = texto.replace(/\D/g, '')
  if (d.startsWith('549') && d.length === 13) return d
  if (d.startsWith('54') && d.length === 12) return `549${d.slice(2)}`
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length === 10) return `549${d}`
  return null
}

export interface ProductoResumen {
  nombre: string
  unidad: 'kg' | 'unidad'
  cantidad: number
  total: number
}

export interface DatosResumen {
  fecha: string
  total: number
  cantidad_tickets: number
  total_efectivo: number
  total_mercadopago: number
  kilos: number
  total_salidas: number
  efectivo_esperado: number
  efectivo_contado: number | null
  diferencia_efectivo: number | null
  nota?: string | null
  /** La planilla del día; se listan los productos que se vendieron. */
  productos?: ProductoResumen[]
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** El texto que se manda por WhatsApp al cerrar el día. */
export function textoResumen(r: DatosResumen): string {
  const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })
  const [anio, mes, dia] = r.fecha.split('-')
  const nombreDia = DIAS[new Date(Number(anio), Number(mes) - 1, Number(dia)).getDay()]
  const lineas = [
    `*Granja Dani · cierre del ${nombreDia} ${dia}/${mes}*`,
    `Total: *${p(r.total)}* (${r.cantidad_tickets} ${r.cantidad_tickets === 1 ? 'venta' : 'ventas'} · ${formatearCantidad(r.kilos)})`,
    `• Efectivo: ${p(r.total_efectivo)}`,
    `• Mercado Pago: ${p(r.total_mercadopago)}`,
  ]
  const vendidos = (r.productos ?? []).filter((x) => x.total > 0)
  if (vendidos.length > 0) {
    lineas.push('', '*Por producto*')
    for (const x of vendidos) {
      const cantidad = x.cantidad > 0 ? ` (${formatearCantidad(x.cantidad, x.unidad)})` : ''
      lineas.push(`• ${x.nombre}${cantidad}: ${p(x.total)}`)
    }
    lineas.push('')
  }
  if (r.total_salidas > 0) lineas.push(`Salidas de caja: − ${p(r.total_salidas)}`)
  if (r.efectivo_contado !== null) {
    lineas.push(`Efectivo esperado: ${p(r.efectivo_esperado)} · contado: ${p(r.efectivo_contado)}`)
  }
  if (r.diferencia_efectivo !== null) {
    const dif = r.diferencia_efectivo
    lineas.push(
      dif === 0
        ? 'La caja coincide ✅'
        : `${dif > 0 ? 'Sobran' : 'Faltan'} ${p(Math.abs(dif))} ${dif > 0 ? '⚠️' : '❗'}`,
    )
  }
  if (r.nota) lineas.push(`Nota: ${r.nota}`)
  return lineas.join('\n')
}

export function enlaceWhatsapp(numero: string | null | undefined, texto: string): string {
  return `https://wa.me/${numero ?? ''}?text=${encodeURIComponent(texto)}`
}

export interface DatosSemana {
  desde: string
  hasta: string
  total: number
  cantidad_tickets: number
  total_efectivo: number
  total_mercadopago: number
  kilos: number
  dias_trabajados: number
  promedio_diario: number
  diferencia_caja: number
  mejor_dia: string | null
  mejor_dia_total: number | null
  /** Total de la semana anterior, para comparar (null si no hubo caja). */
  total_anterior: number | null
  /** Egresos cargados en la semana (sin anulados). */
  egresos: number
}

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function diaYFecha(fecha: string): { dia: string; ddmm: string } {
  const [anio, mes, dia] = fecha.split('-')
  const nombre = DIAS_LARGOS[new Date(Number(anio), Number(mes) - 1, Number(dia)).getDay()]
  return { dia: nombre ?? '', ddmm: `${dia}/${mes}` }
}

/** El texto del resumen semanal para mandar por WhatsApp. */
export function textoResumenSemanal(s: DatosSemana): string {
  const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })
  const lineas = [
    `*Granja Dani · semana del ${diaYFecha(s.desde).ddmm} al ${diaYFecha(s.hasta).ddmm}*`,
  ]
  if (s.cantidad_tickets === 0) {
    lineas.push('No hubo ventas cargadas esta semana.')
    return lineas.join('\n')
  }
  let vendido = `Vendiste *${p(s.total)}* en ${s.dias_trabajados} ${s.dias_trabajados === 1 ? 'día' : 'días'} (${s.cantidad_tickets} ventas, ${formatearCantidad(s.kilos)})`
  if (s.total_anterior && s.total_anterior > 0) {
    const cambio = Math.round(((s.total - s.total_anterior) / s.total_anterior) * 100)
    vendido +=
      cambio === 0
        ? ', igual que la semana anterior'
        : `, ${cambio > 0 ? '📈' : '📉'} ${Math.abs(cambio)} % ${cambio > 0 ? 'más' : 'menos'} que la semana anterior`
  }
  lineas.push(`${vendido}.`)
  lineas.push(`• Efectivo: ${p(s.total_efectivo)}`)
  lineas.push(`• Mercado Pago: ${p(s.total_mercadopago)}`)
  lineas.push(`Promedio por día: ${p(s.promedio_diario)}`)
  if (s.mejor_dia && s.mejor_dia_total) {
    const { dia, ddmm } = diaYFecha(s.mejor_dia)
    lineas.push(`🏆 Mejor día: ${dia} ${ddmm} (${p(s.mejor_dia_total)})`)
  }
  if (s.egresos > 0) {
    lineas.push(`Gastos cargados: ${p(s.egresos)} · quedó aprox. ${p(s.total - s.egresos)}`)
  }
  if (s.diferencia_caja !== 0) {
    lineas.push(
      `Diferencias de caja en la semana: ${s.diferencia_caja > 0 ? 'sobraron' : 'faltaron'} ${p(Math.abs(s.diferencia_caja))}`,
    )
  } else {
    lineas.push('La caja dio justa todos los días ✅')
  }
  return lineas.join('\n')
}
