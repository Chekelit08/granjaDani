import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Boton } from '../../components/ui/Boton'
import { Campo, Selector } from '../../components/ui/Campo'
import { Cargando, Chip, MensajeError, Tarjeta, Titulo, Vacio } from '../../components/ui/Estados'
import {
  useGuardarProducto,
  useIntercambiarOrden,
  type Producto,
  type Unidad,
} from '../../datos/admin'
import { useProductos } from '../../datos/caja'
import { mensajeDeError } from '../../lib/errores'
import { formatearPesos } from '../../lib/formato'
import { textoAMonto } from '../../lib/validacion'

const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })

/** Productos de la planilla y sus precios. Son las columnas de la hoja del día. */
export default function Productos() {
  const productos = useProductos()
  const [editando, setEditando] = useState<Producto | 'nuevo' | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <Titulo
        subtitulo="Lo que se vende en el mostrador. Con precio, la caja calcula el importe de los kilos sola."
        accion={
          editando === null && (
            <Boton onClick={() => setEditando('nuevo')}>
              <Plus className="size-4" aria-hidden="true" /> Agregar producto
            </Boton>
          )
        }
      >
        Productos y precios
      </Titulo>

      {editando !== null && (
        <FormularioProducto
          producto={editando === 'nuevo' ? null : editando}
          ordenNuevo={(productos.data?.at(-1)?.orden ?? 0) + 10}
          alTerminar={() => setEditando(null)}
        />
      )}

      {productos.isPending ? (
        <Cargando />
      ) : productos.isError ? (
        <MensajeError>{mensajeDeError(productos.error)}</MensajeError>
      ) : productos.data.length === 0 ? (
        <Vacio titulo="Todavía no hay productos">Agregá el primero con el botón de arriba.</Vacio>
      ) : (
        <ListaProductos productos={productos.data} alEditar={setEditando} />
      )}
    </div>
  )
}

function ListaProductos({
  productos,
  alEditar,
}: {
  productos: Producto[]
  alEditar: (x: Producto) => void
}) {
  const intercambiar = useIntercambiarOrden()
  return (
    <Tarjeta sinRelleno>
      {intercambiar.isError && (
        <div className="p-4">
          <MensajeError>{mensajeDeError(intercambiar.error)}</MensajeError>
        </div>
      )}
      <ul className="divide-y divide-borde">
        {productos.map((x, i) => {
          const anterior = productos[i - 1]
          const siguiente = productos[i + 1]
          return (
            <li key={x.id} className="flex min-h-16 items-center gap-3 px-4 py-2 sm:px-5">
              <span className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Subir ${x.nombre}`}
                  disabled={!anterior || intercambiar.isPending}
                  onClick={() => anterior && intercambiar.mutate([x, anterior])}
                  className="grid size-7 place-items-center rounded-md text-suave hover:bg-hundida disabled:opacity-30"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${x.nombre}`}
                  disabled={!siguiente || intercambiar.isPending}
                  onClick={() => siguiente && intercambiar.mutate([x, siguiente])}
                  className="grid size-7 place-items-center rounded-md text-suave hover:bg-hundida disabled:opacity-30"
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate font-bold ${x.activo ? '' : 'text-suave line-through'}`}
                >
                  {x.nombre}
                </span>
                <span className="text-sm text-suave">
                  Se vende por {x.unidad === 'kg' ? 'kilo' : 'unidad'}
                </span>
              </span>
              {!x.activo && <Chip>No se vende</Chip>}
              <span className="text-right font-bold cifras">
                {x.precio ? (
                  <>
                    {p(x.precio)}
                    <span className="text-sm font-medium text-suave">
                      {' '}
                      / {x.unidad === 'kg' ? 'kg' : 'u.'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-aviso">Sin precio</span>
                )}
              </span>
              <Boton variante="fantasma" tamano="chico" onClick={() => alEditar(x)}>
                <Pencil className="size-4" aria-hidden="true" /> Editar
              </Boton>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}

function FormularioProducto({
  producto,
  ordenNuevo,
  alTerminar,
}: {
  producto: Producto | null
  ordenNuevo: number
  alTerminar: () => void
}) {
  const guardar = useGuardarProducto()
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [unidad, setUnidad] = useState<Unidad>(producto?.unidad ?? 'kg')
  const [precio, setPrecio] = useState(producto?.precio ? String(producto.precio) : '')
  const [activo, setActivo] = useState(producto?.activo ?? true)

  const precioValor = precio.trim() ? textoAMonto(precio) : null
  const precioInvalido = precio.trim() !== '' && (precioValor === null || precioValor <= 0)
  const nombreInvalido = nombre.trim().length < 2

  const enviar = () =>
    guardar.mutate(
      {
        id: producto?.id,
        nombre,
        unidad,
        precio: precioValor,
        orden: producto?.orden ?? ordenNuevo,
        activo,
      },
      { onSuccess: alTerminar },
    )

  return (
    <Tarjeta titulo={producto ? `Editar ${producto.nombre}` : 'Nuevo producto'}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nombreInvalido && !precioInvalido) enviar()
        }}
      >
        <Campo
          etiqueta="Nombre"
          value={nombre}
          maxLength={40}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Suprema"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- el formulario se abre para escribir
          autoFocus
        />
        <Selector
          etiqueta="Se vende por"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value as Unidad)}
        >
          <option value="kg">Kilo</option>
          <option value="unidad">Unidad</option>
        </Selector>
        <Campo
          etiqueta={`Precio por ${unidad === 'kg' ? 'kilo' : 'unidad'} ($)`}
          inputMode="decimal"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Ej.: 9800"
          error={precioInvalido ? 'Escribí un precio mayor a $ 0, por ejemplo 9800' : undefined}
          ayuda="Opcional. Sin precio, en la caja se escribe el importe a mano."
        />
        {producto && (
          <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="size-5 accent-marca"
            />
            Se vende (aparece en la caja)
          </label>
        )}
        {guardar.isError && (
          <div className="sm:col-span-2">
            <MensajeError>{mensajeDeError(guardar.error)}</MensajeError>
          </div>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Boton
            type="submit"
            disabled={nombreInvalido || precioInvalido}
            cargando={guardar.isPending}
          >
            {producto ? 'Guardar cambios' : 'Agregar producto'}
          </Boton>
          <Boton variante="secundario" onClick={alTerminar}>
            Cancelar
          </Boton>
        </div>
        <p className="text-sm text-suave sm:col-span-2">
          Los cambios de precio quedan en la auditoría. Las ventas ya cargadas guardan el precio que
          tenían.
        </p>
      </form>
    </Tarjeta>
  )
}
