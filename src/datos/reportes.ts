import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Rango } from '../lib/periodos'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/tipos-db'
import { exigir } from './caja'

type Funciones = Database['public']['Functions']
export type ResumenPeriodo = Funciones['resumen_periodo']['Returns'][number]
export type FacturacionDia = Funciones['facturacion_por_dia']['Returns'][number]
export type FacturacionAgrupada = Funciones['facturacion_agrupada']['Returns'][number]
export type VentasDiaSemana = Funciones['ventas_por_dia_semana']['Returns'][number]
export type IngresosEgresosMes = Funciones['ingresos_egresos_mensual']['Returns'][number]
export type EgresosCategoria = Funciones['egresos_por_categoria']['Returns'][number]
export type FilaPlanillaPeriodo = Funciones['planilla_periodo']['Returns'][number]
export type VentasPorHora = Funciones['ventas_por_hora']['Returns'][number]
export type HoyContraSemanaPasada = Funciones['hoy_contra_semana_pasada']['Returns'][number]

const opciones = { placeholderData: keepPreviousData, staleTime: 60_000 }

export function useResumenPeriodo(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'resumen', rango.desde, rango.hasta],
    queryFn: async () => {
      const filas = exigir(
        await supabase().rpc('resumen_periodo', { p_desde: rango.desde, p_hasta: rango.hasta }),
      )
      return filas[0] ?? null
    },
  })
}

export function useFacturacionPorDia(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'por-dia', rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('facturacion_por_dia', { p_desde: rango.desde, p_hasta: rango.hasta }),
      ),
  })
}

export function useFacturacionAgrupada(rango: Rango, unidad: 'week' | 'month') {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'agrupada', unidad, rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('facturacion_agrupada', {
          p_desde: rango.desde,
          p_hasta: rango.hasta,
          p_unidad: unidad,
        }),
      ),
  })
}

export function useVentasPorDiaSemana(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'dia-semana', rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('ventas_por_dia_semana', {
          p_desde: rango.desde,
          p_hasta: rango.hasta,
        }),
      ),
  })
}

export function useIngresosEgresos(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'ingresos-egresos', rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('ingresos_egresos_mensual', {
          p_desde: rango.desde,
          p_hasta: rango.hasta,
        }),
      ),
  })
}

export function useEgresosPorCategoria(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'egresos-categoria', rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('egresos_por_categoria', {
          p_desde: rango.desde,
          p_hasta: rango.hasta,
        }),
      ),
  })
}

/** La planilla (KG · $ · EFE · MP por producto) de un período. */
export function usePlanillaPeriodo(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'planilla', rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('planilla_periodo', { p_desde: rango.desde, p_hasta: rango.hasta }),
      ),
  })
}

export function useVentasPorHora(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'por-hora', rango.desde, rango.hasta],
    queryFn: async () =>
      exigir(
        await supabase().rpc('ventas_por_hora', { p_desde: rango.desde, p_hasta: rango.hasta }),
      ),
  })
}

/** Hoy contra el mismo día de la semana pasada a la misma hora. Se refresca cada minuto. */
export function useHoyContraSemanaPasada() {
  return useQuery({
    queryKey: ['reportes', 'hoy-vs-semana-pasada'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const filas = exigir(await supabase().rpc('hoy_contra_semana_pasada'))
      return filas[0] ?? null
    },
  })
}

/** Suma de egresos no anulados en un rango (para el resumen semanal). */
export function useTotalEgresos(rango: Rango) {
  return useQuery({
    ...opciones,
    queryKey: ['reportes', 'total-egresos', rango.desde, rango.hasta],
    queryFn: async () => {
      const filas = exigir(
        await supabase()
          .from('egresos')
          .select('monto')
          .gte('fecha', rango.desde)
          .lte('fecha', rango.hasta)
          .eq('anulado', false),
      )
      return filas.reduce((suma, e) => suma + e.monto, 0)
    },
  })
}
