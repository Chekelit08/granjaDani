import { describe, expect, it } from 'vitest'
import {
  accionDeTecla,
  formatearImporteEnCurso,
  IMPORTE_MAXIMO,
  normalizarImporte,
} from './importe'

describe('normalizarImporte', () => {
  it('se queda con los dígitos', () => {
    expect(normalizarImporte('12500')).toBe(12500)
    expect(normalizarImporte('12.500')).toBe(12500)
    expect(normalizarImporte('$ 8.300')).toBe(8300)
  })
  it('vacío o ceros es 0', () => {
    expect(normalizarImporte('')).toBe(0)
    expect(normalizarImporte('000')).toBe(0)
    expect(normalizarImporte('abc')).toBe(0)
  })
  it('ignora ceros adelante', () => {
    expect(normalizarImporte('0012')).toBe(12)
  })
  it('corta en 7 dígitos', () => {
    expect(normalizarImporte('123456789')).toBe(1234567)
    expect(normalizarImporte('99999999')).toBe(IMPORTE_MAXIMO)
  })
})

describe('formatearImporteEnCurso', () => {
  it('pone puntos de miles', () => {
    expect(formatearImporteEnCurso(1234567)).toBe('1.234.567')
    expect(formatearImporteEnCurso(500)).toBe('500')
  })
  it('0 se muestra vacío', () => {
    expect(formatearImporteEnCurso(0)).toBe('')
  })
})

describe('accionDeTecla', () => {
  it('Enter guarda en efectivo, + en Mercado Pago', () => {
    expect(accionDeTecla({ key: 'Enter' })).toBe('efectivo')
    expect(accionDeTecla({ key: 'Enter', code: 'NumpadEnter' })).toBe('efectivo')
    expect(accionDeTecla({ key: '+', code: 'NumpadAdd' })).toBe('mercadopago')
    expect(accionDeTecla({ key: '+', code: 'Equal' })).toBe('mercadopago')
  })
  it('− abre "Sacar efectivo"', () => {
    expect(accionDeTecla({ key: '-', code: 'NumpadSubtract' })).toBe('salida')
    expect(accionDeTecla({ key: '-', code: 'Minus' })).toBe('salida')
  })
  it('Esc borra y el resto no hace nada', () => {
    expect(accionDeTecla({ key: 'Escape' })).toBe('borrar')
    expect(accionDeTecla({ key: '5' })).toBeNull()
    expect(accionDeTecla({ key: 'e' })).toBeNull()
  })
})
