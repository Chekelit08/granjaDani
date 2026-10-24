import { z } from 'zod'

/** Contraseñas: mínimo 10 caracteres; sin reglas raras que estorben a los gestores de contraseñas. */
export const esquemaClave = z
  .string()
  .min(10, 'Tiene que tener al menos 10 caracteres')
  .max(72, 'Es demasiado larga (máximo 72 caracteres)')

/** Montos en pesos: mayores a 0, hasta 2 decimales. Acepta "12.500,50" o "12500.5". */
export function textoAMonto(texto: string): number | null {
  const limpio = texto.replace(/\$|\s/g, '')
  if (!limpio) return null
  // Si tiene coma, la coma es decimal y los puntos son miles (formato argentino).
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : limpio.replace(/\.(?=\d{3}(\D|$))/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null
  return Number(normalizado)
}

export const esquemaMonto = z.string().transform((t, ctx) => {
  const monto = textoAMonto(t)
  if (monto === null || monto <= 0) {
    ctx.addIssue({ code: 'custom', message: 'Escribí un monto mayor a $ 0, por ejemplo 15000' })
    return z.NEVER
  }
  return monto
})
