import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/tipos-db'
import { exigir } from './caja'

type Tablas = Database['public']['Tables']
export type Categoria = Tablas['categorias_egreso']['Row']
export type Egreso = Tablas['egresos']['Row']
export type NuevoEgreso = Tablas['egresos']['Insert']
export type Producto = Tablas['productos']['Row']
export type Perfil = Tablas['perfiles']['Row']
export type RegistroAuditoria = Tablas['auditoria']['Row']
export type Unidad = Database['public']['Enums']['unidad_producto']
export type Rol = Database['public']['Enums']['rol_usuario']
export type Configuracion = Tablas['configuracion']['Row']

function useInvalidar(...claves: string[][]) {
  const qc = useQueryClient()
  return () => {
    for (const clave of [...claves, ['reportes'], ['auditoria']])
      void qc.invalidateQueries({ queryKey: clave })
  }
}

// ---------------------------------------------------------------------------
// Egresos y categorías
// ---------------------------------------------------------------------------
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () =>
      exigir(await supabase().from('categorias_egreso').select('*').order('nombre')),
  })
}

export function useGuardarCategoria() {
  const invalidar = useInvalidar(['categorias'])
  return useMutation({
    mutationFn: async (c: { id?: string; nombre: string; activa: boolean }) =>
      c.id
        ? exigir(
            await supabase()
              .from('categorias_egreso')
              .update({ nombre: c.nombre, activa: c.activa })
              .eq('id', c.id)
              .select()
              .single(),
          )
        : exigir(
            await supabase()
              .from('categorias_egreso')
              .insert({ nombre: c.nombre })
              .select()
              .single(),
          ),
    onSuccess: invalidar,
  })
}

export interface FiltroEgresos {
  desde: string
  hasta: string
  categoriaId: string
  proveedor: string
}

export function useEgresos(f: FiltroEgresos) {
  return useQuery({
    queryKey: ['egresos', f],
    queryFn: async () => {
      let consulta = supabase()
        .from('egresos')
        .select('*, categoria:categorias_egreso(nombre)')
        .gte('fecha', f.desde)
        .lte('fecha', f.hasta)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (f.categoriaId) consulta = consulta.eq('categoria_id', f.categoriaId)
      if (f.proveedor.trim()) consulta = consulta.ilike('proveedor', `%${f.proveedor.trim()}%`)
      return exigir(await consulta)
    },
  })
}

export function useProveedores() {
  return useQuery({
    queryKey: ['egresos', 'proveedores'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const filas = exigir(
        await supabase()
          .from('egresos')
          .select('proveedor')
          .not('proveedor', 'is', null)
          .order('fecha', { ascending: false })
          .limit(300),
      )
      return [...new Set(filas.map((f) => f.proveedor).filter((p): p is string => Boolean(p)))]
    },
  })
}

export function useCrearEgreso() {
  const invalidar = useInvalidar(['egresos'])
  return useMutation({
    mutationFn: async (e: NuevoEgreso) =>
      exigir(await supabase().from('egresos').insert(e).select().single()),
    onSuccess: invalidar,
  })
}

export function useAnularEgreso() {
  const invalidar = useInvalidar(['egresos'])
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) =>
      exigir(
        await supabase()
          .from('egresos')
          .update({ anulado: true, motivo_anulacion: motivo })
          .eq('id', id)
          .select()
          .single(),
      ),
    onSuccess: invalidar,
  })
}

// ---------------------------------------------------------------------------
// Productos y precios (la caja los lee con useProductos de datos/caja)
// ---------------------------------------------------------------------------
export function useGuardarProducto() {
  const invalidar = useInvalidar(['productos'], ['planilla'])
  return useMutation({
    mutationFn: async (
      x: Pick<Producto, 'nombre' | 'unidad' | 'precio' | 'orden'> & {
        id?: string
        activo?: boolean
      },
    ) =>
      x.id
        ? exigir(
            await supabase()
              .from('productos')
              .update({
                nombre: x.nombre.trim(),
                unidad: x.unidad,
                precio: x.precio,
                orden: x.orden,
                activo: x.activo,
              })
              .eq('id', x.id)
              .select()
              .single(),
          )
        : exigir(
            await supabase()
              .from('productos')
              .insert({
                nombre: x.nombre.trim(),
                unidad: x.unidad,
                precio: x.precio,
                orden: x.orden,
              })
              .select()
              .single(),
          ),
    onSuccess: invalidar,
  })
}

