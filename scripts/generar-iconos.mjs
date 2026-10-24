// Genera los íconos PNG de la app (PWA) a partir de brand/marca-provisoria.svg.
// Cuando llegue el logo de la granja, reemplazá ese archivo y los colores de abajo, y volvé a correrlo.
// Uso: node scripts/generar-iconos.mjs   (usa el Chromium de Playwright)
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const CAMPO = '#1f5c3b'
const BLANCO = '#ffffff'
const marca = (await readFile('brand/marca-provisoria.svg', 'utf8')).replace('currentColor', BLANCO)
const dataMarca = `data:image/svg+xml;base64,${Buffer.from(marca).toString('base64')}`

// escala = qué parte del ancho ocupa la marca; radio = esquinas (0 en maskable: el sistema recorta)
const ICONOS = [
  { archivo: 'icono-192.png', lado: 192, escala: 0.78, radio: 0.19 },
  { archivo: 'icono-512.png', lado: 512, escala: 0.78, radio: 0.19 },
  { archivo: 'icono-maskable-512.png', lado: 512, escala: 0.58, radio: 0 },
  { archivo: 'apple-touch-icon.png', lado: 180, escala: 0.72, radio: 0 },
]

const navegador = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
})
const pagina = await navegador.newPage()
for (const i of ICONOS) {
  await pagina.setViewportSize({ width: i.lado, height: i.lado })
  await pagina.setContent(`<html><body style="margin:0;background:transparent">
    <div style="width:${i.lado}px;height:${i.lado}px;background:${CAMPO};border-radius:${i.radio * i.lado}px;display:flex;align-items:center;justify-content:center">
      <img src="${dataMarca}" style="width:${i.escala * 100}%">
    </div></body></html>`)
  await pagina.screenshot({ path: `public/iconos/${i.archivo}`, omitBackground: true })
  console.log('✓', i.archivo)
}
await navegador.close()
