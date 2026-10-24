import { formatearFecha, formatearHora, formatearPesos } from './formato'

export interface Registro {
  usuario_nombre: string | null
  accion: string
  created_at: string
  antes: unknown
  despues: unknown
}

type Datos = Record<string, unknown> | null

export const ACCIONES: Record<string, string> = {
  anular_venta: 'Anuló una venta',
  cerrar_jornada: 'Cerró un día',
  reabrir_jornada: 'Reabrió un día',
  cambiar_rol: 'Cambió un rol',
  desactivar_usuario: 'Desactivó un usuario',
  reactivar_usuario: 'Reactivó un usuario',
  crear_usuario: 'Creó un usuario',
  restablecer_clave: 'Restableció una contraseña',
  anular_egreso: 'Anuló un egreso',
  editar_egreso: 'Editó un egreso',
  sacar_efectivo: 'Sacó efectivo de la caja',
  anular_salida: 'Anuló una salida de caja',
  crear_producto: 'Agregó un producto',
  cambiar_precio: 'Cambió un precio',
  editar_producto: 'Editó un producto',
}

const fecha = (f: unknown) =>
  typeof f === 'string' ? formatearFecha(new Date(`${f}T12:00:00-03:00`)).slice(0, 5) : ''
const pesos = (n: unknown) =>
  typeof n === 'number' ? formatearPesos(n, { sinCentavos: n % 1 === 0 }) : ''
const texto = (v: unknown) => (typeof v === 'string' ? v : '')

/** "Gabriel reabrió el 12/10" + cuándo: "12/10 — 18:42" */
export function describir(r: Registro): { frase: string; cuando: string } {
  const quien = r.usuario_nombre ?? 'El sistema'
  const a = (r.antes ?? null) as Datos
  const d = (r.despues ?? null) as Datos
  const cuando = `${formatearFecha(new Date(r.created_at)).slice(0, 5)} — ${formatearHora(new Date(r.created_at))}`

  let que: string
  switch (r.accion) {
    case 'anular_venta':
      que = `anuló una venta de ${pesos(d?.importe)} (${texto(d?.motivo_anulacion)})`
      break
    case 'cerrar_jornada': {
      const dif = typeof d?.diferencia_efectivo === 'number' ? d.diferencia_efectivo : 0
      que = `cerró el día ${fecha(d?.fecha)}${dif === 0 ? ' con la caja justa' : dif > 0 ? ` con ${pesos(dif)} de más` : ` con ${pesos(-dif)} de menos`}`
      break
    }
    case 'reabrir_jornada':
      que = `reabrió el ${fecha(d?.fecha)}`
      break
    case 'cambiar_rol':
      que = `cambió el rol de ${texto(d?.nombre)} a ${d?.rol === 'admin' ? 'administrador' : 'cajero'}`
      break
    case 'desactivar_usuario':
      que = `desactivó a ${texto(d?.nombre)}`
      break
    case 'reactivar_usuario':
      que = `reactivó a ${texto(d?.nombre)}`
      break
    case 'crear_usuario':
      que = `creó la cuenta de ${texto(d?.nombre)} (${texto(d?.email)})`
      break
    case 'restablecer_clave':
      que = 'restableció una contraseña'
      break
    case 'anular_egreso':
      que = `anuló el egreso "${texto(d?.descripcion)}" de ${pesos(d?.monto)} (${texto(d?.motivo_anulacion)})`
      break
    case 'editar_egreso':
      que = `editó el egreso "${texto(d?.descripcion)}"${a?.monto !== d?.monto ? `: ${pesos(a?.monto)} → ${pesos(d?.monto)}` : ''}`
      break
    case 'sacar_efectivo':
      que = `sacó ${pesos(d?.importe)} de la caja${texto(d?.detalle) ? ` (${texto(d?.detalle)})` : ''}`
      break
    case 'anular_salida':
      que = `anuló una salida de caja de ${pesos(d?.importe)} (${texto(d?.motivo_anulacion)})`
      break
    case 'crear_producto':
      que = `agregó el producto ${texto(d?.nombre)}${typeof d?.precio === 'number' ? ` a ${pesos(d.precio)}` : ''}`
      break
    case 'cambiar_precio':
      que = `cambió el precio de ${texto(d?.nombre)}: ${pesos(a?.precio) || 'sin precio'} → ${pesos(d?.precio) || 'sin precio'}`
      break
    case 'editar_producto':
      que =
        a?.activo && d?.activo === false
          ? `dejó de vender ${texto(d?.nombre)}`
          : `editó el producto ${texto(d?.nombre)}`
      break
    default:
      que = r.accion
  }
  return { frase: `${quien} ${que}`, cuando }
}
