import { format, startOfMonth, startOfYear } from 'date-fns'
import { useState } from 'react'
import {
  DistribucionMedios,
  GraficoDiasSemana,
  GraficoFacturacionAgrupada,
  GraficoFacturacionDiaria,
  GraficoHoras,
  GraficoIngresosEgresos,
  GraficoProductos,
} from '../../components/graficos/Graficos'
import { Indicador, Variacion } from '../../components/graficos/Piezas'
import { ResumenSemanal } from '../../components/ResumenSemanal'
import { MensajeError, Titulo } from '../../components/ui/Estados'
import { Segmentado } from '../../components/ui/Segmentado'
import {
  useFacturacionAgrupada,
  useFacturacionPorDia,
  useHoyContraSemanaPasada,
  useIngresosEgresos,
  usePlanillaPeriodo,
  useResumenPeriodo,
  useVentasPorDiaSemana,
  useVentasPorHora,
} from '../../datos/reportes'
import type { HoyContraSemanaPasada as HoyVs } from '../../datos/reportes'
import { variacion } from '../../lib/caja'
import { mensajeDeError } from '../../lib/errores'
import { fechaDeTrabajo, formatearPesos } from '../../lib/formato'
import {
  diaSemanaCorto,
  hastaHoy,
  leerFecha,
  periodo,
  ultimosDias,
  type Rango,
} from '../../lib/periodos'

type Rapido = '30' | '90' | 'anio' | 'otro'

function rangoRapido(r: Rapido, hoy: string): Rango {
  if (r === '30') return ultimosDias(hoy, 30)
  if (r === '90') return ultimosDias(hoy, 90)
  return { desde: format(startOfYear(leerFecha(hoy)), 'yyyy-MM-dd'), hasta: hoy }
}

