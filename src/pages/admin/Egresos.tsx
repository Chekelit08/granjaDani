import { zodResolver } from '@hookform/resolvers/zod'
import { format, startOfMonth } from 'date-fns'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { GraficoEgresosCategoria } from '../../components/graficos/Graficos'
import { Boton } from '../../components/ui/Boton'
import { Campo, Selector } from '../../components/ui/Campo'
import {
  Cargando,
  EtiquetaMedio,
  MensajeError,
  Tarjeta,
  Titulo,
  Vacio,
} from '../../components/ui/Estados'
import { Segmentado } from '../../components/ui/Segmentado'
import {
  useAnularEgreso,
  useCategorias,
  useCrearEgreso,
  useEgresos,
  useGuardarCategoria,
  useProveedores,
  type FiltroEgresos,
} from '../../datos/admin'
import { useEgresosPorCategoria } from '../../datos/reportes'
import { mensajeDeError } from '../../lib/errores'
import { fechaDeTrabajo, formatearPesos } from '../../lib/formato'
import { fechaLarga, leerFecha } from '../../lib/periodos'
import { esquemaMonto } from '../../lib/validacion'

const esquema = z.object({
  fecha: z.string().min(1, 'Elegí la fecha'),
  categoria_id: z.string().min(1, 'Elegí una categoría'),
  descripcion: z.string().trim().min(2, 'Escribí qué se pagó').max(200),
  proveedor: z.string().trim().max(80),
  monto: esquemaMonto,
  medio_pago: z.enum(['efectivo', 'mercadopago'], {
    error: 'Elegí si se pagó en efectivo o con Mercado Pago',
  }),
})
type Entrada = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

export default function Egresos() {
  const hoy = fechaDeTrabajo(new Date())
  const [filtro, setFiltro] = useState<FiltroEgresos>({
    desde: format(startOfMonth(leerFecha(hoy)), 'yyyy-MM-dd'),
    hasta: hoy,
    categoriaId: '',
    proveedor: '',
  })

  return (
    <div className="flex flex-col gap-6">
      <Titulo>Egresos</Titulo>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="flex flex-col gap-6">
          <FormularioEgreso hoy={hoy} />
          <Categorias />
        </div>
        <Listado filtro={filtro} setFiltro={setFiltro} />
      </div>
    </div>
  )
}

