import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fechaDeTrabajo } from '../lib/formato'
import { supabase } from '../lib/supabase'
import type { MedioPago } from '../lib/caja'
import type { Database } from '../lib/tipos-db'
import { itemsParaGuardar, type LineaTicket } from '../lib/ticket'

type Tablas = Database['public']['Tables']
export type Jornada = Tablas['jornadas']['Row']
export type Venta = Tablas['ventas']['Row']
export type Salida = Tablas['salidas_caja']['Row']
export type Producto = Tablas['productos']['Row']
export type MotivoSalida = Database['public']['Enums']['motivo_salida']
export type { MedioPago } from '../lib/caja'
export type ResumenJornada = Database['public']['Functions']['resumen_jornada']['Returns'][number]
export type FilaPlanilla = Database['public']['Functions']['planilla_jornada']['Returns'][number]

/** Lanza el error de Supabase para que TanStack Query lo maneje. */
export function exigir<R extends { data: unknown; error: unknown }>(
  respuesta: R,
): NonNullable<R['data']> {
  if (respuesta.error) throw respuesta.error
  if (respuesta.data === null || respuesta.data === undefined)
    throw new Error('La base no devolvió datos.')
  return respuesta.data as NonNullable<R['data']>
}

/** Igual que exigir, pero acepta que no haya resultado (maybeSingle). */
export function exigirOpcional<R extends { data: unknown; error: unknown }>(
  respuesta: R,
): R['data'] {
  if (respuesta.error) throw respuesta.error
  return respuesta.data
}

export const claves = {
  jornadaActual: ['jornada-actual'] as const,
  jornadaPorFecha: (fecha: string) => ['jornada', fecha] as const,
  resumen: (id: string) => ['resumen-jornada', id] as const,
  ventas: (id: string) => ['ventas', id] as const,
  planilla: (id: string) => ['planilla', id] as const,
  productos: ['productos'] as const,
  salidas: (id: string) => ['salidas', id] as const,
  configuracion: ['configuracion'] as const,
}

export interface EstadoDelDia {
  hoy: string
  /** La jornada abierta, sea de hoy o de un día anterior que quedó sin cerrar. */
  abierta: Jornada | null
  /** La jornada de hoy, si existe (abierta o cerrada). */
  deHoy: Jornada | null
}

export function useEstadoDelDia() {
  return useQuery({
    queryKey: claves.jornadaActual,
    queryFn: async (): Promise<EstadoDelDia> => {
      const hoy = fechaDeTrabajo(new Date())
      const jornadas = exigir(
        await supabase()
          .from('jornadas')
          .select('*')
          .or(`estado.eq.abierta,fecha.eq.${hoy}`)
          .order('fecha', { ascending: false }),
      )
      return {
        hoy,
        abierta: jornadas.find((j) => j.estado === 'abierta') ?? null,
        deHoy: jornadas.find((j) => j.fecha === hoy) ?? null,
      }
    },
    refetchInterval: 60_000,
  })
}

export function useJornadaPorFecha(fecha: string, habilitado = true) {
  return useQuery({
    queryKey: claves.jornadaPorFecha(fecha),
    enabled: habilitado,
    queryFn: async () =>
      exigirOpcional(
        await supabase().from('jornadas').select('*').eq('fecha', fecha).maybeSingle(),
      ),
  })
}

/** En la caja abierta se refresca sola, por si cargan ventas desde otra compu o celular. */
const REFRESCO_CAJA = 20_000

export function useResumenJornada(jornadaId: string | undefined, { vivo = false } = {}) {
  return useQuery({
    queryKey: claves.resumen(jornadaId ?? ''),
    enabled: Boolean(jornadaId),
    refetchInterval: vivo ? REFRESCO_CAJA : false,
    queryFn: async () => {
      const filas = exigir(
        await supabase().rpc('resumen_jornada', { p_jornada_id: jornadaId ?? '' }),
      )
      return filas[0] ?? null
    },
  })
}

export function useVentasDeJornada(jornadaId: string | undefined, { vivo = false } = {}) {
  return useQuery({
    queryKey: claves.ventas(jornadaId ?? ''),
    enabled: Boolean(jornadaId),
    refetchInterval: vivo ? REFRESCO_CAJA : false,
    queryFn: async () =>
      exigir(
        await supabase()
          .from('ventas')
          .select('*')
          .eq('jornada_id', jornadaId ?? '')
          .order('registrada_en', { ascending: false }),
      ),
  })
}

