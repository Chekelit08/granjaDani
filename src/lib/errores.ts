/**
 * Convierte cualquier error en un mensaje para quien usa la app.
 * Los errores de reglas de negocio vienen de la base ya escritos para el mostrador.
 */

export const MENSAJE_SIN_INTERNET =
  'Sin internet: no se guardó. Revisá la conexión y probá de nuevo.'

/** Códigos de Postgres cuyos mensajes escribimos nosotros (ver migraciones). */
const CODIGOS_PROPIOS = new Set(['P0001', 'P0002', '42501'])

interface ErrorConCodigo {
  code?: string
  message?: string
}

export function esErrorDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (error instanceof TypeError) return true // fetch falla con TypeError cuando no hay red
  const mensaje = (error as ErrorConCodigo | null)?.message ?? ''
  return /failed to fetch|networkerror|load failed|network request failed/i.test(mensaje)
}

export function mensajeDeError(error: unknown): string {
  if (esErrorDeRed(error)) return MENSAJE_SIN_INTERNET
  const e = error as ErrorConCodigo | null
  if (e?.code && CODIGOS_PROPIOS.has(e.code) && e.message) {
    // RLS sin mensaje propio
    if (e.message.startsWith('new row violates row-level security')) {
      return 'No tenés permiso para hacer esto.'
    }
    return e.message
  }
  if (e?.code === '23514') return 'Hay un dato que no es válido. Revisá lo que cargaste.'
  if (e?.code === '23505') return 'Ya existe un registro igual.'
  return 'Algo salió mal y no se guardó. Probá de nuevo; si sigue pasando, avisale a un administrador.'
}
