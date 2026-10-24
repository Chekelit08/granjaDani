import { describe, expect, it } from 'vitest'
import {
  buscarProducto,
  cantidadDeImporte,
  faltaEnLinea,
  importeDeCantidad,
  itemsParaGuardar,
  normalizarCantidad,
  resolverLinea,
  totalTicket,
  type ProductoCaja,
} from './ticket'

const milanesa: ProductoCaja = { id: 'm', nombre: 'Milanesa', unidad: 'kg', precio: 9800 }
const pata: ProductoCaja = { id: 'p', nombre: 'Pata y muslo', unidad: 'kg', precio: 5200 }
const pechuga: ProductoCaja = { id: 'pe', nombre: 'Pechuga', unidad: 'kg', precio: 8900 }
const huevo: ProductoCaja = { id: 'h', nombre: 'Huevo', unidad: 'unidad', precio: 250 }
const papa: ProductoCaja = { id: 'pa', nombre: 'Papa', unidad: 'kg', precio: 900 }
const condimento: ProductoCaja = {
  id: 'c',
  nombre: 'B. horno y condimento',
  unidad: 'kg',
  precio: null,
}
const lista = [milanesa, pata, pechuga, huevo, papa, condimento]

describe('normalizarCantidad', () => {
  it('acepta coma o punto y hasta 3 decimales', () => {
    expect(normalizarCantidad('1,250')).toEqual({ texto: '1,250', valor: 1.25 })
    expect(normalizarCantidad('1.5')).toEqual({ texto: '1,5', valor: 1.5 })
    expect(normalizarCantidad('0,5555')).toEqual({ texto: '0,555', valor: 0.555 })
    expect(normalizarCantidad(',5')).toEqual({ texto: ',5', valor: 0.5 })
  })
  it('deja escribir la coma sola y los ceros', () => {
    expect(normalizarCantidad('2,')).toEqual({ texto: '2,', valor: 2 })
    expect(normalizarCantidad('0,0')).toEqual({ texto: '0,0', valor: null })
    expect(normalizarCantidad('')).toEqual({ texto: '', valor: null })
  })
  it('ignora letras, comas de más y ceros adelante', () => {
    expect(normalizarCantidad('1,2,3')).toEqual({ texto: '1,23', valor: 1.23 })
    expect(normalizarCantidad('kg 3')).toEqual({ texto: '3', valor: 3 })
    expect(normalizarCantidad('007')).toEqual({ texto: '7', valor: 7 })
    expect(normalizarCantidad('123456')).toEqual({ texto: '1234', valor: 1234 })
  })
})

describe('importe y kilos', () => {
  it('calcula el importe redondeado al peso', () => {
    expect(importeDeCantidad(1.25, 9800)).toBe(12250)
    expect(importeDeCantidad(0.333, 5200)).toBe(1732)
  })
  it('calcula los kilos de un importe', () => {
    expect(cantidadDeImporte(5000, 900)).toBe(5.556)
  })
})

describe('resolverLinea', () => {
  it('con kilos y precio, calcula el importe', () => {
    expect(resolverLinea({ producto: milanesa, cantidad: 1.5, importeManual: null })).toEqual({
      producto: milanesa,
      cantidad: 1.5,
      importe: 14700,
    })
  })
  it('con importe y precio, calcula los kilos', () => {
    expect(resolverLinea({ producto: papa, cantidad: null, importeManual: 5000 })).toEqual({
      producto: papa,
      cantidad: 5.556,
      importe: 5000,
    })
  })
  it('el importe tipeado gana sobre el calculado', () => {
    expect(resolverLinea({ producto: milanesa, cantidad: 1, importeManual: 9500 })?.importe).toBe(
      9500,
    )
  })
  it('por unidad no inventa cantidades desde el importe', () => {
    expect(resolverLinea({ producto: huevo, cantidad: null, importeManual: 3000 })?.cantidad).toBe(
      null,
    )
    expect(resolverLinea({ producto: huevo, cantidad: 12, importeManual: null })?.importe).toBe(
      3000,
    )
  })
  it('sin precio hace falta el importe', () => {
    expect(resolverLinea({ producto: condimento, cantidad: 0.2, importeManual: null })).toBeNull()
    expect(resolverLinea({ producto: condimento, cantidad: 0.2, importeManual: 700 })).toEqual({
      producto: condimento,
      cantidad: 0.2,
      importe: 700,
    })
  })
  it('sin producto o sin nada cargado no hay línea', () => {
    expect(resolverLinea({ producto: null, cantidad: 1, importeManual: 100 })).toBeNull()
    expect(resolverLinea({ producto: milanesa, cantidad: null, importeManual: null })).toBeNull()
  })
})

describe('faltaEnLinea', () => {
  it('dice qué falta', () => {
    expect(faltaEnLinea({ producto: null, cantidad: null, importeManual: null })).toMatch(
      /Elegí un producto/,
    )
    expect(faltaEnLinea({ producto: milanesa, cantidad: null, importeManual: null })).toBe(
      'Escribí cuántos kilos o el importe.',
    )
    expect(faltaEnLinea({ producto: condimento, cantidad: 0.1, importeManual: null })).toMatch(
      /no tiene precio/,
    )
    expect(faltaEnLinea({ producto: milanesa, cantidad: 1, importeManual: null })).toBeNull()
  })
})

describe('buscarProducto', () => {
  it('elige por las primeras letras, en el orden de la planilla', () => {
    expect(buscarProducto(lista, 'm')).toBe(milanesa)
    expect(buscarProducto(lista, 'p')).toBe(pata)
    expect(buscarProducto(lista, 'pe')).toBe(pechuga)
    expect(buscarProducto(lista, 'pap')).toBe(papa)
    expect(buscarProducto(lista, 'HUE')).toBe(huevo)
  })
  it('también por el principio de otra palabra', () => {
    expect(buscarProducto(lista, 'mus')).toBe(pata)
    expect(buscarProducto(lista, 'cond')).toBe(condimento)
  })
  it('null si no hay ninguno', () => {
    expect(buscarProducto(lista, 'x')).toBeNull()
    expect(buscarProducto(lista, ' ')).toBeNull()
  })
})

describe('ticket', () => {
  it('suma y arma lo que va a la base', () => {
    const lineas = [
      { producto: milanesa, cantidad: 1, importe: 9800 },
      { producto: huevo, cantidad: null, importe: 3000 },
    ]
    expect(totalTicket(lineas)).toBe(12800)
    expect(itemsParaGuardar(lineas)).toEqual([
      { producto_id: 'm', cantidad: 1, importe: 9800 },
      { producto_id: 'h', cantidad: null, importe: 3000 },
    ])
  })
})
