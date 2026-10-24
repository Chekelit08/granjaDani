import { describe, expect, it } from 'vitest'
import { describir } from './auditoria'

const base = { usuario_nombre: 'Gabriel', created_at: '2026-10-12T21:42:00Z' }

describe('describir', () => {
  it('reapertura legible', () => {
    expect(
      describir({
        ...base,
        accion: 'reabrir_jornada',
        antes: null,
        despues: { fecha: '2026-10-12' },
      }),
    ).toEqual({
      frase: 'Gabriel reabrió el 12/10',
      cuando: '12/10 — 18:42',
    })
  })
  it('anulación con monto y motivo', () => {
    const { frase } = describir({
      ...base,
      accion: 'anular_venta',
      antes: null,
      despues: { importe: 12500, motivo_anulacion: 'Error de tipeo' },
    })
    expect(frase).toMatch(/^Gabriel anuló una venta de \$\s12\.500 \(Error de tipeo\)$/)
  })
  it('cierre con faltante', () => {
    const { frase } = describir({
      ...base,
      accion: 'cerrar_jornada',
      antes: null,
      despues: { fecha: '2026-10-12', diferencia_efectivo: -500 },
    })
    expect(frase).toMatch(/cerró el día 12\/10 con \$\s500 de menos$/)
  })
  it('sin usuario lo atribuye al sistema', () => {
    expect(
      describir({
        ...base,
        usuario_nombre: null,
        accion: 'restablecer_clave',
        antes: null,
        despues: null,
      }).frase,
    ).toBe('El sistema restableció una contraseña')
  })
})

describe('productos y salidas en la auditoría', () => {
  const base = { usuario_nombre: 'Dani', created_at: '2026-10-24T15:00:00Z' }
  it('cuenta un cambio de precio', () => {
    expect(
      describir({
        ...base,
        accion: 'cambiar_precio',
        antes: { nombre: 'Milanesa', precio: 9800 },
        despues: { nombre: 'Milanesa', precio: 10500 },
      }).frase,
    ).toMatch(/^Dani cambió el precio de Milanesa: \$\s9\.800 → \$\s10\.500$/)
  })
  it('cuenta cuando un producto deja de venderse', () => {
    expect(
      describir({
        ...base,
        accion: 'editar_producto',
        antes: { nombre: 'Menudo', activo: true },
        despues: { nombre: 'Menudo', activo: false },
      }).frase,
    ).toBe('Dani dejó de vender Menudo')
  })
  it('cuenta una salida de caja', () => {
    expect(
      describir({
        ...base,
        accion: 'sacar_efectivo',
        antes: null,
        despues: { importe: 150000, detalle: 'Huevos La Colina' },
      }).frase,
    ).toMatch(/^Dani sacó \$\s150\.000 de la caja \(Huevos La Colina\)$/)
  })
})
