import { describe, expect, it } from 'vitest'
import {
  enlaceWhatsapp,
  normalizarWhatsapp,
  textoResumen,
  textoResumenSemanal,
  type DatosResumen,
} from './whatsapp'

describe('normalizarWhatsapp', () => {
  it('arma el número para wa.me', () => {
    expect(normalizarWhatsapp('11 2233 4455')).toBe('5491122334455')
    expect(normalizarWhatsapp('011 2233-4455')).toBe('5491122334455')
    expect(normalizarWhatsapp('+54 9 11 2233 4455')).toBe('5491122334455')
    expect(normalizarWhatsapp('+54 11 2233 4455')).toBe('5491122334455')
    expect(normalizarWhatsapp('0351 455-6677')).toBe('5493514556677')
  })
  it('rechaza lo que no entiende', () => {
    expect(normalizarWhatsapp('')).toBeNull()
    expect(normalizarWhatsapp('2233 4455')).toBeNull()
    expect(normalizarWhatsapp('11 15 2233 4455')).toBeNull()
  })
})

const base: DatosResumen = {
  fecha: '2026-10-17',
  total: 245_300,
  cantidad_tickets: 87,
  total_efectivo: 165_300,
  total_mercadopago: 80_000,
  kilos: 52.75,
  total_salidas: 30_000,
  efectivo_esperado: 100_000,
  efectivo_contado: 99_500,
  diferencia_efectivo: -500,
  nota: 'Faltó cambio',
  productos: [
    { nombre: 'Milanesa', unidad: 'kg', cantidad: 12.5, total: 122_500 },
    { nombre: 'Huevo', unidad: 'unidad', cantidad: 60, total: 15_000 },
    { nombre: 'Menudo', unidad: 'kg', cantidad: 0, total: 0 },
  ],
}

describe('textoResumen', () => {
  it('resume el día con lo que importa', () => {
    const t = textoResumen(base)
    expect(t).toContain('Granja Dani · cierre del sábado 17/10')
    expect(t).toMatch(/Total: \*\$\s245\.300\* \(87 ventas · 52,75 kg\)/)
    expect(t).toMatch(/Efectivo: \$\s165\.300/)
    expect(t).toMatch(/Mercado Pago: \$\s80\.000/)
    expect(t).toMatch(/Salidas de caja: − \$\s30\.000/)
    expect(t).toMatch(/Faltan \$\s500/)
    expect(t).toContain('Nota: Faltó cambio')
  })
  it('lista los productos vendidos, con kilos o unidades', () => {
    const t = textoResumen(base)
    expect(t).toMatch(/• Milanesa \(12,5 kg\): \$\s122\.500/)
    expect(t).toMatch(/• Huevo \(60 u\.\): \$\s15\.000/)
    expect(t).not.toContain('Menudo')
  })
  it('sin salidas no las menciona', () => {
    const t = textoResumen({ ...base, total_salidas: 0, diferencia_efectivo: 0, productos: [] })
    expect(t).not.toContain('Salidas')
    expect(t).not.toContain('Por producto')
    expect(t).toContain('La caja coincide')
  })
})

describe('enlaceWhatsapp', () => {
  it('con número va directo; sin número deja elegir el contacto', () => {
    expect(enlaceWhatsapp('5491122334455', 'hola y chau')).toBe(
      'https://wa.me/5491122334455?text=hola%20y%20chau',
    )
    expect(enlaceWhatsapp(null, 'x')).toBe('https://wa.me/?text=x')
  })
})

describe('textoResumenSemanal', () => {
  const semana = {
    desde: '2026-10-12',
    hasta: '2026-10-18',
    total: 1_080_000,
    cantidad_tickets: 140,
    total_efectivo: 600_000,
    total_mercadopago: 480_000,
    kilos: 410.5,
    dias_trabajados: 6,
    promedio_diario: 180_000,
    diferencia_caja: -500,
    mejor_dia: '2026-10-17',
    mejor_dia_total: 260_000,
    total_anterior: 1_000_000,
    egresos: 300_000,
  }
  it('resume la semana y la compara con la anterior', () => {
    const t = textoResumenSemanal(semana)
    expect(t).toContain('semana del 12/10 al 18/10')
    expect(t).toMatch(/Vendiste \*\$\s1\.080\.000\* en 6 días \(140 ventas, 410,5 kg\)/)
    expect(t).toContain('8 % más que la semana anterior')
    expect(t).toContain('Mejor día: sábado 17/10')
    expect(t).toMatch(/quedó aprox\. \$\s780\.000/)
    expect(t).toMatch(/faltaron \$\s500/)
  })
  it('sin ventas lo dice simple', () => {
    expect(textoResumenSemanal({ ...semana, cantidad_tickets: 0, total: 0 })).toContain(
      'No hubo ventas',
    )
  })
})
