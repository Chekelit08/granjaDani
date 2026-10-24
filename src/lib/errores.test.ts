import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_INTERNET, mensajeDeError } from './errores'

describe('mensajeDeError', () => {
  it('usa el mensaje de la base para reglas de negocio', () => {
    expect(mensajeDeError({ code: 'P0001', message: 'El día de hoy ya está abierto.' })).toBe(
      'El día de hoy ya está abierto.',
    )
  })
  it('reconoce cuando no hay internet', () => {
    expect(mensajeDeError(new TypeError('Failed to fetch'))).toBe(MENSAJE_SIN_INTERNET)
    expect(mensajeDeError({ message: 'TypeError: NetworkError when attempting to fetch' })).toBe(
      MENSAJE_SIN_INTERNET,
    )
  })
  it('traduce el error de RLS', () => {
    expect(
      mensajeDeError({ code: '42501', message: 'new row violates row-level security policy' }),
    ).toBe('No tenés permiso para hacer esto.')
  })
  it('no muestra errores técnicos desconocidos', () => {
    expect(mensajeDeError({ code: 'XX000', message: 'internal' })).toMatch(/Algo salió mal/)
  })
})