export default function Panel() {
  const hoy = fechaDeTrabajo(new Date())
  const [rapido, setRapido] = useState<Rapido>('30')
  const [propio, setPropio] = useState<Rango>(ultimosDias(hoy, 30))
  const [unidad, setUnidad] = useState<'week' | 'month'>('week')
  const rango = rapido === 'otro' ? propio : rangoRapido(rapido, hoy)
  const rangoMeses = {
    desde: format(startOfMonth(leerFecha(rango.desde)), 'yyyy-MM-dd'),
    hasta: rango.hasta,
  }

  const mes = hastaHoy(periodo('mes', hoy), hoy)
  const contra = 'los mismos días del mes anterior'
  const resumenMes = useResumenPeriodo(mes)
  const resumenMesAnterior = useResumenPeriodo(mes.anterior)
  const resumenRango = useResumenPeriodo(rango)
  const porDia = useFacturacionPorDia(rango)
  const agrupada = useFacturacionAgrupada(rango, unidad)
  const diasSemana = useVentasPorDiaSemana(rango)
  const ingresosEgresos = useIngresosEgresos(rangoMeses)
  const porHora = useVentasPorHora(rango)
  const productos = usePlanillaPeriodo(rango)
  const hoyVs = useHoyContraSemanaPasada()

  const error = [
    resumenMes,
    porDia,
    agrupada,
    diasSemana,
    ingresosEgresos,
    porHora,
    productos,
  ].find((q) => q.isError)?.error
  const rm = resumenMes.data
  const rma = resumenMesAnterior.data
  const p = (n: number) => formatearPesos(n, { sinCentavos: true })

  return (
    <div className="flex flex-col gap-4">
      <Titulo>Panel</Titulo>
      {error ? <MensajeError>{mensajeDeError(error)}</MensajeError> : null}

      {hoyVs.data && <HoyContraSemanaPasada datos={hoyVs.data} />}

      <ResumenSemanal />

      <h2 className="sr-only">Este mes</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          etiqueta={`Facturación de ${mes.titulo.split(' ')[0]}`}
          valor={rm ? p(rm.total) : '…'}
          detalle={
            rm && rma ? <Variacion valor={variacion(rm.total, rma.total)} contra={contra} /> : null
          }
        />
        <Indicador
          etiqueta="Promedio por día trabajado"
          valor={rm ? p(rm.promedio_diario) : '…'}
          detalle={
            rm && rma ? (
              <Variacion
                valor={variacion(rm.promedio_diario, rma.promedio_diario)}
                contra={contra}
              />
            ) : null
          }
        />
        <Indicador
          etiqueta="Ticket promedio"
          valor={rm ? p(rm.ticket_promedio) : '…'}
          detalle={
            rm && rma ? (
              <Variacion
                valor={variacion(rm.ticket_promedio, rma.ticket_promedio)}
                contra={contra}
              />
            ) : null
          }
        />
        <Indicador
          etiqueta="Mejor día del mes"
          valor={rm?.mejor_dia ? diaSemanaCorto(rm.mejor_dia) : 'Todavía no hay'}
          detalle={
            rm?.mejor_dia_total ? (
              <span className="text-sm text-suave cifras">{p(rm.mejor_dia_total)}</span>
            ) : null
          }
        />
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <Segmentado
          etiqueta="Período de los gráficos"
          valor={rapido}
          onCambio={setRapido}
          opciones={[
            { valor: '30', texto: 'Últimos 30 días' },
            { valor: '90', texto: '90 días' },
            { valor: 'anio', texto: 'Este año' },
            { valor: 'otro', texto: 'Elegir fechas' },
          ]}
        />
        {rapido === 'otro' && (
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col text-sm font-semibold">
              Desde
              <input
                type="date"
                value={propio.desde}
                max={propio.hasta}
                onChange={(e) =>
                  e.target.value && setPropio((r) => ({ ...r, desde: e.target.value }))
                }
                className="min-h-11 rounded-xl border border-borde bg-superficie px-2 font-normal shadow-tarjeta"
              />
            </label>
            <label className="flex flex-col text-sm font-semibold">
              Hasta
              <input
                type="date"
                value={propio.hasta}
                min={propio.desde}
                max={hoy}
                onChange={(e) =>
                  e.target.value && setPropio((r) => ({ ...r, hasta: e.target.value }))
                }
                className="min-h-11 rounded-xl border border-borde bg-superficie px-2 font-normal shadow-tarjeta"
              />
            </label>
          </div>
        )}
      </div>

      <GraficoFacturacionDiaria datos={porDia.data ?? []} cargando={porDia.isFetching} />
      <GraficoProductos datos={productos.data ?? []} cargando={productos.isFetching} />
      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoFacturacionAgrupada
          datos={agrupada.data ?? []}
          unidad={unidad}
          cargando={agrupada.isFetching}
          accion={
            <Segmentado
              etiqueta="Agrupar por"
              valor={unidad}
              onCambio={setUnidad}
              opciones={[
                { valor: 'week', texto: 'Semana' },
                { valor: 'month', texto: 'Mes' },
              ]}
            />
          }
        />
        <div className="flex flex-col gap-4">
          <DistribucionMedios
            efectivo={resumenRango.data?.total_efectivo ?? 0}
            mercadopago={resumenRango.data?.total_mercadopago ?? 0}
          />
          <GraficoDiasSemana datos={diasSemana.data ?? []} cargando={diasSemana.isFetching} />
        </div>
      </div>
      <GraficoHoras datos={porHora.data ?? []} cargando={porHora.isFetching} />
      <GraficoIngresosEgresos
        datos={ingresosEgresos.data ?? []}
        cargando={ingresosEgresos.isFetching}
      />
    </div>
  )
}

/** "Hoy vas $ X; el sábado pasado a esta hora iban $ Y" — comparación justa, a la misma hora. */
function HoyContraSemanaPasada({ datos }: { datos: HoyVs }) {
  const p = (n: number) => formatearPesos(n, { sinCentavos: true })
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-xl border border-borde bg-superficie px-5 py-4 shadow-tarjeta">
      <p>
        <span className="text-sm text-suave">Hoy vas </span>
        <span className="text-2xl font-semibold tracking-tight cifras">{p(datos.hoy)}</span>
      </p>
      {datos.hubo_caja_semana_pasada ? (
        <>
          <Variacion
            valor={variacion(datos.hoy, datos.semana_pasada_a_esta_hora)}
            contra="el mismo día de la semana pasada a esta hora"
          />
          <p className="text-sm text-suave">
            Ese día a esta hora iban{' '}
            <span className="cifras">{p(datos.semana_pasada_a_esta_hora)}</span> y cerró en{' '}
            <span className="cifras">{p(datos.semana_pasada_total)}</span>.
          </p>
        </>
      ) : (
        <p className="text-sm text-suave">El mismo día de la semana pasada no hubo caja.</p>
      )}
    </div>
  )
}