/** La planilla del día: KG · $ · EFE · MP por producto. */
export function usePlanillaJornada(jornadaId: string | undefined, { vivo = false } = {}) {
  return useQuery({
    queryKey: claves.planilla(jornadaId ?? ''),
    enabled: Boolean(jornadaId),
    refetchInterval: vivo ? REFRESCO_CAJA : false,
    queryFn: async () =>
      exigir(await supabase().rpc('planilla_jornada', { p_jornada_id: jornadaId ?? '' })),
  })
}

/** Productos activos, en el orden de la planilla (los que se ofrecen en la caja). */
export function useProductos() {
  return useQuery({
    queryKey: claves.productos,
    staleTime: 60_000,
    queryFn: async () =>
      exigir(await supabase().from('productos').select('*').order('orden').order('nombre')),
  })
}

export function useSalidasDeJornada(jornadaId: string | undefined) {
  return useQuery({
    queryKey: claves.salidas(jornadaId ?? ''),
    enabled: Boolean(jornadaId),
    queryFn: async () =>
      exigir(
        await supabase()
          .from('salidas_caja')
          .select('*')
          .eq('jornada_id', jornadaId ?? '')
          .order('registrada_en', { ascending: false }),
      ),
  })
}

export function useConfiguracion() {
  return useQuery({
    queryKey: claves.configuracion,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      exigir(await supabase().from('configuracion').select('*').limit(1).single()),
  })
}

function useInvalidarCaja() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: claves.jornadaActual }),
      qc.invalidateQueries({ queryKey: ['jornada'] }),
      qc.invalidateQueries({ queryKey: ['resumen-jornada'] }),
      qc.invalidateQueries({ queryKey: ['ventas'] }),
      qc.invalidateQueries({ queryKey: ['planilla'] }),
      qc.invalidateQueries({ queryKey: ['salidas'] }),
      qc.invalidateQueries({ queryKey: ['reportes'] }),
    ])
}

export function useAbrirDia() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    mutationFn: async (fondoInicial: number) =>
      exigir(await supabase().rpc('abrir_jornada', { p_fondo_inicial: fondoInicial })),
    // Sin await: la pantalla responde ya; los datos se refrescan atrás.
    onSuccess: () => void invalidar(),
  })
}

export function useRegistrarTicket() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    // Sin reintentos: si no hay red, la persona tiene que saber que NO se guardó.
    retry: false,
    mutationFn: async (ticket: { lineas: LineaTicket[]; medio: MedioPago }) =>
      exigir(
        await supabase().rpc('registrar_ticket', {
          p_medio_pago: ticket.medio,
          p_items: itemsParaGuardar(ticket.lineas),
        }),
      ),
    // Sin await: la pantalla responde ya; los datos se refrescan atrás.
    onSuccess: () => void invalidar(),
  })
}

export function useAnularVenta() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) =>
      exigir(await supabase().rpc('anular_venta', { p_venta_id: id, p_motivo: motivo })),
    onSuccess: () => void invalidar(),
  })
}

export function useAnularTicket() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    mutationFn: async ({ ticketId, motivo }: { ticketId: string; motivo: string }) =>
      exigir(await supabase().rpc('anular_ticket', { p_ticket_id: ticketId, p_motivo: motivo })),
    onSuccess: () => void invalidar(),
  })
}

export function useCerrarDia() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    mutationFn: async (datos: { jornadaId: string; contado: number; nota: string }) =>
      exigir(
        await supabase().rpc('cerrar_jornada', {
          p_jornada_id: datos.jornadaId,
          p_efectivo_contado: datos.contado,
          p_nota: datos.nota,
        }),
      ),
    // Sin await: la pantalla responde ya; los datos se refrescan atrás.
    onSuccess: () => void invalidar(),
  })
}

export function useReabrirDia() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    mutationFn: async (jornadaId: string) =>
      exigir(await supabase().rpc('reabrir_jornada', { p_jornada_id: jornadaId })),
    // Sin await: la pantalla responde ya; los datos se refrescan atrás.
    onSuccess: () => void invalidar(),
  })
}

export function useRegistrarSalida() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    retry: false,
    mutationFn: async (salida: { importe: number; motivo: MotivoSalida; detalle: string }) =>
      exigir(
        await supabase().rpc('registrar_salida', {
          p_importe: salida.importe,
          p_motivo: salida.motivo,
          p_detalle: salida.detalle,
        }),
      ),
    onSuccess: () => void invalidar(),
  })
}

export function useAnularSalida() {
  const invalidar = useInvalidarCaja()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) =>
      exigir(await supabase().rpc('anular_salida', { p_salida_id: id, p_motivo: motivo })),
    onSuccess: () => void invalidar(),
  })
}
