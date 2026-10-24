// Genera los íconos PNG de la app (PWA) y el favicon a partir del gallo del logo (brand/gallo.png).
// Uso: node scripts/generar-iconos.mjs   (usa el Chromium de Playwright)
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Colores del logo de Granja Los Amigos (los mismos de src/styles/app.css).
const ROJO = '#cc3430'
const PAPEL = '#f5f2eb'
const gallo = `data:image/png;base64,${(await readFile('brand/gallo.png')).toString('base64')}`

// circulo = parte del ancho que ocupa el círculo crema; radio = esquinas (0 en maskable: el sistema recorta)
const ICONOS = [
  { archivo: 'public/iconos/icono-192.png', lado: 192, circulo: 0.84, radio: 0.22 },
  { archivo: 'public/iconos/icono-512.png', lado: 512, circulo: 0.84, radio: 0.22 },
  { archivo: 'public/iconos/icono-maskable-512.png', lado: 512, circulo: 0.66, radio: 0 },
  { archivo: 'public/iconos/apple-touch-icon.png', lado: 180, circulo: 0.8, radio: 0 },
  { archivo: 'public/favicon.png', lado: 64, circulo: 0.9, radio: 0.22 },
]

const navegador = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
})
const pagina = await navegador.newPage()
for (const i of ICONOS) {
  const c = i.lado * i.circulo
  await pagina.setViewportSize({ width: i.lado, height: i.lado })
  await pagina.setContent(`<html><body style="margin:0;background:transparent">
    <div style="width:${i.lado}px;height:${i.lado}px;background:${ROJO};border-radius:${i.radio * i.lado}px;display:flex;align-items:center;justify-content:center">
      <div style="width:${c}px;height:${c}px;border-radius:50%;background:${PAPEL};display:flex;align-items:center;justify-content:center">
        <img src="${gallo}" style="width:72%;margin-top:-4%">
      </div>
    </div></body></html>`)
  await pagina.screenshot({ path: i.archivo, omitBackground: true })
  console.log('✓', i.archivo)
}
await navegador.close()
