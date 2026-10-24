import { Calculator, X } from 'lucide-react'
import { useState } from 'react'
import { calcularVuelto, pagosSugeridos } from '../../lib/ayudas'
import { formatearMiles, formatearPesos } from '../../lib/formato'
import { normalizarImporte } from '../../lib/importe'

/**
 * Después de una venta en efectivo: "¿Con cuánto pagó?" con los billetes más probables.
 * Es opcional: si se empieza a tipear la venta siguiente, desaparece sola.
 */
export function CalculadoraVuelto({
  importe,
  alCerrar,
}: {
  importe: number
  alCerrar: () => void
}) {
  const [pago, setPago] = useState<number | null>(null)
  const [otro, setOtro] = useState('')
  const vuelto = pago === null ? null : calcularVuelto(importe, pago)

  return (
    <div
      role="region"
      aria-label="Calcular el vuelto"
      className="flex animate-aparecer flex-col gap-3 rounded-xl border border-borde bg-hundida p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="size-4 text-suave" aria-hidden="true" />
          ¿Con cuánto pagó? ({formatearPesos(importe, { sinCentavos: true })})
        </p>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar la calculadora de vuelto"
          className="grid size-9 presionable place-items-center rounded-lg text-suave hover:bg-superficie hover:text-texto"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {pagosSugeridos(importe).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => {
              setPago(b)
              setOtro('')
            }}
            aria-pressed={pago === b && !otro}
            className="min-h-11 presionable rounded-xl border border-borde-fuerte bg-superficie px-3 text-sm font-semibold cifras shadow-tarjeta hover:bg-hundida aria-pressed:border-efectivo aria-pressed:bg-efectivo aria-pressed:text-sobre-medio"
          >
            $ {formatearMiles(b)}
          </button>
        ))}
        <label className="flex min-h-11 items-center gap-1 rounded-xl border border-borde-fuerte bg-superficie px-3 text-sm shadow-tarjeta focus-within:border-foco">
          <span className="text-suave">Otro $</span>
          <input
            inputMode="numeric"
            aria-label="Pagó con otro importe"
            value={otro}
            onChange={(e) => {
              const n = normalizarImporte(e.target.value)
              setOtro(n ? formatearMiles(n) : '')
              setPago(n || null)
            }}
            className="w-24 bg-transparent font-semibold cifras outline-none"
            placeholder="0"
          />
        </label>
      </div>
      {pago !== null && (
        <p aria-live="polite" className="animate-aparecer text-lg">
          {vuelto === null ? (
            <span className="font-semibold text-alerta-texto">
              Faltan {formatearPesos(importe - pago, { sinCentavos: true })}
            </span>
          ) : (
            <>
              Vuelto:{' '}
              <strong className="text-2xl font-semibold tracking-tight cifras">
                {formatearPesos(vuelto, { sinCentavos: true })}
              </strong>
            </>
          )}
        </p>
      )}
    </div>
  )
}
