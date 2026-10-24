import { useMemo, useState } from 'react'
import type { MedioPago, Producto, Venta } from '../../datos/caja'
import { puedeAnular } from '../../lib/caja'
import { formatearCantidad, formatearHora, formatearPesos } from '../../lib/formato'
import { useSesion } from '../../sesion/Sesion'
import { Chip, EtiquetaMedio } from '../ui/Estados'
import { PanelAnular } from './PanelAnular'

const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })

interface Ticket {
  id: string
  registradaEn: string
  registradaPor: string
  medio: MedioPago
  ventas: Venta[]
  total: number
  anulado: boolean
}

/** Agrupa las ventas por ticket, del más nuevo al más viejo. */
function agruparTickets(ventas: Venta[]): Ticket[] {
  const porId = new Map<string, Ticket>()
  for (const v of ventas) {
    let t = porId.get(v.ticket_id)
    if (!t) {
      t = {
        id: v.ticket_id,
        registradaEn: v.registrada_en,
        registradaPor: v.registrada_por,
        medio: v.medio_pago,
        ventas: [],
        total: 0,
        anulado: true,
      }
      porId.set(v.ticket_id, t)
    }
    t.ventas.push(v)
    if (!v.anulada) {
      t.total += v.importe
      t.anulado = false
    }
  }
  return [...porId.values()].sort((a, b) => b.registradaEn.localeCompare(a.registradaEn))
}

export function ListaTickets({
  ventas,
  productos,
  editable,
  limite,
  titulo,
  resaltado,
}: {
  ventas: Venta[]
  productos: Producto[]
  /** false en días cerrados: no se puede anular. */
  editable: boolean
  limite?: number
  titulo?: string
  /** El ticket recién guardado se marca un momento. */
  resaltado?: string | null
}) {
  const { perfil, esAdmin } = useSesion()
  const [mostrarAnulados, setMostrarAnulados] = useState(false)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [verTodos, setVerTodos] = useState(false)

  const nombres = useMemo(() => new Map(productos.map((x) => [x.id, x])), [productos])
  const tickets = useMemo(() => agruparTickets(ventas), [ventas])
  const visibles = tickets.filter((t) => mostrarAnulados || !t.anulado)
  const recortados = limite && !verTodos ? visibles.slice(0, limite) : visibles
  const cantidadAnulados = tickets.filter((t) => t.anulado).length
  const usuario = { id: perfil?.id ?? '', esAdmin }

  return (
    <section aria-labelledby="titulo-tickets">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-3">
        <h2 id="titulo-tickets" className="text-base font-bold">
          {titulo ?? (limite ? 'Últimas ventas' : 'Ventas')}
        </h2>
        {cantidadAnulados > 0 && (
          <label className="flex min-h-9 items-center gap-2 text-sm text-suave">
            <input
              type="checkbox"
              checked={mostrarAnulados}
              onChange={(e) => setMostrarAnulados(e.target.checked)}
              className="size-4 accent-marca"
            />
            Ver anuladas ({cantidadAnulados})
          </label>
        )}
      </div>
      {recortados.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-semibold">Todavía no hay ventas</p>
          <p className="mt-1 text-sm text-suave">
            Elegí un producto, escribí los kilos y apretá Enter para cargar la primera.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-borde">
          {recortados.map((t) => {
            const vivas = t.ventas.filter((v) => !v.anulada)
            const anulables = vivas.length > 0 && vivas.every((v) => puedeAnular(v, usuario))
            return (
              <li key={t.id} className={`px-5 ${t.id === resaltado ? 'animate-resaltar' : ''}`}>
                <div
                  className={`flex min-h-14 items-center gap-4 py-2 ${t.anulado ? 'text-suave' : ''} ${t.id === resaltado ? 'animate-entrar' : ''}`}
                >
                  <span className="w-11 shrink-0 text-sm text-suave cifras">
                    {formatearHora(new Date(t.registradaEn))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                      {t.ventas.map((v) => {
                        const producto = nombres.get(v.producto_id)
                        return (
                          <span
                            key={v.id}
                            className={v.anulada ? 'text-suave line-through' : 'font-medium'}
                          >
                            {producto?.nombre ?? 'Producto'}
                            {v.cantidad !== null && (
                              <span className="font-normal text-suave cifras">
                                {' '}
                                {formatearCantidad(v.cantidad, producto?.unidad)}
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </span>
                    <span className="mt-0.5 block">
                      {t.anulado ? (
                        <Chip tono="error">Anulada</Chip>
                      ) : (
                        <EtiquetaMedio medio={t.medio} />
                      )}
                    </span>
                  </span>
                  <span
                    className={`text-right font-bold cifras ${t.anulado ? 'line-through' : ''}`}
                  >
                    {p(t.anulado ? t.ventas.reduce((s, v) => s + v.importe, 0) : t.total)}
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    {editable && anulables && anulando !== t.id && (
                      <button
                        type="button"
                        onClick={() => setAnulando(t.id)}
                        className="min-h-9 rounded-lg px-2 text-sm font-medium text-suave hover:bg-alerta-suave hover:text-alerta-texto"
                      >
                        Anular
                      </button>
                    )}
                  </span>
                </div>
                {t.anulado && t.ventas[0]?.motivo_anulacion && (
                  <p className="pb-2 pl-15 text-xs text-suave">
                    Motivo: {t.ventas[0].motivo_anulacion}
                  </p>
                )}
                {anulando === t.id && (
                  <div className="pb-3">
                    <PanelAnular
                      tipo="venta"
                      id={t.id}
                      importe={t.total}
                      alTerminar={() => setAnulando(null)}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {limite && visibles.length > limite && (
        <div className="border-t border-borde px-5 py-2">
          <button
            type="button"
            onClick={() => setVerTodos((t) => !t)}
            className="min-h-9 text-sm font-medium text-suave hover:text-texto"
          >
            {verTodos ? 'Ver menos' : `Ver las ${visibles.length} ventas del día`}
          </button>
        </div>
      )}
    </section>
  )
}
