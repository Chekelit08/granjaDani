import { LayoutGrid, Rows3 } from 'lucide-react'
import { useState } from 'react'
import { formatearCantidad, formatearPesos } from '../../lib/formato'
import { Segmentado } from '../ui/Segmentado'

/** Una fila de la planilla: lo que la base devuelve en planilla_jornada / planilla_periodo. */
export interface FilaPlanilla {
  producto_id: string
  nombre: string
  unidad: 'kg' | 'unidad'
  cantidad: number
  total: number
  total_efectivo: number
  total_mercadopago: number
  ventas: number
}

const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })

function totalesPlanilla(filas: FilaPlanilla[]) {
  return filas.reduce(
    (t, f) => ({
      kilos: t.kilos + (f.unidad === 'kg' ? f.cantidad : 0),
      total: t.total + f.total,
      efectivo: t.efectivo + f.total_efectivo,
      mercadopago: t.mercadopago + f.total_mercadopago,
    }),
    { kilos: 0, total: 0, efectivo: 0, mercadopago: 0 },
  )
}

function Celda({
  etiqueta,
  valor,
  tono,
  fuerte = false,
}: {
  etiqueta: string
  valor: string
  tono?: string
  fuerte?: boolean
}) {
  return (
    <div className="min-w-0 px-3 py-1.5">
      <dt className={`text-[10px] font-bold tracking-wider uppercase ${tono ?? 'text-suave'}`}>
        {etiqueta}
      </dt>
      <dd
        className={`truncate cifras ${fuerte ? 'text-base font-extrabold' : 'text-sm font-semibold'}`}
      >
        {valor}
      </dd>
    </div>
  )
}

/** Cada producto como un casillero de la planilla de papel: KG · $ · EFE · MP. */
function Casilleros({ filas }: { filas: FilaPlanilla[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filas.map((f) => {
        const vacio = f.ventas === 0
        return (
          <li
            key={f.producto_id}
            className={`overflow-hidden rounded-2xl border ${vacio ? 'border-dashed border-borde-fuerte bg-transparent' : 'border-borde bg-superficie shadow-tarjeta'}`}
          >
            <p
              className={`flex items-center justify-between gap-2 px-3 py-2 text-sm font-extrabold tracking-wide uppercase ${vacio ? 'text-suave' : 'bg-marca-suave text-marca'}`}
            >
              <span className="truncate">{f.nombre}</span>
              {!vacio && (
                <span className="shrink-0 text-xs font-semibold tracking-normal normal-case opacity-80">
                  {f.ventas} {f.ventas === 1 ? 'venta' : 'ventas'}
                </span>
              )}
            </p>
            <dl className="grid grid-cols-2 divide-x divide-borde">
              <Celda
                etiqueta={f.unidad === 'kg' ? 'Kg' : 'Unid.'}
                valor={
                  f.cantidad ? formatearCantidad(f.cantidad, f.unidad).replace(/ .*/, '') : '—'
                }
              />
              <Celda etiqueta="$" valor={vacio ? '—' : p(f.total)} fuerte />
            </dl>
            <dl className="grid grid-cols-2 divide-x divide-borde border-t border-borde">
              <Celda
                etiqueta="EFE"
                tono="text-efectivo"
                valor={vacio ? '—' : p(f.total_efectivo)}
              />
              <Celda etiqueta="MP" tono="text-mp" valor={vacio ? '—' : p(f.total_mercadopago)} />
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

/** La misma información como tabla, para leer de corrido o comparar columnas. */
function Tabla({ filas }: { filas: FilaPlanilla[] }) {
  const t = totalesPlanilla(filas)
  return (
    <div className="overflow-x-auto rounded-2xl border border-borde bg-superficie">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-borde bg-hundida text-left text-xs font-bold tracking-wider text-suave uppercase">
            <th scope="col" className="px-4 py-2.5">
              Producto
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Kg / unid.
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              $
            </th>
            <th scope="col" className="px-3 py-2.5 text-right text-efectivo">
              EFE
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-mp">
              MP
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {filas.map((f) => (
            <tr key={f.producto_id} className={f.ventas === 0 ? 'text-suave' : ''}>
              <th scope="row" className="px-4 py-2 text-left font-semibold">
                {f.nombre}
              </th>
              <td className="px-3 py-2 text-right cifras">
                {f.cantidad ? formatearCantidad(f.cantidad, f.unidad) : '—'}
              </td>
              <td className="px-3 py-2 text-right font-semibold cifras">{p(f.total)}</td>
              <td className="px-3 py-2 text-right cifras">{p(f.total_efectivo)}</td>
              <td className="px-4 py-2 text-right cifras">{p(f.total_mercadopago)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-borde-fuerte font-bold">
            <th scope="row" className="px-4 py-2.5 text-left">
              Total
            </th>
            <td className="px-3 py-2.5 text-right cifras">{formatearCantidad(t.kilos)}</td>
            <td className="px-3 py-2.5 text-right cifras">{p(t.total)}</td>
            <td className="px-3 py-2.5 text-right cifras">{p(t.efectivo)}</td>
            <td className="px-4 py-2.5 text-right cifras">{p(t.mercadopago)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/**
 * La planilla del día (o de un período), igual que la hoja de papel:
 * por producto, kilos, pesos, efectivo y Mercado Pago. Se ve como casilleros o como tabla.
 */
export function Planilla({
  filas,
  titulo = 'Planilla del día',
  accion,
}: {
  filas: FilaPlanilla[]
  titulo?: string
  accion?: React.ReactNode
}) {
  const [vista, setVista] = useState<'casilleros' | 'tabla'>('casilleros')
  const t = totalesPlanilla(filas)

  return (
    <section aria-labelledby="titulo-planilla" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-planilla" className="text-base font-bold">
            {titulo}
          </h2>
          <p className="text-sm text-suave cifras">
            {formatearCantidad(t.kilos)} · {p(t.total)} ·{' '}
            <span className="text-efectivo">EFE {p(t.efectivo)}</span> ·{' '}
            <span className="text-mp">MP {p(t.mercadopago)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {accion}
          <Segmentado
            etiqueta="Vista de la planilla"
            valor={vista}
            onCambio={setVista}
            opciones={[
              {
                valor: 'casilleros',
                texto: (
                  <>
                    <LayoutGrid className="size-4" aria-hidden="true" /> Casilleros
                  </>
                ),
              },
              {
                valor: 'tabla',
                texto: (
                  <>
                    <Rows3 className="size-4" aria-hidden="true" /> Tabla
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>
      {vista === 'casilleros' ? <Casilleros filas={filas} /> : <Tabla filas={filas} />}
    </section>
  )
}
