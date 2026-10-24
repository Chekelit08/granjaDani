import { useState } from 'react'
import { useAnularSalida, useAnularTicket } from '../../datos/caja'
import { mensajeDeError } from '../../lib/errores'
import { formatearPesos } from '../../lib/formato'
import { Boton } from '../ui/Boton'

const MOTIVOS_RAPIDOS = {
  venta: [
    'Error de carga',
    'Se cargó dos veces',
    'Medio de pago equivocado',
    'El cliente devolvió',
  ],
  salida: ['Error de carga', 'Se cargó dos veces', 'Volvió la plata a la caja'],
}

/**
 * Anular con motivo obligatorio. Inline, sin modal, para no frenar el mostrador.
 * Una venta se anula entera (todos los productos del ticket); una salida, sola.
 */
export function PanelAnular({
  id,
  importe,
  alTerminar,
  tipo,
}: {
  /** ticket_id para una venta, id para una salida. */
  id: string
  importe: number
  alTerminar: () => void
  tipo: 'venta' | 'salida'
}) {
  const [motivo, setMotivo] = useState('')
  const anularTicket = useAnularTicket()
  const anularSalida = useAnularSalida()
  const anular = tipo === 'venta' ? anularTicket : anularSalida
  const monto = formatearPesos(importe, { sinCentavos: importe % 1 === 0 })

  const confirmar = () => {
    const m = motivo.trim()
    if (tipo === 'venta')
      anularTicket.mutate({ ticketId: id, motivo: m }, { onSuccess: alTerminar })
    else anularSalida.mutate({ id, motivo: m }, { onSuccess: alTerminar })
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-borde bg-hundida p-4"
      role="group"
      aria-label={`Anular ${tipo} de ${monto}`}
    >
      <p className="text-sm font-semibold">
        ¿Por qué anulás esta {tipo} de {monto}?
      </p>
      <div className="flex flex-wrap gap-2">
        {MOTIVOS_RAPIDOS[tipo].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMotivo(m)}
            aria-pressed={motivo === m}
            className="min-h-9 rounded-full border border-borde-fuerte bg-superficie px-3 text-sm font-medium hover:bg-hundida aria-pressed:border-marca aria-pressed:bg-marca aria-pressed:text-sobre-marca"
          >
            {m}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Motivo
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={200}
          className="min-h-11 rounded-xl border border-borde-fuerte bg-superficie px-3 font-normal focus:border-foco focus:ring-3 focus:ring-foco/20 focus:outline-none"
          placeholder="Ej.: error de carga"
        />
      </label>
      {anular.error && (
        <p role="alert" className="text-sm font-medium text-alerta-texto">
          {mensajeDeError(anular.error)}
        </p>
      )}
      <div className="flex gap-2">
        <Boton variante="secundario" tamano="chico" onClick={alTerminar}>
          No anular
        </Boton>
        <Boton
          variante="peligro"
          tamano="chico"
          disabled={motivo.trim().length < 3}
          cargando={anular.isPending}
          onClick={confirmar}
        >
          Anular {tipo}
        </Boton>
      </div>
    </div>
  )
}
