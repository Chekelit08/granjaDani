// Lee las variables del servidor desde el entorno o desde .env.servidor (ignorado por git).
// La clave de servicio da acceso total: se usa SOLO en estos scripts, en tu compu, nunca en la app.
import { existsSync, readFileSync } from 'node:fs'

export function variablesServidor() {
  const env = { ...process.env }
  if (existsSync('.env.servidor')) {
    for (const linea of readFileSync('.env.servidor', 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  const url = env.SUPABASE_URL
  const clave = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) {
    console.error(
      'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Crealos en un archivo .env.servidor (no se sube a git). Ver docs/BACKUP.md.',
    )
    process.exit(1)
  }
  return { url: url.replace(/\/$/, ''), clave }
}

export function cabeceras(clave) {
  return { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' }
}
