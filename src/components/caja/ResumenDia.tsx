import type { ResumenJornada } from '../../datos/caja'
import { cantidadVentas, formatearCantidad, formatearPesos } from '../../lib/formato'
import { Chip } from '../ui/Estados'

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
      <dt className="text-suave">{etiqueta}</dt>
      <dd className={`cifras ${fuerte ? 'text-base font-bold' : 'font-semibold'}`}>{valor}</dd>
    </div>
  )
}

/** Total, por medio de pago, kilos, ticket promedio y caja. Calculado por la base. */
export function ResumenDia({ resumen }: { resumen: ResumenJornada }) {
  const p = (n: number) => formatearPesos(n)
  const totalBarra = resumen.total || 1
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-suave">Total del día</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight cifras">{p(resumen.total)}</p>
      </div>

      <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-hundida">
        <div
          className="bg-grafico-efectivo"
          style={{ width: `${(resumen.total_efectivo / totalBarra) * 100}%` }}
        />
        <div
          className="bg-grafico-mp"
          style={{ width: `${(resumen.total_mercadopago / totalBarra) * 100}%` }}
        />
      </div>

      <dl className="divide-y divide-borde">
        <Fila
          etiqueta={`Efectivo (${cantidadVentas(resumen.cantidad_efectivo)})`}
          valor={p(resumen.total_efectivo)}
        />
        <Fila
          etiqueta={`Mercado Pago (${cantidadVentas(resumen.cantidad_mercadopago)})`}
          valor={p(resumen.total_mercadopago)}
        />
        <Fila etiqueta="Kilos vendidos" valor={formatearCantidad(resumen.kilos)} />
        <Fila etiqueta="Cantidad de ventas" valor={String(resumen.cantidad_tickets)} />
        <Fila etiqueta="Ticket promedio" valor={p(resumen.ticket_promedio)} />
        {resumen.cantidad_anuladas > 0 && (
          <Fila
            etiqueta="Productos anulados (no suman)"
            valor={String(resumen.cantidad_anuladas)}
          />
        )}
        <Fila etiqueta="Fondo de caja inicial" valor={p(resumen.fondo_inicial)} />
        {resumen.cantidad_salidas > 0 && (
          <Fila
            etiqueta={`Salidas de caja (${resumen.cantidad_salidas})`}
            valor={`− ${p(resumen.total_salidas)}`}
          />
        )}
        <Fila etiqueta="Efectivo esperado en caja" valor={p(resumen.efectivo_esperado)} fuerte />
        {resumen.efectivo_contado !== null && (
          <Fila etiqueta="Efectivo contado" valor={p(resumen.efectivo_contado)} />
        )}
      </dl>
      {resumen.diferencia_efectivo !== null && <Diferencia monto={resumen.diferencia_efectivo} />}
    </div>
  )
}

/** Diferencia de caja con color + ícono + texto (nunca solo color). */
export function Diferencia({ monto, grande = false }: { monto: number; grande?: boolean }) {
  const texto =
    monto === 0
      ? '✓ La caja coincide'
      : `${monto > 0 ? '▲ Sobran' : '▼ Faltan'} ${formatearPesos(Math.abs(monto))}`
  const tono = monto === 0 ? 'ok' : monto > 0 ? 'aviso' : 'error'
  if (!grande) return <Chip tono={tono}>{texto}</Chip>
  const clase = {
    ok: 'bg-ok-suave text-ok',
    aviso: 'bg-aviso-suave text-aviso',
    error: 'bg-alerta-suave text-alerta-texto',
  }[tono]
  return <p className={`rounded-xl px-4 py-3 text-lg font-bold ${clase}`}>{texto}</p>
}
