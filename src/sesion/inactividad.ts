/** Cierre automático tras 12 horas sin uso (la sesión del local queda abierta todo el día). */
export const HORAS_INACTIVIDAD = 12
const CLAVE = 'granja.ultimaActividad'

export function registrarActividad(ahora = Date.now()): void {
  try {
    localStorage.setItem(CLAVE, String(ahora))
  } catch {
    // Sin almacenamiento (modo privado): no se puede medir la inactividad; no pasa nada.
  }
}

export function vencioPorInactividad(ahora = Date.now()): boolean {
  try {
    const ultima = Number(localStorage.getItem(CLAVE))
    if (!ultima) return false
    return ahora - ultima > HORAS_INACTIVIDAD * 3_600_000
  } catch {
    return false
  }
}
