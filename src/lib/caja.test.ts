import { describe, expect, it } from 'vitest'
import { calcularArqueo, necesitaConfirmacion, puedeAnular, variacion } from './caja'

const mostrador = { id: 'mostrador', esAdmin: false }
const admin = { id: 'gabriel', esAdmin: true }
const ahora = new Date('2026-10-17T18:00:00Z')
const haceMinutos = (m: number) => new Date(ahora.getTime() - m * 60_000).toISOString()

describe('puedeAnular', () => {
  it('el cajero anula su venta de hace menos de 10 minutos', () => {
    const venta = { registrada_por: 'mostrador', registrada_en: haceMinutos(9), anulada: false }
    expect(puedeAnular(venta, mostrador, ahora)).toBe(true)
  })
  it('pasados 10 minutos, el cajero ya no puede', () => {
    const venta = { registrada_por: 'mostrador', registrada_en: haceMinutos(10), anulada: false }
    expect(puedeAnular(venta, mostrador, ahora)).toBe(false)
  })
  it('el cajero no anula ventas de otra cuenta', () => {
    const venta = { registrada_por: 'gabriel', registrada_en: haceMinutos(1), anulada: false }
    expect(puedeAnular(venta, mostrador, ahora)).toBe(false)
  })
  it('el admin anula cualquier venta', () => {
    const venta = { registrada_por: 'mostrador', registrada_en: haceMinutos(300), anulada: false }
    expect(puedeAnular(venta, admin, ahora)).toBe(true)
  })
  it('nadie anula una venta ya anulada', () => {
    const venta = { registrada_por: 'mostrador', registrada_en: haceMinutos(1), anulada: true }
    expect(puedeAnular(venta, admin, ahora)).toBe(false)
  })
})

describe('necesitaConfirmacion', () => {
  it('pide confirmar por encima del tope', () => {
    expect(necesitaConfirmacion(500_001, 500_000)).toBe(true)
    expect(necesitaConfirmacion(500_000, 500_000)).toBe(false)
  })
})

describe('calcularArqueo', () => {
  it('coincide cuando el contado es el esperado', () => {
    expect(calcularArqueo(10_000, 250_000, 260_000)).toEqual({
      esperado: 260_000,
      contado: 260_000,
      diferencia: 0,
      estado: 'coincide',
    })
  })
  it('marca faltante', () => {
    const a = calcularArqueo(10_000, 250_000, 259_500)
    expect(a.diferencia).toBe(-500)
    expect(a.estado).toBe('falta')
  })
  it('marca sobrante', () => {
    expect(calcularArqueo(0, 1000, 1200).estado).toBe('sobra')
  })
  it('descuenta lo que se sacó de la caja', () => {
    const a = calcularArqueo(10_000, 250_000, 230_000, 30_000)
    expect(a.esperado).toBe(230_000)
    expect(a.estado).toBe('coincide')
  })
  it('no arrastra errores de coma flotante', () => {
    expect(calcularArqueo(0.1, 0.2, 0.3).diferencia).toBe(0)
  })
})

describe('variacion', () => {
  it('calcula el porcentaje contra el período anterior', () => {
    expect(variacion(110, 100)).toBeCloseTo(10)
    expect(variacion(90, 100)).toBeCloseTo(-10)
  })
  it('sin período anterior no hay variación', () => {
    expect(variacion(100, 0)).toBeNull()
  })
})
