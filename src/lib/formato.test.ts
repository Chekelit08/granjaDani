import { describe, expect, it } from 'vitest'
import {
  fechaDeTrabajo,
  formatearDiaCorto,
  formatearFecha,
  formatearHora,
  formatearMiles,
  formatearPesos,
} from './formato'

const nbsp = ' '

describe('formatearPesos', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatearPesos(1234567.89)).toBe(`$${nbsp}1.234.567,89`)
  })
  it('muestra siempre dos decimales', () => {
    expect(formatearPesos(500)).toBe(`$${nbsp}500,00`)
  })
  it('puede omitir los centavos', () => {
    expect(formatearPesos(12500, { sinCentavos: true })).toBe(`$${nbsp}12.500`)
  })
})

describe('formatearMiles', () => {
  it('separa miles con punto', () => {
    expect(formatearMiles(9999999)).toBe('9.999.999')
    expect(formatearMiles(0)).toBe('0')
  })
})

describe('fechas en hora argentina', () => {
  // 17/10/2026 01:30 UTC = 16/10/2026 22:30 en Buenos Aires (UTC-3)
  const casiMedianoche = new Date('2026-10-17T01:30:00Z')

  it('formatea dd/mm/aaaa en Buenos Aires, no en UTC', () => {
    expect(formatearFecha(casiMedianoche)).toBe('16/10/2026')
    expect(formatearHora(casiMedianoche)).toBe('22:30')
  })
  it('la fecha de trabajo es la del local', () => {
    expect(fechaDeTrabajo(casiMedianoche)).toBe('2026-10-16')
  })
  it('el día corto va en castellano', () => {
    expect(formatearDiaCorto(new Date('2026-10-17T15:00:00Z'))).toBe('sáb 17/10')
  })
})

describe('formatos compactos', () => {
  it('abrevia montos grandes', async () => {
    const { formatearPesosCompacto } = await import('./formato')
    expect(formatearPesosCompacto(1_200_000)).toMatch(/^\$ 1,2\sM$/)
  })
  it('porcentajes con signo', async () => {
    const { formatearPorcentaje } = await import('./formato')
    expect(formatearPorcentaje(6.25)).toBe('+6,3 %')
    expect(formatearPorcentaje(-3)).toBe('−3,0 %')
    expect(formatearPorcentaje(0)).toBe('0,0 %')
  })
})

describe('cantidadVentas', () => {
  it('singular y plural', async () => {
    const { cantidadVentas } = await import('./formato')
    expect(cantidadVentas(1)).toBe('1 venta')
    expect(cantidadVentas(0)).toBe('0 ventas')
    expect(cantidadVentas(3)).toBe('3 ventas')
  })
})
