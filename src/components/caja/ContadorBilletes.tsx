import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { BILLETES, totalContado } from '../../lib/ayudas'
import { formatearMiles, formatearPesos } from '../../lib/formato'
import { normalizarImporte } from '../../lib/importe'

/**
 * Contar la caja billete por billete: cuántos de cada uno, y la app suma.
 * El total va directo al "Efectivo contado".
 */
export function ContadorBilletes({ alCambiar }: { alCambiar: (total: number) => void }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [monedas, setMonedas] = useState(0)

  const actualizar = (nuevas: Record<number, number>, nuevasMonedas = monedas) => {
    setCantidades(nuevas)
    setMonedas(nuevasMonedas)
    alCambiar(totalContado(nuevas, nuevasMonedas))
  }
  const cambiar = (billete: number, n: number) =>
    actualizar({ ...cantidades, [billete]: Math.max(0, Math.min(9999, n)) })

  return (
    <fieldset className="flex animate-aparecer flex-col gap-2 rounded-xl border border-borde bg-hundida p-4">
      <legend className="sr-only">Contar billetes</legend>
      <div className="grid grid-cols-1 gap-2">
        {BILLETES.map((b) => {
          const n = cantidades[b] ?? 0
          return (
            <div
              key={b}
              className="flex items-center justify-between gap-2 rounded-xl bg-superficie px-3 py-1.5 shadow-tarjeta"
            >
              <span className="w-24 font-semibold whitespace-nowrap cifras">
                $ {formatearMiles(b)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Un billete de $ ${formatearMiles(b)} menos`}
                  onClick={() => cambiar(b, n - 1)}
                  disabled={n === 0}
                  className="grid size-9 presionable place-items-center rounded-lg border border-borde-fuerte hover:bg-hundida disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <input
                  inputMode="numeric"
                  aria-label={`Cantidad de billetes de $ ${formatearMiles(b)}`}
                  value={n || ''}
                  placeholder="0"
                  onChange={(e) => cambiar(b, normalizarImporte(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="h-9 w-12 rounded-lg border border-borde-fuerte bg-superficie text-center font-semibold cifras focus:border-foco focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Un billete de $ ${formatearMiles(b)} más`}
                  onClick={() => cambiar(b, n + 1)}
                  className="grid size-9 presionable place-items-center rounded-lg border border-borde-fuerte hover:bg-hundida"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
              <span className="hidden w-24 text-right text-sm whitespace-nowrap text-suave cifras sm:inline">
                {n > 0 ? formatearPesos(b * n, { sinCentavos: true }) : ''}
              </span>
            </div>
          )
        })}
        <label className="flex items-center justify-between gap-2 rounded-xl bg-superficie px-3 py-1.5 shadow-tarjeta">
          <span className="font-semibold">Monedas</span>
          <span className="flex items-center gap-1 text-suave">
            $
            <input
              inputMode="numeric"
              aria-label="Total en monedas"
              value={monedas ? formatearMiles(monedas) : ''}
              placeholder="0"
              onChange={(e) => actualizar(cantidades, normalizarImporte(e.target.value))}
              className="h-9 w-24 rounded-lg border border-borde-fuerte bg-superficie px-2 text-right font-semibold text-texto cifras focus:border-foco focus:outline-none"
            />
          </span>
        </label>
      </div>
      <p className="text-right text-sm text-suave">
        Total contado:{' '}
        <strong className="text-base text-texto cifras">
          {formatearPesos(totalContado(cantidades, monedas), { sinCentavos: true })}
        </strong>
      </p>
    </fieldset>
  )
}
