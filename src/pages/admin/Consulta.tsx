import { useState } from 'react'
import { ListaSalidas } from '../../components/caja/ListaSalidas'
import { ListaTickets } from '../../components/caja/ListaTickets'
import { Planilla } from '../../components/caja/Planilla'
import { ExportarMes } from '../../components/ExportarMes'
import { Diferencia, ResumenDia } from '../../components/caja/ResumenDia'
import { TablaDatos } from '../../components/graficos/Piezas'
import { Indicador, Variacion } from '../../components/graficos/Piezas'
import { Boton } from '../../components/ui/Boton'
import { Cargando, MensajeError, Tarjeta, Titulo, Vacio } from '../../components/ui/Estados'
import { Segmentado } from '../../components/ui/Segmentado'
import {
  useJornadaPorFecha,
  usePlanillaJornada,
  useProductos,
  useReabrirDia,
  useResumenJornada,
  useSalidasDeJornada,
  useVentasDeJornada,
} from '../../datos/caja'
import { useFacturacionPorDia, usePlanillaPeriodo, useResumenPeriodo } from '../../datos/reportes'
import { variacion } from '../../lib/caja'
import { mensajeDeError } from '../../lib/errores'
import { fechaDeTrabajo, formatearCantidad, formatearHora, formatearPesos } from '../../lib/formato'
import {
  diaSemanaCorto,
  hastaHoy,
  moverPeriodo,
  periodo,
  type TipoPeriodo,
} from '../../lib/periodos'

