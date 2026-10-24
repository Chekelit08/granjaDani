import { describe, expect, it } from 'vitest'
import {
  DOMINIO_USUARIOS,
  emailDeUsuario,
  usuarioDeEmail,
  usuarioSugerido,
  usuarioValido,
} from './usuario'

describe('usuario simple', () => {
  it('"mostrador" se guarda como email de la app', () => {
    expect(emailDeUsuario(' Mostrador ')).toBe(`mostrador@${DOMINIO_USUARIOS}`)
    expect(usuarioDeEmail(`mostrador@${DOMINIO_USUARIOS}`)).toBe('mostrador')
  })
  it('un email de verdad queda igual', () => {
    expect(emailDeUsuario('Eze@Gmail.com')).toBe('eze@gmail.com')
    expect(usuarioDeEmail('eze@gmail.com')).toBe('eze@gmail.com')
  })
  it('sugiere un usuario a partir del nombre', () => {
    expect(usuarioSugerido('Juan Pérez')).toBe('juan.perez')
    expect(usuarioSugerido('  Mostrador  ')).toBe('mostrador')
  })
  it('valida usuarios y emails', () => {
    expect(usuarioValido('mostrador')).toBe(true)
    expect(usuarioValido('juan.perez')).toBe(true)
    expect(usuarioValido('ab')).toBe(false)
    expect(usuarioValido('con espacio')).toBe(false)
    expect(usuarioValido('eze@gmail.com')).toBe(true)
    expect(usuarioValido('eze@gmail')).toBe(false)
  })
})
