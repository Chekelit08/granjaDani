import { Banknote, CheckCircle2, ShoppingBasket, Smartphone, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  useAnularTicket,
  useConfiguracion,
  useRegistrarTicket,
  type MedioPago,
  type Producto,
} from '../../datos/caja'
import { NOMBRE_MEDIO, necesitaConfirmacion } from '../../lib/caja'
import { mensajeDeError } from '../../lib/errores'
import { formatearCantidad, formatearPesos } from '../../lib/formato'
import { accionDeTecla, type AccionTecla } from '../../lib/importe'
import {
  buscarProducto,
  faltaEnLinea,
  normalizarCantidad,
  resolverLinea,
  totalTicket,
  type LineaEnCurso,
  type LineaTicket,
  type ProductoCaja,
} from '../../lib/ticket'
import { Boton } from '../ui/Boton'
import { Aviso, Vacio } from '../ui/Estados'
import { CalculadoraVuelto } from './CalculadoraVuelto'
import { CampoImporte } from './CampoImporte'

const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })

/** Si pasa este tiempo sin tipear letras, la búsqueda de producto vuelve a empezar. */
const MS_BUSQUEDA = 1_200

function Tecla({ children }: { children: string }) {
  return (
    <kbd className="hidden rounded-md border border-white/30 bg-white/15 px-1.5 py-0.5 font-mono text-xs font-semibold sm:inline">
      {children}
    </kbd>
  )
}

function aProductoCaja(producto: Producto): ProductoCaja {
  return {
    id: producto.id,
    nombre: producto.nombre,
    unidad: producto.unidad,
    precio: producto.precio,
  }
}

interface Guardado {
  ticketId: string
  total: number
  medio: MedioPago
  lineas: number
}

const VACIA: LineaEnCurso = { producto: null, cantidad: null, importeManual: null }

/**
 * Carga de un ticket por producto, pensada para el teclado:
 *  - letras = elegir producto ("mi" → Milanesa); si había otro cargado, pasa al ticket;
 *  - números = kilos (con coma) y el importe se calcula con el precio;
 *  - Tab = ir al importe para escribirlo a mano ("$ 5.000 de papa");
 *  - Enter = Efectivo, + = Mercado Pago (guarda el ticket entero), Esc = borrar, − = sacar efectivo.
 * Con el mouse o en el celular: tocar el producto, escribir y tocar Efectivo o Mercado Pago.
 */
