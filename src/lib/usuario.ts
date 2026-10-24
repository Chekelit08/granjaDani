/**
 * Cuentas con "usuario" simple (por ejemplo `mostrador`) en lugar de un email.
 * Supabase Auth necesita un email: por dentro se guarda como `mostrador@<DOMINIO_USUARIOS>`.
 * Quien ingresa escribe solo `mostrador`. Las cuentas con email de verdad siguen andando igual.
 */
export const DOMINIO_USUARIOS = 'usuarios.granja-dani.app'

/** Lo que se escribe al ingresar ("mostrador" o "nombre@gmail.com") → email para Supabase. */
export function emailDeUsuario(texto: string): string {
  const t = texto.trim().toLowerCase()
  return t.includes('@') ? t : `${t}@${DOMINIO_USUARIOS}`
}

/** Para mostrar: el usuario simple si la cuenta es de la app, o el email si es uno real. */
export function usuarioDeEmail(email: string | null | undefined): string {
  if (!email) return ''
  const sufijo = `@${DOMINIO_USUARIOS}`
  return email.endsWith(sufijo) ? email.slice(0, -sufijo.length) : email
}

/** "Juan Pérez" → "juan.perez". Solo letras, números y puntos. */
export function usuarioSugerido(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30)
}

/** Usuario válido: 3 a 30 letras, números o puntos (o un email completo). */
export function usuarioValido(texto: string): boolean {
  const t = texto.trim().toLowerCase()
  if (t.includes('@')) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)
  return /^[a-z0-9][a-z0-9.]{1,28}[a-z0-9]$/.test(t)
}
