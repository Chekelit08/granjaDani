import { expect, test, type Page } from '@playwright/test'

const CLAVE = 'granja-prueba-2026'

async function ingresar(page: Page, usuario: string) {
  await page.goto('/ingresar')
  await page.getByLabel('Usuario o email').fill(usuario)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test.describe.configure({ mode: 'serial' })

// Precios del seed: Milanesa $ 9.800/kg, Papa $ 900/kg, Huevo $ 250/u., Pechuga $ 8.900/kg.
test('flujo del día: abrir, cargar tickets por producto con el teclado, planilla y cierre', async ({
  page,
}) => {
  await ingresar(page, 'mostrador')

  // Abrir el día con fondo de caja: se tipea y Enter
  await expect(page.getByRole('heading', { name: 'Abrir el día' })).toBeVisible()
  await page.getByLabel('Fondo de caja inicial').fill('10000')
  await page.getByLabel('Fondo de caja inicial').press('Enter')

  // "mi" elige Milanesa, 1,5 kg calcula $ 14.700, Enter = efectivo
  const kilos = page.getByLabel(/^(Kilos|Unidades)$/)
  const importe = page.getByLabel('Importe', { exact: true })
  await expect(kilos).toBeFocused()
  await kilos.pressSequentially('mi')
  await expect(page.getByRole('button', { name: /Milanesa/, pressed: true })).toBeVisible()
  await kilos.pressSequentially('1,5')
  await expect(importe).toHaveAttribute('placeholder', '14.700')
  await kilos.press('Enter')
  await expect(page.getByText(/Venta guardada · Efectivo/)).toBeVisible()

  // Calculadora de vuelto: pagó con $ 20.000
  await page.getByRole('button', { name: '$ 20.000' }).click()
  await expect(page.getByText(/Vuelto:\s*\$\s5\.300/)).toBeVisible()

  // Un ticket con dos productos: 2 kg de papa y 12 huevos, con Mercado Pago (+)
  await kilos.focus()
  await kilos.pressSequentially('pap2')
  await kilos.pressSequentially('hue12')
  await expect(page.getByText('Total', { exact: true }).locator('..')).toContainText('$ 4.800')
  await kilos.press('+')
  await expect(page.getByText(/Venta guardada · Mercado Pago/)).toBeVisible()
  await expect(page.getByText('(2 productos)')).toBeVisible()

  // Por importe: "$ 5.000 de pechuga" (Tab va al importe)
  await kilos.pressSequentially('pe')
  await kilos.press('Tab')
  await expect(importe).toBeFocused()
  await importe.fill('5000')
  await importe.press('Enter')
  await expect(page.getByText(/Venta guardada · Efectivo/)).toBeVisible()

  // Un total alto pide confirmación; Esc vuelve sin borrar y Esc otra vez borra
  await kilos.focus()
  await kilos.pressSequentially('mi40')
  await kilos.press('Enter')
  await expect(page.getByText(/Es un importe alto/)).toBeVisible()
  await kilos.press('Escape')
  await expect(page.getByText(/Es un importe alto/)).toHaveCount(0)
  await expect(kilos).toHaveValue('40')
  await kilos.press('Escape')
  await expect(kilos).toHaveValue('')

  // Pagarle al proveedor con plata de la caja: tecla −, importe, motivo y Enter
  await kilos.press('-')
  const salida = page.getByLabel('Importe que sale')
  await expect(salida).toBeFocused()
  await salida.fill('2000')
  await page.getByRole('button', { name: 'Pago a proveedor' }).click()
  await page.getByLabel(/Proveedor/).fill('Huevos La Colina')
  await page.getByLabel(/Proveedor/).press('Enter')
  await expect(page.getByRole('heading', { name: 'Salidas de caja' })).toBeVisible()

  // La planilla del día, como la hoja de papel
  await expect(page.getByRole('heading', { name: 'Planilla del día' })).toBeVisible()
  await page.getByText('Tabla', { exact: true }).click()
  const fila = page.getByRole('row', { name: /Milanesa/ })
  await expect(fila).toContainText('1,5 kg')
  await expect(fila).toContainText('$ 14.700')

  // Cerrar el día con un faltante de $ 700: esperado = 10.000 + 14.700 + 5.000 − 2.000
  await page.getByRole('link', { name: 'Cerrar el día' }).click()
  await expect(page.getByText('$ 27.700,00').first()).toBeVisible()
  const contado = page.getByLabel('Efectivo contado')
  await page.getByRole('button', { name: 'Contar billete por billete' }).click()
  await page.getByRole('button', { name: 'Un billete de $ 20.000 más' }).click()
  await page.getByLabel('Cantidad de billetes de $ 1.000').fill('7')
  await expect(contado).toHaveValue('27.000')
  await contado.focus()
  await expect(page.getByText(/Faltan \$\s700,00/)).toBeVisible()
  await contado.press('Enter')
  await expect(
    page.getByText('Vas a cerrar el día. Después no se puede modificar sin un administrador.'),
  ).toBeVisible()
  await contado.press('Enter')
  await expect(page.getByRole('heading', { name: 'Día cerrado' })).toBeVisible()
  const whatsapp = page.getByRole('link', { name: 'Mandar resumen por WhatsApp' })
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*Milanesa/)

  // El día queda bloqueado
  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page.getByRole('heading', { name: 'El día de hoy ya se cerró' })).toBeVisible()
  await expect(page.getByText('$ 24.500,00')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reabrir el día' })).toHaveCount(0)
})

test('el cajero no ve las secciones de administración', async ({ page }) => {
  await ingresar(page, 'mostrador')
  await expect(page.getByRole('heading', { name: 'El día de hoy ya se cerró' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Egresos' })).toHaveCount(0)
  await page.goto('/productos')
  await expect(page.getByText('Esta sección es solo para administradores')).toBeVisible()
})

test('login con contraseña incorrecta muestra un error claro', async ({ page }) => {
  await page.goto('/ingresar')
  await page.getByLabel('Usuario o email').fill('mostrador')
  await page.getByLabel('Contraseña').fill('cualquiera-mal')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('El usuario o la contraseña no coinciden.')).toBeVisible()
})

test('con clave temporal, el primer ingreso obliga a elegir una nueva', async ({ page }) => {
  await page.goto('/ingresar')
  await page.getByLabel('Usuario o email').fill('temporal')
  await page.getByLabel('Contraseña').fill('pollo-asado-1234')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('Hola Lucía: elegí tu contraseña')).toBeVisible()
  await page.getByLabel('Contraseña nueva').fill('corta')
  await page.getByLabel('Repetí la contraseña').fill('corta')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByText('Tiene que tener al menos 10 caracteres')).toBeVisible()
  await page.getByLabel('Contraseña nueva').fill('milanesa con papas')
  await page.getByLabel('Repetí la contraseña').fill('milanesa con papas')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByRole('heading', { name: 'El día de hoy ya se cerró' })).toBeVisible()
})