export default function Consulta() {
  const hoy = fechaDeTrabajo(new Date())
  const [tipo, setTipo] = useState<TipoPeriodo>('dia')
  const [fecha, setFecha] = useState(hoy)
  const per = periodo(tipo, fecha)

  const atajo = (t: TipoPeriodo, f: string) => {
    setTipo(t)
    setFecha(f)
  }

  return (
    <div className="flex flex-col gap-4">
      <Titulo>Consulta</Titulo>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Accesos rápidos">
        {[
          { t: 'dia' as const, f: hoy, texto: 'Hoy' },
          { t: 'dia' as const, f: moverPeriodo('dia', hoy, -1), texto: 'Ayer' },
          { t: 'semana' as const, f: hoy, texto: 'Esta semana' },
          { t: 'mes' as const, f: hoy, texto: 'Este mes' },
        ].map((a) => (
          <Boton
            key={a.texto}
            variante="secundario"
            className="min-h-11 px-4"
            onClick={() => atajo(a.t, a.f)}
          >
            {a.texto}
          </Boton>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmentado
          etiqueta="Ver por"
          valor={tipo}
          onCambio={setTipo}
          opciones={[
            { valor: 'dia', texto: 'Día' },
            { valor: 'semana', texto: 'Semana' },
            { valor: 'mes', texto: 'Mes' },
          ]}
        />
        <div className="flex items-center gap-1">
          <Boton
            variante="secundario"
            className="min-h-11 px-3"
            aria-label="Período anterior"
            onClick={() => setFecha((f) => moverPeriodo(tipo, f, -1))}
          >
            ←
          </Boton>
          <label className="sr-only" htmlFor="fecha-consulta">
            Fecha
          </label>
          <input
            id="fecha-consulta"
            type="date"
            value={fecha}
            max={hoy}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="min-h-11 rounded-xl border border-borde bg-superficie px-2 shadow-tarjeta"
          />
          <Boton
            variante="secundario"
            className="min-h-11 px-3"
            aria-label="Período siguiente"
            disabled={per.hasta >= hoy}
            onClick={() => setFecha((f) => moverPeriodo(tipo, f, 1))}
          >
            →
          </Boton>
        </div>
      </div>
      <h2 className="text-xl font-semibold first-letter:uppercase">{per.titulo}</h2>
      {tipo === 'dia' ? (
        <ConsultaDia fecha={fecha} />
      ) : (
        <ConsultaPeriodo tipo={tipo} fecha={fecha} />
      )}
    </div>
  )
}

function ConsultaDia({ fecha }: { fecha: string }) {
  const jornada = useJornadaPorFecha(fecha)
  const resumen = useResumenJornada(jornada.data?.id)
  const ventas = useVentasDeJornada(jornada.data?.id)
  const planilla = usePlanillaJornada(jornada.data?.id)
  const productos = useProductos()
  const salidas = useSalidasDeJornada(jornada.data?.id)
  const reabrir = useReabrirDia()
  const [confirmar, setConfirmar] = useState(false)

  if (jornada.isPending) return <Cargando />
  if (jornada.isError) return <MensajeError>{mensajeDeError(jornada.error)}</MensajeError>
  if (!jornada.data)
    return (
      <Vacio titulo="No hubo caja ese día">El local estuvo cerrado o no se abrió el día.</Vacio>
    )
  const j = jornada.data

  return (
    <div className="flex flex-col gap-6">
      {planilla.data && <Planilla filas={planilla.data} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <Tarjeta className="flex flex-col gap-4 self-start">
          <p className="text-sm">
            {j.estado === 'abierta' ? (
              <span className="font-semibold text-ok">● Día abierto</span>
            ) : (
              <span className="text-suave">
                Cerrado a las {j.cerrada_en ? formatearHora(new Date(j.cerrada_en)) : '—'}
              </span>
            )}
          </p>
          {resumen.data ? <ResumenDia resumen={resumen.data} /> : <Cargando />}
          {j.nota_cierre && (
            <p className="rounded-xl bg-hundida px-3 py-2 text-sm">
              Nota del cierre: {j.nota_cierre}
            </p>
          )}
          {j.estado === 'cerrada' &&
            (confirmar ? (
              <div className="flex flex-col gap-3 rounded-xl bg-hundida p-3">
                <p className="font-semibold">
                  ¿Reabrir este día? Queda registrado en la auditoría y se va a poder modificar.
                </p>
                {reabrir.isError && (
                  <p className="font-semibold text-alerta-texto">{mensajeDeError(reabrir.error)}</p>
                )}
                <div className="flex gap-2">
                  <Boton variante="secundario" onClick={() => setConfirmar(false)}>
                    No
                  </Boton>
                  <Boton
                    cargando={reabrir.isPending}
                    onClick={() => reabrir.mutate(j.id, { onSuccess: () => setConfirmar(false) })}
                  >
                    Sí, reabrir
                  </Boton>
                </div>
              </div>
            ) : (
              <Boton variante="secundario" onClick={() => setConfirmar(true)}>
                Reabrir el día
              </Boton>
            ))}
        </Tarjeta>
        <div className="flex min-w-0 flex-col gap-4 self-start">
          <Tarjeta sinRelleno>
            {ventas.data && productos.data ? (
              <ListaTickets
                ventas={ventas.data}
                productos={productos.data}
                editable={j.estado === 'abierta'}
                limite={25}
                titulo="Ventas del día"
              />
            ) : (
              <Cargando />
            )}
          </Tarjeta>
          {salidas.data && salidas.data.length > 0 && (
            <Tarjeta sinRelleno>
              <ListaSalidas salidas={salidas.data} editable={j.estado === 'abierta'} />
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  )
}

function ConsultaPeriodo({ tipo, fecha }: { tipo: 'semana' | 'mes'; fecha: string }) {
  const per = hastaHoy(periodo(tipo, fecha), fechaDeTrabajo(new Date()))
  const actual = useResumenPeriodo(per)
  const anterior = useResumenPeriodo(per.anterior)
  const dias = useFacturacionPorDia(per)
  const planilla = usePlanillaPeriodo(per)
  const base = tipo === 'semana' ? 'la semana anterior' : 'el mes anterior'
  const contra = per.recortado ? `los mismos días de ${base}` : base
  const p = (n: number) => formatearPesos(n, { sinCentavos: true })

  if (actual.isPending) return <Cargando />
  if (actual.isError) return <MensajeError>{mensajeDeError(actual.error)}</MensajeError>
  const a = actual.data
  const b = anterior.data
  if (!a || a.dias_trabajados === 0) return <Vacio titulo="No hubo caja en este período" />
  const v = (x: number, y: number | undefined) => (y === undefined ? null : variacion(x, y))

  return (
    <div className="flex flex-col gap-4">
      {tipo === 'mes' && <ExportarMes fecha={fecha} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          etiqueta="Facturación"
          valor={p(a.total)}
          detalle={<Variacion valor={v(a.total, b?.total)} contra={contra} />}
        />
        <Indicador
          etiqueta="Cantidad de ventas"
          valor={a.cantidad_tickets}
          detalle={<Variacion valor={v(a.cantidad_tickets, b?.cantidad_tickets)} contra={contra} />}
        />
        <Indicador
          etiqueta="Ticket promedio"
          valor={p(a.ticket_promedio)}
          detalle={<Variacion valor={v(a.ticket_promedio, b?.ticket_promedio)} contra={contra} />}
        />
        <Indicador
          etiqueta="Promedio por día"
          valor={p(a.promedio_diario)}
          detalle={<Variacion valor={v(a.promedio_diario, b?.promedio_diario)} contra={contra} />}
        />
        <Indicador
          etiqueta="Efectivo"
          valor={p(a.total_efectivo)}
          detalle={<Variacion valor={v(a.total_efectivo, b?.total_efectivo)} contra={contra} />}
        />
        <Indicador
          etiqueta="Mercado Pago"
          valor={p(a.total_mercadopago)}
          detalle={
            <Variacion valor={v(a.total_mercadopago, b?.total_mercadopago)} contra={contra} />
          }
        />
        <Indicador
          etiqueta="Kilos vendidos"
          valor={formatearCantidad(Math.round(a.kilos * 10) / 10)}
          detalle={<Variacion valor={v(a.kilos, b?.kilos)} contra={contra} />}
        />
        <Indicador
          etiqueta="Diferencia de caja acumulada"
          valor={<Diferencia monto={a.diferencia_caja} />}
        />
      </div>
      {planilla.data && (
        <Planilla
          filas={planilla.data}
          titulo={`Planilla ${tipo === 'semana' ? 'de la semana' : 'del mes'}`}
        />
      )}
      <Tarjeta>
        <h3 className="mb-2 font-bold">Día por día</h3>
        <TablaDatos
          columnas={['Día', 'Efectivo', 'Mercado Pago', 'Total', 'Kilos', 'Ventas']}
          filas={(dias.data ?? []).map((d) =>
            d.trabajado
              ? [
                  diaSemanaCorto(d.fecha),
                  p(d.total_efectivo),
                  p(d.total_mercadopago),
                  p(d.total),
                  formatearCantidad(d.kilos),
                  d.cantidad_tickets,
                ]
              : [diaSemanaCorto(d.fecha), 'Cerrado', '', '', '', ''],
          )}
        />
      </Tarjeta>
    </div>
  )
}
