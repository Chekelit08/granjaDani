import { describe, expect, it } from 'vitest'
import { calcularVuelto, horaArgentina, pagosSugeridos, saludo, totalContado } from './ayudas'

describe('vuelto', () => {
  it('sugiere billetes redondos arriba del importe', () => {
    expect(pagosSugeridos(8_300)).toEqual([10_000, 20_000, 30_000, 40_000])
    expect(pagosSugeridos(1_000)).toEqual([2_000, 5_000, 10_000, 20_000])
    expect(pagosSugeridos(0)).toEqual([])
  })
  it('calcula el vuelto', () => {
    expect(calcularVuelto(8_300, 10_000)).toBe(1_700)
    expect(calcularVuelto(8_300, 8_300)).toBe(0)
    expect(calcularVuelto(8_300, 5_000)).toBeNull()
  })
})

describe('conteo de billetes', () => {
  it('suma billetes y monedas', () => {
    expect(totalContado({ 20_000: 3, 1_000: 5, 100: 2 }, 50)).toBe(65_250)
  })
  it('ignora negativos y decimales', () => {
    expect(totalContado({ 1_000: -2, 500: 1.7 })).toBe(500)
  })
})

describe('saludo', () => {
  it('según la hora', () => {
    expect(saludo(8)).toBe('Buen día')
    expect(saludo(15)).toBe('Buenas tardes')
    expect(saludo(22)).toBe('Buenas noches')
    expect(saludo(3)).toBe('Buenas noches')
  })
  it('usa la hora de Buenos Aires', () => {
    expect(horaArgentina(new Date('2026-10-20T15:00:00Z'))).toBe(12)
  })
})
