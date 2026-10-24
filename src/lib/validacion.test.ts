import { describe, expect, it } from 'vitest'
import { esquemaClave, textoAMonto } from './validacion'

describe('textoAMonto', () => {
  it('entiende el formato argentino', () => {
    expect(textoAMonto('12.500')).toBe(12500)
    expect(textoAMonto('1.234.567,89')).toBe(1234567.89)
    expect(textoAMonto('$ 8.300,5')).toBe(8300.5)
  })
  it('entiende números simples', () => {
    expect(textoAMonto('15000')).toBe(15000)
    expect(textoAMonto('15000.5')).toBe(15000.5)
  })
  it('rechaza texto inválido', () => {
    expect(textoAMonto('')).toBeNull()
    expect(textoAMonto('abc')).toBeNull()
    expect(textoAMonto('1,234,5')).toBeNull()
  })
})

describe('esquemaClave', () => {
  it('exige al menos 10 caracteres', () => {
    expect(esquemaClave.safeParse('corta').success).toBe(false)
    expect(esquemaClave.safeParse('pollo con papas').success).toBe(true)
  })
})