export function CargaTicket({
  productos,
  onGuardado,
  onSacarEfectivo,
}: {
  productos: Producto[]
  onGuardado?: (ticketId: string) => void
  /** Tecla − : pasar a "Sacar efectivo". */
  onSacarEfectivo?: () => void
}) {
  const activos = useMemo(() => productos.filter((x) => x.activo).map(aProductoCaja), [productos])
  const [lineas, setLineas] = useState<LineaTicket[]>([])
  const [enCurso, setEnCurso] = useState<LineaEnCurso>(VACIA)
  const [textoCantidad, setTextoCantidad] = useState('')
  const [porConfirmar, setPorConfirmar] = useState<MedioPago | null>(null)
  const [ultimo, setUltimo] = useState<Guardado | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [vueltoDe, setVueltoDe] = useState<number | null>(null)
  const registrar = useRegistrarTicket()
  const anular = useAnularTicket()
  const { data: config } = useConfiguracion()
  const tope = config?.tope_confirmacion ?? 300_000
  const campoCantidad = useRef<HTMLInputElement>(null)
  const campoImporte = useRef<HTMLInputElement>(null)
  const busqueda = useRef({ texto: '', hasta: 0 })
  const temporizador = useRef<number | undefined>(undefined)

  const lineaActual = resolverLinea(enCurso)
  const ticket = lineaActual ? [...lineas, lineaActual] : lineas
  const total = totalTicket(ticket)
  const calculado =
    enCurso.producto?.precio && enCurso.cantidad !== null && enCurso.importeManual === null
      ? lineaActual?.importe
      : undefined

  const enfocar = (campo: 'cantidad' | 'importe' = 'cantidad') =>
    window.setTimeout(
      () => (campo === 'cantidad' ? campoCantidad : campoImporte).current?.focus(),
      0,
    )

  const limpiarAvisos = () => {
    setAviso(null)
    setPorConfirmar(null)
    if (registrar.isError) registrar.reset()
  }

  /** Pasa la línea en curso al ticket (si está completa) y elige otro producto. */
  const elegir = (producto: ProductoCaja) => {
    limpiarAvisos()
    setVueltoDe(null)
    if (lineaActual) setLineas((ls) => [...ls, lineaActual])
    setEnCurso({ producto, cantidad: null, importeManual: null })
    setTextoCantidad('')
    // Si se eligió tipeando, el cursor ya está en un campo: moverlo pisaría un Tab rápido.
    const activo = document.activeElement
    if (activo !== campoCantidad.current && activo !== campoImporte.current) enfocar()
  }

  const alTeclaLetra = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length !== 1 || !/\p{L}/u.test(e.key)) {
      busqueda.current.texto = ''
      return
    }
    e.preventDefault()
    const ahora = e.timeStamp
    const texto = (ahora < busqueda.current.hasta ? busqueda.current.texto : '') + e.key
    busqueda.current = { texto, hasta: ahora + MS_BUSQUEDA }
    const encontrado = buscarProducto(activos, texto)
    if (!encontrado) {
      setAviso(`No hay ningún producto que empiece con "${texto}".`)
      busqueda.current.texto = ''
      return
    }
    // Refinar ("m" → "mi") cambia el producto elegido sin pasar nada al ticket.
    if (texto.length > 1 && enCurso.producto) {
      if (encontrado.id !== enCurso.producto.id) {
        setEnCurso({ producto: encontrado, cantidad: null, importeManual: null })
        setTextoCantidad('')
      }
      return
    }
    elegir(encontrado)
  }

  const borrar = () => {
    limpiarAvisos()
    registrar.reset()
    if (enCurso.producto) {
      setEnCurso(VACIA)
      setTextoCantidad('')
    } else {
      setLineas([])
    }
    enfocar()
  }

  const guardar = (medio: MedioPago, confirmado = false) => {
    if (registrar.isPending) return
    const empezada = enCurso.cantidad !== null || enCurso.importeManual !== null
    if (enCurso.producto && empezada && !lineaActual) {
      const falta = faltaEnLinea(enCurso)
      setAviso(falta)
      enfocar(falta?.includes('importe') ? 'importe' : 'cantidad')
      return
    }
    if (ticket.length === 0) {
      setAviso(faltaEnLinea(enCurso) ?? 'Elegí un producto y escribí los kilos.')
      enfocar()
      return
    }
    if (!confirmado && necesitaConfirmacion(total, tope)) {
      setPorConfirmar(medio)
      return
    }
    setPorConfirmar(null)
    setAviso(null)
    registrar.mutate(
      { lineas: ticket, medio },
      {
        onSuccess: (ventas) => {
          navigator.vibrate?.(30)
          const ticketId = ventas[0]?.ticket_id ?? ''
          setLineas([])
          setEnCurso(VACIA)
          setTextoCantidad('')
          setUltimo({ ticketId, total, medio, lineas: ventas.length })
          setVueltoDe(medio === 'efectivo' ? total : null)
          onGuardado?.(ticketId)
          window.clearTimeout(temporizador.current)
          temporizador.current = window.setTimeout(() => setUltimo(null), 8_000)
        },
        onSettled: () => enfocar(),
      },
    )
  }

  const alAccion = (accion: Exclude<AccionTecla, null>) => {
    busqueda.current.texto = ''
    if (accion === 'salida') {
      if (!porConfirmar) onSacarEfectivo?.()
      return
    }
    if (accion === 'borrar') {
      // Esc con la confirmación abierta = "Corregir".
      if (porConfirmar) setPorConfirmar(null)
      else borrar()
      return
    }
    // Con la confirmación abierta, Enter confirma (sea cual sea el medio elegido antes).
    if (porConfirmar) {
      if (accion === 'efectivo') guardar(porConfirmar, true)
      return
    }
    guardar(accion)
  }

  const alTeclaCantidad = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const accion = accionDeTecla(e)
    if (accion) {
      e.preventDefault()
      alAccion(accion)
      return
    }
    alTeclaLetra(e)
  }

  const deshacer = () => {
    if (!ultimo) return
    anular.mutate(
      { ticketId: ultimo.ticketId, motivo: 'Deshecha al cargar' },
      {
        onSuccess: () => {
          setUltimo(null)
          setVueltoDe(null)
          enfocar()
        },
      },
    )
  }

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const unidad = enCurso.producto?.unidad ?? 'kg'

  return (
    <section
      aria-labelledby="titulo-carga"
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <h2 id="titulo-carga" className="flex items-center gap-2 text-base font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-acento-suave text-aviso">
            <ShoppingBasket className="size-4" aria-hidden="true" />
          </span>
          Nueva venta
        </h2>
        {activos.length === 0 ? (
          <Vacio titulo="No hay productos activos">
            Un administrador los carga en la sección Productos.
          </Vacio>
        ) : (
          <ul
            aria-label="Productos"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
          >
            {activos.map((producto) => {
              const elegido = enCurso.producto?.id === producto.id
              const enTicket = lineas.filter((l) => l.producto.id === producto.id).length
              return (
                <li key={producto.id}>
                  <button
                    type="button"
                    onClick={() => elegir(producto)}
                    aria-pressed={elegido}
                    className={`relative flex min-h-18 w-full presionable flex-col items-start justify-between gap-1 rounded-2xl border-2 px-3 py-2.5 text-left ${
                      elegido
                        ? 'animate-pop border-acento bg-acento-suave shadow-alta'
                        : 'border-borde bg-superficie shadow-tarjeta hover:border-borde-fuerte'
                    }`}
                  >
                    <span className="text-[15px] leading-tight font-bold">{producto.nombre}</span>
                    <span className="text-xs text-suave cifras">
                      {producto.precio
                        ? `${p(producto.precio)} / ${producto.unidad === 'kg' ? 'kg' : 'u.'}`
                        : 'Sin precio'}
                    </span>
                    {enTicket > 0 && (
                      <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-marca text-[11px] font-bold text-sobre-marca">
                        {enTicket}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p id="ayuda-teclas" className="text-sm text-suave">
          Escribí las primeras letras del producto (<strong className="text-texto">mi</strong> =
          Milanesa), los kilos y <strong className="text-texto">Enter</strong> si pagó en efectivo o{' '}
          <strong className="text-texto">+</strong> si fue Mercado Pago. Para sumar otro producto al
          mismo ticket, escribí su nombre. <strong className="text-texto">Tab</strong> va al
          importe, <strong className="text-texto">Esc</strong> borra y{' '}
          <strong className="text-texto">−</strong> saca efectivo.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-hundida p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold tracking-wide text-suave uppercase">Ticket</h3>
          {(lineas.length > 0 || enCurso.producto) && (
            <button
              type="button"
              onClick={borrar}
              className="text-xs font-semibold text-suave hover:text-texto"
            >
              {enCurso.producto ? 'Borrar producto · Esc' : 'Vaciar · Esc'}
            </button>
          )}
        </div>

        {lineas.length > 0 && (
          <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
            {lineas.map((l, i) => (
              <li
                key={`${l.producto.id}-${i}`}
                className="flex animate-entrar items-center gap-2 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{l.producto.nombre}</span>
                  <span className="block text-xs text-suave cifras">
                    {l.cantidad !== null ? formatearCantidad(l.cantidad, l.producto.unidad) : '—'}
                  </span>
                </span>
                <span className="text-sm font-bold cifras">{p(l.importe)}</span>
                <button
                  type="button"
                  aria-label={`Sacar ${l.producto.nombre} del ticket`}
                  onClick={() => {
                    setLineas((ls) => ls.filter((_, j) => j !== i))
                    enfocar()
                  }}
                  className="grid size-8 place-items-center rounded-lg text-suave hover:bg-hundida hover:text-texto"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold" aria-live="polite">
            {enCurso.producto ? (
              <>
                <span className="text-suave">Cargando:</span> {enCurso.producto.nombre}
              </>
            ) : (
              <span className="text-suave">Elegí un producto</span>
            )}
          </p>
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] gap-2">
            <label className="block rounded-2xl border border-borde-fuerte bg-superficie px-4 pt-2 pb-2.5 shadow-tarjeta transition-colors focus-within:border-foco focus-within:ring-4 focus-within:ring-foco/15">
              <span className="text-xs font-semibold tracking-wide text-suave uppercase">
                {unidad === 'kg' ? 'Kilos' : 'Unidades'}
              </span>
              <input
                ref={campoCantidad}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                aria-describedby="ayuda-teclas"
                // eslint-disable-next-line jsx-a11y/no-autofocus -- en la caja el cursor tiene que estar siempre listo
                autoFocus
                readOnly={registrar.isPending}
                placeholder={
                  enCurso.importeManual && lineaActual?.cantidad
                    ? normalizarCantidad(String(lineaActual.cantidad)).texto
                    : '0'
                }
                value={textoCantidad}
                onChange={(e) => {
                  const { texto, valor } = normalizarCantidad(e.target.value)
                  setTextoCantidad(texto)
                  setEnCurso((l) => ({ ...l, cantidad: valor }))
                  limpiarAvisos()
                  if (valor !== null) setVueltoDe(null)
                }}
                onKeyDown={alTeclaCantidad}
                className="mt-1 w-full min-w-0 bg-transparent text-3xl font-bold tracking-tight cifras outline-none placeholder:text-borde-fuerte read-only:opacity-60"
              />
            </label>
            <CampoImporte
              ref={campoImporte}
              compacto
              etiqueta="Importe"
              importe={enCurso.importeManual ?? 0}
              sugerido={calculado}
              deshabilitado={registrar.isPending}
              describedBy="ayuda-teclas"
              onCambio={(n) => {
                setEnCurso((l) => ({ ...l, importeManual: n > 0 ? n : null }))
                limpiarAvisos()
                if (n > 0) setVueltoDe(null)
              }}
              onAccion={alAccion}
              onOtraTecla={alTeclaLetra}
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 border-t border-borde-fuerte pt-3">
          <span className="text-sm font-semibold text-suave">Total</span>
          <span className="text-3xl font-extrabold tracking-tight cifras">{p(total)}</span>
        </div>

        {porConfirmar ? (
          <div
            role="alertdialog"
            aria-labelledby="titulo-confirmar"
            className="flex flex-col gap-3 rounded-xl border border-aviso/40 bg-aviso-suave p-4"
          >
            <p id="titulo-confirmar" className="font-semibold text-texto">
              ¿{p(total)} con {NOMBRE_MEDIO[porConfirmar]}? Es un importe alto: revisá los kilos y
              los ceros.
            </p>
            <div className="flex flex-wrap gap-2">
              <Boton onClick={() => guardar(porConfirmar, true)}>Sí, guardar · Enter</Boton>
              <Boton
                variante="secundario"
                onClick={() => {
                  setPorConfirmar(null)
                  enfocar()
                }}
              >
                Corregir · Esc
              </Boton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => guardar('efectivo')}
              disabled={registrar.isPending}
              aria-label="Guardar ticket en efectivo"
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-efectivo px-3 text-sobre-medio shadow-tarjeta transition hover:-translate-y-0.5 hover:shadow-alta hover:brightness-110 active:translate-y-0 active:scale-[0.97] disabled:opacity-50"
            >
              <span className="flex items-center gap-2 text-[15px] font-bold whitespace-nowrap">
                <Banknote className="size-5" aria-hidden="true" /> Efectivo
              </span>
              <Tecla>Enter</Tecla>
            </button>
            <button
              type="button"
              onClick={() => guardar('mercadopago')}
              disabled={registrar.isPending}
              aria-label="Guardar ticket con Mercado Pago"
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-mp px-3 text-sobre-medio shadow-tarjeta transition hover:-translate-y-0.5 hover:shadow-alta hover:brightness-110 active:translate-y-0 active:scale-[0.97] disabled:opacity-50"
            >
              <span className="flex items-center gap-2 text-[15px] font-bold whitespace-nowrap">
                <Smartphone className="size-5" aria-hidden="true" /> Mercado Pago
              </span>
              <Tecla>+</Tecla>
            </button>
          </div>
        )}

        {vueltoDe !== null && !porConfirmar && (
          <CalculadoraVuelto importe={vueltoDe} alCerrar={() => setVueltoDe(null)} />
        )}
        {aviso && <Aviso tono="aviso">{aviso}</Aviso>}
        {registrar.isError && (
          <Aviso tono="error">
            {mensajeDeError(registrar.error)} El ticket sigue cargado: apretá Enter o + para
            reintentar.
          </Aviso>
        )}
        {anular.isError && <Aviso tono="error">{mensajeDeError(anular.error)}</Aviso>}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end"
      >
        {registrar.isPending ? (
          <div className="pointer-events-auto animate-aparecer rounded-xl border border-borde bg-superficie px-4 py-3 text-sm shadow-alta">
            Guardando…
          </div>
        ) : ultimo ? (
          <div className="pointer-events-auto flex animate-aparecer items-center gap-4 rounded-xl border border-borde bg-superficie px-4 py-3 shadow-alta">
            <span className="text-sm">
              <span className="inline-flex items-center gap-1 font-semibold text-ok">
                <CheckCircle2 className="size-4 animate-pop" aria-hidden="true" /> Venta guardada
              </span>{' '}
              · {NOMBRE_MEDIO[ultimo.medio]}{' '}
              <span className="font-semibold cifras">{p(ultimo.total)}</span>
              {ultimo.lineas > 1 && (
                <span className="text-suave"> ({ultimo.lineas} productos)</span>
              )}
            </span>
            <button
              type="button"
              onClick={deshacer}
              disabled={anular.isPending}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-alerta-texto hover:bg-alerta-suave"
            >
              <Undo2 className="size-4" aria-hidden="true" /> Deshacer
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
