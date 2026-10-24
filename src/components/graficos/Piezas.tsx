import type { ReactNode } from 'react'
import { formatearPesos, formatearPorcentaje } from '../../lib/formato'

export interface ItemLeyenda {
  color: string
  texto: string
  forma?: 'cuadrado' | 'linea'
}

export function Leyenda({ items }: { items: ItemLeyenda[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-suave">
      {items.map((i) => (
        <li key={i.texto} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={
              i.forma === 'linea' ? 'inline-block h-0.5 w-4' : 'inline-block size-3 rounded-sm'
            }
            style={{ background: i.color }}
          />
          {i.texto}
        </li>
      ))}
    </ul>
  )
}

/**
 * Cada gráfico responde una pregunta y tiene su tabla equivalente
 * ("Ver los datos"), para leer los valores sin depender del color ni del mouse.
 */
export function TarjetaGrafico({
  titulo,
  subtitulo,
  leyenda,
  tabla,
  accion,
  children,
  cargando,
}: {
  titulo: string
  subtitulo?: ReactNode
  leyenda?: ItemLeyenda[]
  tabla?: ReactNode
  accion?: ReactNode
  children: ReactNode
  cargando?: boolean
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">{titulo}</h2>
          {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
        </div>
        {accion}
      </div>
      {leyenda && <Leyenda items={leyenda} />}
      <div className={`transition-opacity ${cargando ? 'opacity-50' : ''}`}>{children}</div>
      {tabla && (
        <details className="text-sm">
          <summary className="min-h-9 cursor-pointer py-1.5 text-sm font-medium text-suave hover:text-texto">
            Ver los datos
          </summary>
          <div className="max-h-72 overflow-auto">{tabla}</div>
        </details>
      )}
    </section>
  )
}

export function TablaDatos({
  columnas,
  filas,
}: {
  columnas: string[]
  filas: (string | number)[][]
}) {
  return (
    <table className="w-full text-left">
      <thead className="text-xs text-suave uppercase">
        <tr>
          {columnas.map((c, i) => (
            <th
              key={c}
              scope="col"
              className={`py-2 font-medium tracking-wide ${i > 0 ? 'text-right' : ''}`}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-borde cifras">
        {filas.map((f, i) => (
          <tr key={i}>
            {f.map((v, j) => (
              <td key={j} className={`py-2 ${j > 0 ? 'text-right' : ''}`}>
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface EntradaTooltip {
  name?: string | number
  value?: number | string | (number | string)[]
  color?: string
  dataKey?: string | number
}

/** Tooltip legible en ambos modos: texto con tokens, el color solo en la marca. */
export function TooltipPesos({
  active,
  payload,
  label,
  formatoEtiqueta,
  nota,
}: {
  active?: boolean
  payload?: EntradaTooltip[]
  label?: string | number
  formatoEtiqueta?: (l: string) => string
  nota?: (l: string) => string | null
}) {
  if (!active || !payload?.length) return null
  const etiqueta = String(label ?? '')
  const extra = nota?.(etiqueta)
  return (
    <div className="rounded-lg border border-borde bg-superficie px-3 py-2 text-sm text-texto shadow-alta">
      <p className="mb-1 font-semibold">{formatoEtiqueta ? formatoEtiqueta(etiqueta) : etiqueta}</p>
      {extra ? (
        <p className="text-suave">{extra}</p>
      ) : (
        <ul>
          {payload.map((p) => (
            <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-2.5 rounded-sm"
                  style={{ background: p.color }}
                />
                {p.name}
              </span>
              <span className="font-semibold cifras">
                {formatearPesos(Number(p.value ?? 0), { sinCentavos: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Variación con flecha + signo + texto. Subir es bueno para ventas. */
export function Variacion({
  valor,
  contra,
  subirEsBueno = true,
}: {
  valor: number | null
  contra: string
  subirEsBueno?: boolean
}) {
  if (valor === null)
    return <span className="text-sm text-suave">Sin datos de {contra} para comparar</span>
  const sube = valor > 0
  const neutro = Math.abs(valor) < 0.05
  const bueno = sube === subirEsBueno
  const clase = neutro ? 'text-suave' : bueno ? 'text-ok' : 'text-alerta-texto'
  return (
    <span className={`text-sm font-semibold ${clase}`}>
      <span aria-hidden="true">{neutro ? '■' : sube ? '▲' : '▼'}</span> {formatearPorcentaje(valor)}{' '}
      <span className="font-normal text-suave">vs {contra}</span>
    </span>
  )
}

export function Indicador({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string
  valor: ReactNode
  detalle?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta">
      <p className="text-xs font-medium text-suave">{etiqueta}</p>
      <p className="text-2xl font-semibold tracking-tight">{valor}</p>
      {detalle && <div>{detalle}</div>}
    </div>
  )
}
