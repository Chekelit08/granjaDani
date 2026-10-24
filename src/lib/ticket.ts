/**
 * Lógica de la carga de un ticket (uno o más productos que el cliente paga junto).
 * Sin React: se prueba con Vitest. La base vuelve a validar todo.
 */
import { IMPORTE_MAXIMO } from './importe'

export type Unidad = 'kg' | 'unidad'

export interface ProductoCaja {
  id: string
  nombre: string
  unidad: Unidad
  precio: number | null
}

/** Una línea del ticket: un producto, con kilos (o unidades) y/o importe. */
export interface LineaTicket {
  producto: ProductoCaja
  cantidad: number | null
  importe: number
}

export const CANTIDAD_MAXIMA = 9999

/**
 * Lo que se tipea en "Kilos": "1,250", "1.25", "0,5", ",5". Hasta 3 decimales (gramos).
 * Devuelve el texto limpio para el campo (con coma) y el número (null si está vacío).
 */
export function normalizarCantidad(texto: string): { texto: string; valor: number | null } {
  let t = texto.replace(/\./g, ',').replace(/[^\d,]/g, '')
  const coma = t.indexOf(',')
  if (coma >= 0) {
    t = `${t.slice(0, coma + 1)}${t.slice(coma + 1).replace(/,/g, '')}`
    const [entero = '', decimales = ''] = t.split(',')
    t = `${entero.slice(0, 4)},${decimales.slice(0, 3)}`
  } else {
    t = t.slice(0, 4)
  }
  t = t.replace(/^0+(?=\d)/, '')
  const numero = Number(t.replace(',', '.'))
  const valor = t === '' || t === ',' || !Number.isFinite(numero) || numero <= 0 ? null : numero
  return { texto: t, valor }
}

/** Importe en pesos enteros: cantidad × precio, redondeado al peso. */
export function importeDeCantidad(cantidad: number, precio: number): number {
  return Math.min(Math.round(cantidad * precio), IMPORTE_MAXIMO)
}

/** Kilos que corresponden a un importe (cuando piden "$ 5.000 de papa"). 3 decimales. */
export function cantidadDeImporte(importe: number, precio: number): number {
  return Math.round((importe / precio) * 1000) / 1000
}

export interface LineaEnCurso {
  producto: ProductoCaja | null
  cantidad: number | null
  /** Importe tipeado a mano. Si es null y hay precio, se calcula de la cantidad. */
  importeManual: number | null
}

/**
 * Cómo queda la línea que se está cargando: el importe calculado (o el tipeado) y la
 * cantidad (la tipeada, o la que sale del importe si hay precio). null si todavía falta algo.
 */
export function resolverLinea(l: LineaEnCurso): LineaTicket | null {
  if (!l.producto) return null
  const precio = l.producto.precio
  let importe = l.importeManual
  let cantidad = l.cantidad
  if (importe === null && cantidad !== null && precio) importe = importeDeCantidad(cantidad, precio)
  if (importe !== null && cantidad === null && precio && l.producto.unidad === 'kg') {
    cantidad = cantidadDeImporte(importe, precio)
  }
  if (importe === null || importe <= 0) return null
  if (cantidad !== null && (cantidad <= 0 || cantidad > CANTIDAD_MAXIMA)) return null
  return { producto: l.producto, cantidad: cantidad && cantidad > 0 ? cantidad : null, importe }
}

/** Qué le falta a la línea en curso para poder guardarla, en palabras para el mostrador. */
export function faltaEnLinea(l: LineaEnCurso): string | null {
  if (!l.producto) return 'Elegí un producto: tocalo o escribí las primeras letras.'
  if (l.importeManual === null && l.cantidad === null) {
    return l.producto.precio
      ? `Escribí cuántos ${l.producto.unidad === 'kg' ? 'kilos' : 'unidades'} o el importe.`
      : `${l.producto.nombre} no tiene precio cargado: escribí el importe.`
  }
  if (l.importeManual === null && !l.producto.precio) {
    return `${l.producto.nombre} no tiene precio cargado: escribí el importe.`
  }
  return null
}

export function totalTicket(lineas: LineaTicket[]): number {
  return lineas.reduce((t, l) => t + l.importe, 0)
}

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Elegir producto tipeando: "mi" → Milanesa, "pe" → Pechuga, "pap" → Papa.
 * Busca primero al principio del nombre y después al principio de cualquier palabra
 * ("mus" → Pata y muslo). Si hay varios, gana el primero de la lista (el orden de la planilla).
 */
export function buscarProducto<P extends { nombre: string }>(
  productos: P[],
  texto: string,
): P | null {
  const buscado = sinAcentos(texto.trim())
  if (!buscado) return null
  const alPrincipio = productos.find((p) => sinAcentos(p.nombre).startsWith(buscado))
  if (alPrincipio) return alPrincipio
  return (
    productos.find((p) =>
      sinAcentos(p.nombre)
        .split(/[\s.]+/)
        .some((palabra) => palabra.startsWith(buscado)),
    ) ?? null
  )
}

/** Para mandar a la base (`registrar_ticket`). */
export function itemsParaGuardar(lineas: LineaTicket[]) {
  return lineas.map((l) => ({
    producto_id: l.producto.id,
    cantidad: l.cantidad,
    importe: l.importe,
  }))
}