/** Cambia el orden de dos productos (subir/bajar en la planilla). */
export function useIntercambiarOrden() {
  const invalidar = useInvalidar(['productos'], ['planilla'])
  return useMutation({
    mutationFn: async ([a, b]: [Producto, Producto]) => {
      const r1 = await supabase().from('productos').update({ orden: b.orden }).eq('id', a.id)
      if (r1.error) throw r1.error
      const r2 = await supabase().from('productos').update({ orden: a.orden }).eq('id', b.id)
      if (r2.error) throw r2.error
    },
    onSuccess: invalidar,
  })
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
export function usePerfiles() {
  return useQuery({
    queryKey: ['perfiles'],
    queryFn: async () =>
      exigir(
        await supabase()
          .from('perfiles')
          .select('*')
          .order('activo', { ascending: false })
          .order('nombre'),
      ),
  })
}

export function useActualizarPerfil() {
  const invalidar = useInvalidar(['perfiles'])
  return useMutation({
    mutationFn: async (p: { id: string; rol?: Rol; activo?: boolean; nombre?: string }) => {
      const { id, ...cambios } = p
      const perfil = exigir(
        await supabase().from('perfiles').update(cambios).eq('id', id).select().single(),
      )
      if (cambios.activo !== undefined)
        await llamarUsuarios({ accion: 'bloquear', usuario_id: id, bloqueado: !cambios.activo })
      return perfil
    },
    onSuccess: invalidar,
  })
}

type AccionUsuarios =
  | {
      accion: 'crear'
      email: string
      nombre: string
      rol: Rol
      clave: string
      pedir_cambio: boolean
    }
  | { accion: 'restablecer_clave'; usuario_id: string; clave: string; pedir_cambio: boolean }
  | { accion: 'bloquear'; usuario_id: string; bloqueado: boolean }

/** Llama a la Edge Function `usuarios`. Los errores vienen ya escritos para mostrar. */
export function llamarUsuarios(cuerpo: AccionUsuarios): Promise<unknown> {
  return llamarFuncion('usuarios', cuerpo)
}

async function llamarFuncion(nombre: string, cuerpo: object): Promise<unknown> {
  const { data, error } = await supabase().functions.invoke(nombre, { body: cuerpo })
  if (error) {
    const contexto = (error as { context?: Response }).context
    let mensaje = 'No pudimos completar la acción. Probá de nuevo.'
    try {
      const json = (await contexto?.json()) as { error?: string } | undefined
      if (json?.error) mensaje = json.error
    } catch {
      // respuesta sin JSON
    }
    throw Object.assign(new Error(mensaje), { code: 'P0001' })
  }
  return data
}

export function useCrearUsuario() {
  const invalidar = useInvalidar(['perfiles'])
  return useMutation({
    mutationFn: (u: {
      email: string
      nombre: string
      rol: Rol
      clave: string
      pedir_cambio: boolean
    }) => llamarUsuarios({ accion: 'crear', ...u }),
    onSuccess: invalidar,
  })
}

export function useRestablecerClave() {
  const invalidar = useInvalidar(['perfiles'])
  return useMutation({
    mutationFn: (u: { usuario_id: string; clave: string; pedir_cambio: boolean }) =>
      llamarUsuarios({ accion: 'restablecer_clave', ...u }),
    onSuccess: invalidar,
  })
}

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------
export function useAuditoria(accion: string, limite: number) {
  return useQuery({
    queryKey: ['auditoria', accion, limite],
    queryFn: async () => {
      let consulta = supabase()
        .from('auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)
      if (accion) consulta = consulta.eq('accion', accion)
      return exigir(await consulta)
    },
  })
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export function useActualizarConfiguracion() {
  const invalidar = useInvalidar(['configuracion'])
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Configuracion> & { id: string }) =>
      exigir(await supabase().from('configuracion').update(cambios).eq('id', id).select().single()),
    onSuccess: invalidar,
  })
}
