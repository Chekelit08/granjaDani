import { describe, expect, it } from 'vitest'
import { armarResumen, cifrasPrincipales, filasProductos, nombreArchivo } from './resumenMensual'

const ventas = {
  desde: '2026-10-01',
  hasta: '2026-10-31',
  total: 1_000_000,
  total_efectivo: 600_000,
  total_mercadopago: 400_000,
  cantidad_tickets: 100,
  kilos: 250.5,
  ticket_promedio: 10_000,
  dias_trabajados: 4,
  promedio_diario: 250_000,
  diferencia_caja: -500,
  mejor_dia: '2026-10-03',
  mejor_dia_total: 300_000,
}

describe('armarResumen', () => {
  const r = armarResumen({
    titulo: 'octubre de 2026',
    desde: '2026-10-01',
    hasta: '2026-10-31',
    ventas,
    dias: [],
    egresos: [],
    egresosCategoria: [
      { categoria_id: 'a', categoria: 'Mercadería', total: 500_000, cantidad: 2 },
      { categoria_id: 'b', categoria: 'Alquiler', total: 200_000, cantidad: 1 },
    ],
    productos: [
      {
        producto_id: 'm',
        nombre: 'Milanesa',
        unidad: 'kg',
        orden: 10,
        cantidad: 50,
        total: 490_000,
        total_efectivo: 300_000,
        total_mercadopago: 190_000,
        ventas: 40,
      },
      {
        producto_id: 'x',
        nombre: 'Menudo',
        unidad: 'kg',
        orden: 130,
        cantidad: 0,
        total: 0,
        total_efectivo: 0,
        total_mercadopago: 0,
        ventas: 0,
      },
    ],
  })

  it('calcula el resultado aproximado: ventas − egresos', () => {
    expect(r.totalEgresos).toBe(700_000)
    expect(r.ganancia).toBe(300_000)
  })
  it('la planilla del mes lista solo los productos vendidos', () => {
    const filas = filasProductos(r)
    expect(filas).toHaveLength(1)
    expect(filas[0]?.[0]).toBe('Milanesa')
    expect(filas[0]?.[1]).toBe('50 kg')
  })
  it('las cifras principales empiezan por las ventas y terminan en el resultado', () => {
    const cifras = cifrasPrincipales(r)
    expect(cifras[0]?.[0]).toBe('Ventas totales')
    expect(cifras.at(-1)?.[0]).toBe('Resultado aproximado')
  })
  it('nombra el archivo con el mes', () => {
    expect(nombreArchivo(r, 'xlsx')).toBe('granja-dani-resumen-2026-10.xlsx')
  })
})