function FormularioEgreso({ hoy }: { hoy: string }) {
  const categorias = useCategorias()
  const proveedores = useProveedores()
  const crear = useCrearEgreso()
  const [guardado, setGuardado] = useState<string | null>(null)
  const { register, handleSubmit, control, reset, formState } = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoy, categoria_id: '', descripcion: '', proveedor: '', monto: '' },
  })

  const guardar = handleSubmit((d) => {
    setGuardado(null)
    crear.mutate(
      { ...d, proveedor: d.proveedor || null },
      {
        onSuccess: () => {
          setGuardado(`Egreso guardado: ${d.descripcion} ${formatearPesos(d.monto)}`)
          reset({ fecha: d.fecha, categoria_id: '', descripcion: '', proveedor: '', monto: '' })
        },
      },
    )
  })

  return (
    <Tarjeta>
      <h2 className="mb-3 font-semibold">Cargar un egreso</h2>
      <form onSubmit={guardar} noValidate className="flex flex-col gap-3">
        <Campo
          etiqueta="Fecha"
          type="date"
          max={hoy}
          error={formState.errors.fecha?.message}
          {...register('fecha')}
        />
        <Selector
          etiqueta="Categoría"
          error={formState.errors.categoria_id?.message}
          {...register('categoria_id')}
        >
          <option value="">Elegí…</option>
          {(categorias.data ?? [])
            .filter((c) => c.activa)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
        </Selector>
        <Campo
          etiqueta="Qué se pagó"
          placeholder="Ej.: pollo y menudencias"
          error={formState.errors.descripcion?.message}
          {...register('descripcion')}
        />
        <Campo
          etiqueta="Proveedor (opcional)"
          list="proveedores"
          autoComplete="off"
          error={formState.errors.proveedor?.message}
          {...register('proveedor')}
        />
        <datalist id="proveedores">
          {(proveedores.data ?? []).map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Campo
          etiqueta="Monto"
          inputMode="decimal"
          placeholder="Ej.: 150000"
          error={formState.errors.monto?.message}
          {...register('monto')}
        />
        <Controller
          control={control}
          name="medio_pago"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Cómo se pagó</span>
              <Segmentado
                etiqueta="Cómo se pagó"
                valor={field.value ?? null}
                onCambio={field.onChange}
                opciones={[
                  { valor: 'efectivo', texto: 'Efectivo' },
                  { valor: 'mercadopago', texto: 'Mercado Pago' },
                ]}
              />
              {fieldState.error && (
                <p className="text-sm font-semibold text-alerta-texto">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        {crear.isError && <MensajeError>{mensajeDeError(crear.error)}</MensajeError>}
        {guardado && (
          <p role="status" className="font-semibold text-ok">
            ✓ {guardado}
          </p>
        )}
        <Boton type="submit" cargando={crear.isPending}>
          Guardar egreso
        </Boton>
      </form>
    </Tarjeta>
  )
}

function Categorias() {
  const categorias = useCategorias()
  const guardar = useGuardarCategoria()
  const [nueva, setNueva] = useState('')
  return (
    <Tarjeta>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Categorías</summary>
        <ul className="mt-2 divide-y divide-borde">
          {(categorias.data ?? []).map((c) => (
            <li key={c.id} className="flex min-h-11 items-center justify-between gap-2">
              <span className={c.activa ? '' : 'text-suave line-through'}>{c.nombre}</span>
              <button
                type="button"
                className="min-h-11 px-2 text-sm font-semibold text-suave underline-offset-4 hover:underline"
                onClick={() => guardar.mutate({ id: c.id, nombre: c.nombre, activa: !c.activa })}
              >
                {c.activa ? 'Ocultar' : 'Volver a usar'}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (nueva.trim().length >= 2)
              guardar.mutate(
                { nombre: nueva.trim(), activa: true },
                { onSuccess: () => setNueva('') },
              )
          }}
        >
          <div className="flex-1">
            <Campo
              etiqueta="Nueva categoría"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              maxLength={40}
            />
          </div>
          <Boton
            type="submit"
            variante="secundario"
            disabled={nueva.trim().length < 2}
            cargando={guardar.isPending}
          >
            Agregar
          </Boton>
        </form>
        {guardar.isError && (
          <p className="mt-2 text-sm font-semibold text-alerta-texto">
            {mensajeDeError(guardar.error)}
          </p>
        )}
      </details>
    </Tarjeta>
  )
}

function Listado({
  filtro,
  setFiltro,
}: {
  filtro: FiltroEgresos
  setFiltro: (f: FiltroEgresos) => void
}) {
  const egresos = useEgresos(filtro)
  const categorias = useCategorias()
  const porCategoria = useEgresosPorCategoria(filtro)
  const [verAnulados, setVerAnulados] = useState(false)
  const [anulando, setAnulando] = useState<string | null>(null)

  const filas = (egresos.data ?? []).filter((e) => verAnulados || !e.anulado)
  const total = (egresos.data ?? []).filter((e) => !e.anulado).reduce((s, e) => s + e.monto, 0)

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta className="flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Desde"
          type="date"
          value={filtro.desde}
          max={filtro.hasta}
          onChange={(e) => e.target.value && setFiltro({ ...filtro, desde: e.target.value })}
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={filtro.hasta}
          min={filtro.desde}
          onChange={(e) => e.target.value && setFiltro({ ...filtro, hasta: e.target.value })}
        />
        <Selector
          etiqueta="Categoría"
          value={filtro.categoriaId}
          onChange={(e) => setFiltro({ ...filtro, categoriaId: e.target.value })}
        >
          <option value="">Todas</option>
          {(categorias.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
        <Campo
          etiqueta="Proveedor"
          value={filtro.proveedor}
          placeholder="Buscar…"
          onChange={(e) => setFiltro({ ...filtro, proveedor: e.target.value })}
        />
      </Tarjeta>

      <p className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-suave">Total del período (sin anulados)</span>
        <span className="text-3xl font-semibold">{formatearPesos(total)}</span>
      </p>

      {!filtro.categoriaId && !filtro.proveedor && (
        <GraficoEgresosCategoria
          datos={porCategoria.data ?? []}
          cargando={porCategoria.isFetching}
        />
      )}

      {egresos.isError && <MensajeError>{mensajeDeError(egresos.error)}</MensajeError>}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Egresos</h2>
        <label className="flex min-h-11 items-center gap-2 text-sm text-suave">
          <input
            type="checkbox"
            className="size-5"
            checked={verAnulados}
            onChange={(e) => setVerAnulados(e.target.checked)}
          />
          Ver anulados
        </label>
      </div>
      {egresos.isPending ? (
        <Cargando />
      ) : filas.length === 0 ? (
        <Vacio titulo="No hay egresos en este período">Cargá el primero con el formulario.</Vacio>
      ) : (
        <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta">
          {filas.map((e) => (
            <li key={e.id} className={`px-4 py-3 ${e.anulado ? 'text-suave' : ''}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className={`font-semibold ${e.anulado ? 'line-through' : ''}`}>
                    {e.descripcion}
                  </p>
                  <p className="text-sm text-suave">
                    {fechaLarga(e.fecha)} · {e.categoria?.nombre}
                    {e.proveedor ? ` · ${e.proveedor}` : ''} ·{' '}
                    <EtiquetaMedio medio={e.medio_pago} />
                  </p>
                  {e.anulado && <p className="text-sm">Anulado: {e.motivo_anulacion}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-semibold cifras ${e.anulado ? 'line-through' : ''}`}
                  >
                    {formatearPesos(e.monto)}
                  </span>
                  {!e.anulado && e.salida_caja_id && (
                    <span className="text-xs text-suave">Se anula desde la caja</span>
                  )}
                  {!e.anulado && !e.salida_caja_id && anulando !== e.id && (
                    <button
                      type="button"
                      onClick={() => setAnulando(e.id)}
                      className="min-h-11 px-2 text-sm font-semibold text-alerta-texto underline-offset-4 hover:underline"
                    >
                      Anular
                    </button>
                  )}
                </div>
              </div>
              {anulando === e.id && <AnularEgreso id={e.id} alTerminar={() => setAnulando(null)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AnularEgreso({ id, alTerminar }: { id: string; alTerminar: () => void }) {
  const anular = useAnularEgreso()
  const [motivo, setMotivo] = useState('')
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl bg-hundida p-3">
      <Campo
        etiqueta="Motivo de la anulación"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej.: cargado dos veces"
        maxLength={200}
      />
      {anular.isError && (
        <p className="font-semibold text-alerta-texto">{mensajeDeError(anular.error)}</p>
      )}
      <div className="flex gap-2">
        <Boton variante="secundario" onClick={alTerminar}>
          No anular
        </Boton>
        <Boton
          variante="peligro"
          disabled={motivo.trim().length < 3}
          cargando={anular.isPending}
          onClick={() => anular.mutate({ id, motivo: motivo.trim() }, { onSuccess: alTerminar })}
        >
          Anular egreso
        </Boton>
      </div>
    </div>
  )
}
