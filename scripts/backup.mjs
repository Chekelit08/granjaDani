// Exporta todas las tablas del negocio a JSON y CSV en backups/AAAA-MM-DD_HHMM/.
// Uso: node scripts/backup.mjs     (ver docs/BACKUP.md)
import { mkdir, writeFile } from 'node:fs/promises'
import { cabeceras, variablesServidor } from './entorno.mjs'

const TABLAS = [
  'perfiles',
  'configuracion',
  'productos',
  'jornadas',
  'ventas',
  'salidas_caja',
  'categorias_egreso',
  'egresos',
  'auditoria',
]
const POR_PAGINA = 1000

const { url, clave } = variablesServidor()

function aCsv(filas) {
  if (filas.length === 0) return ''
  const columnas = Object.keys(filas[0])
  const celda = (v) => {
    if (v === null || v === undefined) return ''
    const texto = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  return (
    [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join(
      '\n',
    ) + '\n'
  )
}

async function leerTabla(tabla) {
  const filas = []
  for (let desde = 0; ; desde += POR_PAGINA) {
    const res = await fetch(`${url}/rest/v1/${tabla}?select=*&order=created_at.asc,id.asc`, {
      headers: {
        ...cabeceras(clave),
        Range: `${desde}-${desde + POR_PAGINA - 1}`,
        'Range-Unit': 'items',
      },
    })
    if (!res.ok) throw new Error(`${tabla}: ${res.status} ${await res.text()}`)
    const pagina = await res.json()
    filas.push(...pagina)
    if (pagina.length < POR_PAGINA) return filas
  }
}

const ahora = new Date()
const sello = ahora
  .toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
  .slice(0, 16)
  .replace(' ', '_')
  .replace(':', '')
const carpeta = `backups/${sello}`
await mkdir(carpeta, { recursive: true })

let total = 0
for (const tabla of TABLAS) {
  const filas = await leerTabla(tabla)
  total += filas.length
  await writeFile(`${carpeta}/${tabla}.json`, JSON.stringify(filas, null, 2))
  await writeFile(`${carpeta}/${tabla}.csv`, '﻿' + aCsv(filas)) // BOM: Excel abre bien los acentos
  console.log(`✓ ${tabla}: ${filas.length} filas`)
}
await writeFile(
  `${carpeta}/LEEME.txt`,
  `Backup de Granja Los Amigos del ${ahora.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.\n` +
    `${total} filas en ${TABLAS.length} tablas. Cada tabla está en .json (completo) y .csv (para abrir en Excel).\n` +
    'Guardalo en un lugar seguro: tiene datos reales del negocio.\n',
)
console.log(`\nListo: ${total} filas en ${carpeta}/`)
