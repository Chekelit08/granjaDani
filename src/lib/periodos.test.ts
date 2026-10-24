import { describe, expect, it } from 'vitest'
import { fechaCorta, moverPeriodo, periodo, ultimosDias } from './periodos'

describe('periodo', () => {
  it('la semana va de lunes a domingo y compara con la anterior', () => {
    const p = periodo('semana', '2026-10-17') // sábado
    expect(p.desde).toBe('2026-10-12')
    expect(p.hasta).toBe('2026-10-18')
    expect(p.anterior).toEqual({ desde: '2026-10-05', hasta: '2026-10-11' })
  })
  it('el mes compara con el mes calendario anterior', () => {
    const p = periodo('mes', '2026-03-31')
    expect(p).toMatchObject({ desde: '2026-03-01', hasta: '2026-03-31' })
    expect(p.anterior).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(p.titulo).toBe('marzo de 2026')
  })
  it('el día compara con el día anterior', () => {
    expect(periodo('dia', '2026-10-01').anterior.desde).toBe('2026-09-30')
  })
})

describe('moverPeriodo y rangos', () => {
  it('navega períodos', () => {
    expect(moverPeriodo('mes', '2026-01-31', -1)).toBe('2025-12-31')
    expect(moverPeriodo('semana', '2026-10-17', 1)).toBe('2026-10-24')
  })
  it('últimos 30 días incluye hoy', () => {
    expect(ultimosDias('2026-10-17', 30)).toEqual({ desde: '2026-09-18', hasta: '2026-10-17' })
  })
  it('formatea dd/mm', () => {
    expect(fechaCorta('2026-10-05')).toBe('05/10')
  })
})

describe('hastaHoy', () => {
  it('compara el mes en curso con el mismo tramo del mes anterior', async () => {
    const { hastaHoy, periodo } = await import('./periodos')
    const p = hastaHoy(periodo('mes', '2026-10-17'), '2026-10-17')
    expect(p).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-17', recortado: true })
    expect(p.anterior).toEqual({ desde: '2026-09-01', hasta: '2026-09-17' })
  })
  it('un período terminado queda igual', async () => {
    const { hastaHoy, periodo } = await import('./periodos')
    expect(hastaHoy(periodo('mes', '2026-09-10'), '2026-10-17').recortado).toBe(false)
  })
  it('no se pasa del fin del mes anterior (31 contra febrero)', async () => {
    const { hastaHoy, periodo } = await import('./periodos')
    const p = hastaHoy(periodo('mes', '2026-03-31'), '2026-03-30')
    expect(p.anterior.hasta).toBe('2026-02-28')
  })
})
