import { CalendarDays, MessageCircle, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useConfiguracion } from '../datos/caja'
import { useResumenPeriodo, useTotalEgresos } from '../datos/reportes'
import { variacion } from '../lib/caja'
import { fechaDeTrabajo, formatearPesos, formatearPorcentaje } from '../lib/formato'
import { diaSemanaCorto, hastaHoy, moverPeriodo, periodo } from '../lib/periodos'
import { enlaceWhatsapp, textoResumenSemanal } from '../lib/whatsapp'
import { Cargando, Tarjeta } from './ui/Estados'
import { Segmentado } from './ui/Segmentado'

type Cual = 'pasada' | 'esta'

/** La semana en una tarjeta, con el botón para mandarla por WhatsApp. Solo para el dueño. */
export function ResumenSemanal() {
  const hoy = fechaDeTrabajo(new Date())
  const [cual, setCual] = useState<Cual>('pasada')
  const base =
    cual === 'pasada'
      ? periodo('semana', moverPeriodo('semana', hoy, -1))
      : hastaHoy(periodo('semana', hoy), hoy)
  const actual = useResumenPeriodo(base)
  const anterior = useResumenPeriodo(base.anterior)
  const egresos = useTotalEgresos(base)
  const config = useConfiguracion()
  const p = (n: number) => formatearPesos(n, { sinCentavos: true })

  const r = actual.data
  const cambio = r && anterior.data ? variacion(r.total, anterior.data.total) : null
  const texto =
    r &&
    textoResumenSemanal({
      ...r,
      desde: base.desde,
      hasta: base.hasta,
      total_anterior: anterior.data?.total ?? null,
      egresos: egresos.data ?? 0,
    })

  return (
    <Tarjeta className="flex flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold">Resumen de la semana</h2>
            <p className="text-sm text-suave">{base.titulo}</p>
          </div>
        </div>
        <Segmentado
          etiqueta="Qué semana"
          valor={cual}
          onCambio={setCual}
          opciones={[
            { valor: 'pasada', texto: 'Semana pasada' },
            { valor: 'esta', texto: 'Esta semana' },
          ]}
        />
      </div>

      {!r ? (
        <Cargando />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-hundida p-4">
              <p className="text-xs font-medium text-suave">Vendido</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight cifras">{p(r.total)}</p>
              {cambio !== null ? (
                <p
                  className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${cambio >= 0 ? 'text-ok' : 'text-alerta-texto'}`}
                >
                  {cambio >= 0 ? (
                    <TrendingUp className="size-4" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-4" aria-hidden="true" />
                  )}
                  {formatearPorcentaje(cambio)}
                  <span className="font-normal text-suave">vs la anterior</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-suave">{r.cantidad_tickets} ventas</p>
              )}
            </div>
            <div className="rounded-xl bg-hundida p-4">
              <p className="text-xs font-medium text-suave">Promedio por día</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight cifras">
                {p(r.promedio_diario)}
              </p>
              <p className="mt-1 text-sm text-suave">
                {r.dias_trabajados} {r.dias_trabajados === 1 ? 'día trabajado' : 'días trabajados'}
              </p>
            </div>
            <div className="rounded-xl bg-hundida p-4">
              <p className="flex items-center gap-1 text-xs font-medium text-suave">
                <Trophy className="size-3.5 text-aviso" aria-hidden="true" /> Mejor día
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight first-letter:uppercase">
                {r.mejor_dia ? diaSemanaCorto(r.mejor_dia) : '—'}
              </p>
              <p className="mt-1 text-sm text-suave cifras">
                {r.mejor_dia_total ? p(r.mejor_dia_total) : 'Sin ventas'}
              </p>
            </div>
          </div>
          {texto && (
            <a
              href={enlaceWhatsapp(config.data?.whatsapp_dueno, texto)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 presionable items-center justify-center gap-2 self-start rounded-xl bg-marca px-5 font-semibold text-sobre-marca shadow-tarjeta hover:bg-marca-hover"
            >
              <MessageCircle className="size-5" aria-hidden="true" /> Mandar resumen por WhatsApp
            </a>
          )}
        </>
      )}
    </Tarjeta>
  )
}
